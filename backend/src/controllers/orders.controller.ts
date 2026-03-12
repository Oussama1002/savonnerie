import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { db } from "../database/sqlite";

type OrderItemInput = {
  articleId: string;
  service: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  width?: number;
  height?: number;
  supplierId?: string;
  supplierPrice?: number;
};

type CreateOrderBody = {
  clientId?: string | null;
  customerPhone?: string | null;
  userId: string;
  total: number;
  paid: number;
  pickupDate?: string | null;
  isDelivery?: boolean;
  deliveryAddress?: string;
  note?: string;
  paymentMode: 'place' | 'avance' | 'credit';
  items: OrderItemInput[];
};

// Generate date-based ticket barcode: YYYYMMDD + incrementing counter (01, 02, ...)
function generateTicketBarcode(): string {
  const now = new Date();
  const datePrefix =
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");

  // Find the highest counter for today's date
  const row = db
    .prepare(
      `SELECT ticket_id FROM orders WHERE ticket_id LIKE ? ORDER BY ticket_id DESC LIMIT 1`,
    )
    .get(`${datePrefix}%`) as { ticket_id: string } | undefined;

  let counter = 1;
  if (row) {
    const existingCounter = parseInt(row.ticket_id.slice(4), 10);
    if (!isNaN(existingCounter)) {
      counter = existingCounter + 1;
    }
  }

  return datePrefix + counter.toString().padStart(2, "0");
}

// Generate item barcode based on ticketId + sequential counter (01, 02, ...)
function generateItemBarcode(ticketId: string, index: number): string {
  return ticketId + (index + 1).toString().padStart(2, "0");
}

export const createOrder = (req: Request, res: Response) => {
  const { clientId, customerPhone: bodyCustomerPhone, items, total, paid, pickupDate, userId, isDelivery, deliveryAddress, note, paymentMode } =
    req.body as CreateOrderBody;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: "Order must contain at least one item" });
  }

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const ticketId = generateTicketBarcode();

  // Use body customerPhone, or backfill from client when clientId is set
  let customerPhone: string | null = bodyCustomerPhone && String(bodyCustomerPhone).trim() ? String(bodyCustomerPhone).trim() : null;
  if (!customerPhone && clientId) {
    const client = db.prepare("SELECT phone FROM clients WHERE id = ?").get(clientId) as { phone: string } | undefined;
    if (client?.phone && String(client.phone).trim()) customerPhone = String(client.phone).trim();
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders
      (ticket_id, client_id, total, paid, pickup_date, created_by, is_delivery, delivery_address, note, payment_mode, customer_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items
      (id, order_id, article_id, service, quantity, width, height, unit_price, total_price, supplier_id, supplier_price, is_supplier_item)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertOrder.run(
      ticketId,
      clientId ?? null,
      total,
      paid,
      pickupDate ?? null,
      userId,
      isDelivery ? 1 : 0,
      deliveryAddress ?? null,
      note ?? null,
      paymentMode || 'place',
      customerPhone
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      insertItem.run(
        generateItemBarcode(ticketId, i),
        ticketId,
        item.articleId,
        item.service,
        item.quantity,
        item.width ?? null,
        item.height ?? null,
        item.unitPrice,
        item.totalPrice,
        item.supplierId ?? null,
        item.supplierPrice ?? null,
        item.supplierId ? 1 : 0,
      );
    }
  });

  transaction();

  // Return ticketId and item barcodes
  const itemIds = items.map((_, i) => generateItemBarcode(ticketId, i));

  // Trigger supplier WhatsApp notifications
  const supplierItems = items.filter((it) => it.supplierId);
  if (supplierItems.length > 0) {
    const { notifySuppliers } = require('../services/whatsapp.service');
    notifySuppliers(ticketId, supplierItems);

    // Persist a notification for the user who created the order (or global if unknown)
    try {
      db.prepare(
        `
        INSERT INTO notifications (id, user_id, type, title, body)
        VALUES (lower(hex(randomblob(16))), ?, 'supplier_reminder', 'Fournisseurs', ?)
      `,
      ).run(
        userId || null,
        `Commande fournisseur créée (Ticket #${ticketId}).`,
      );
    } catch (e) {
      console.error('[Order] Failed to insert supplier notification', e);
    }
  }

  res.status(201).json({ ticketId, itemIds });
};

export const updateItemStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, placement, assignedTo, processedBy, userId, userName, reimbursementAmount } = req.body;

  try {
    const current = db.prepare("SELECT status, supplier_id, supplier_price FROM order_items WHERE id = ?").get(id) as { status: string; supplier_id: string | null; supplier_price: number | null } | undefined;
    const changes: any = { status };
    if (placement !== undefined) changes.placement = placement;
    if (assignedTo !== undefined) changes.assigned_to = assignedTo;
    if (processedBy !== undefined) changes.processed_by = processedBy;
    if (status === "fournisseur") {
      changes.sent_at = new Date().toISOString();
    }
    if (current?.status === "fournisseur" && status !== "fournisseur") {
      changes.received_at = new Date().toISOString();
    }

    const setClause = Object.keys(changes)
      .map((key) => `${key} = ?`)
      .join(", ") + ", status_updated_at = datetime('now'), caissier_stuck_notified_at = NULL";
    const values = Object.values(changes);

    const update = db.prepare(
      `UPDATE order_items SET ${setClause} WHERE id = ?`,
    );
    const result = update.run(...values, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const itemRow = db
      .prepare("SELECT order_id, article_id, total_price FROM order_items WHERE id = ?")
      .get(id) as { order_id: string; article_id: string; total_price: number } | undefined;

    if (itemRow && (status === "no_service" || status === "lost")) {
      const orderRow = db
        .prepare("SELECT paid FROM orders WHERE ticket_id = ?")
        .get(itemRow.order_id) as { paid: number } | undefined;
      const amount = reimbursementAmount != null && Number(reimbursementAmount) >= 0
        ? Number(reimbursementAmount)
        : itemRow.total_price;
      if (orderRow && (orderRow.paid > 0 || amount > 0) && amount > 0) {
        const today = new Date().toISOString().split("T")[0];
        const note =
          status === "no_service"
            ? `Remboursement Fonds de Caisse - Pas de service (article ${id})`
            : `Remboursement Fonds de Caisse - Article perdu (${id})`;
        db.prepare(
          `INSERT INTO transactions (id, user_id, user_name, amount, type, date, note) VALUES (?, ?, ?, ?, 'expense', ?, ?)`
        ).run(
          randomUUID(),
          userId || "u1",
          userName || "Système",
          amount,
          today,
          note
        );
      }
    }

    if (current?.status === "fournisseur" && status !== "fournisseur" && current?.supplier_id && (current?.supplier_price ?? 0) > 0) {
      const today = new Date().toISOString().split("T")[0];
      const supplier = db.prepare("SELECT name FROM suppliers WHERE id = ?").get(current.supplier_id) as { name: string } | undefined;
      const note = `Paiement fournisseur - ${supplier?.name ?? current.supplier_id} (article ${id})`;
      db.prepare(
        `INSERT INTO transactions (id, user_id, user_name, amount, type, date, note) VALUES (?, ?, ?, ?, 'expense', ?, ?)`
      ).run(
        randomUUID(),
        userId || "u1",
        userName || "Système",
        current.supplier_price!,
        today,
        note
      );
    }

    // When status becomes "prêt", notify client by WhatsApp immediately, including ticket price,
    // and create a persistent notification in the app.
    if (status === "prêt" && itemRow) {
      const orderRow = db.prepare(
        "SELECT ticket_id, total, paid, customer_phone, client_id, created_by FROM orders WHERE ticket_id = ?",
      ).get(itemRow.order_id) as {
        ticket_id: string;
        total: number;
        paid: number;
        customer_phone: string | null;
        client_id: string | null;
        created_by: string | null;
      } | undefined;
      if (orderRow) {
        let clientPhone: string | null =
          orderRow.customer_phone && String(orderRow.customer_phone).trim()
            ? orderRow.customer_phone.trim()
            : null;
        let clientName: string | null = null;
        if (orderRow.client_id) {
          const client = db
            .prepare("SELECT phone, name FROM clients WHERE id = ?")
            .get(orderRow.client_id) as { phone: string; name: string } | undefined;
          if (client) {
            clientName = client.name || null;
            if (!clientPhone && client.phone && String(client.phone).trim()) {
              clientPhone = client.phone.trim();
            }
          }
        }
        if (clientPhone) {
          const total = Number(orderRow.total ?? 0);
          const paid = Number(orderRow.paid ?? 0);
          const rest = Math.max(total - paid, 0);
          const msg =
            rest > 0
              ? `Bonjour ${clientName || "Cher client"}, votre article (Ticket #${
                  orderRow.ticket_id
                }) est prêt.\nPrix du ticket : ${total.toFixed(
                  2,
                )} DH.\nReste à payer : ${rest.toFixed(
                  2,
                )} DH.\nMerci de passer le récupérer !`
              : `Bonjour ${clientName || "Cher client"}, votre article (Ticket #${
                  orderRow.ticket_id
                }) est prêt.\nPrix du ticket : ${total.toFixed(
                  2,
                )} DH.\nMerci de passer le récupérer !`;
          const { sendWhatsAppMessage } = require("../services/whatsapp.service");
          const sent = await sendWhatsAppMessage(clientPhone, msg);
          if (sent) {
            db.prepare("UPDATE order_items SET client_notified_at = datetime('now') WHERE id = ?").run(
              id,
            );
            console.log(
              "[Order] Client prêt WhatsApp sent to",
              clientPhone,
              "for ticket #",
              orderRow.ticket_id,
            );
          } else {
            console.warn("[Order] WhatsApp send failed for ticket #", orderRow.ticket_id);
          }
        } else {
          console.warn("[Order] Cannot notify client (prêt): no phone for order", orderRow.ticket_id);
        }

        // Persist a notification for the user who created the order (or global if unknown)
        try {
          const body = `Ticket #${orderRow.ticket_id}`;
          db.prepare(
            `
            INSERT INTO notifications (id, user_id, type, title, body)
            VALUES (lower(hex(randomblob(16))), ?, 'client_reminder', 'Article prêt', ?)
          `,
          ).run(orderRow.created_by || userId || null, body);
        } catch (e) {
          console.error("[Order] Failed to insert ready notification", e);
        }
      }
    }

    res.json({ id, status, placement, assignedTo, processedBy });
  } catch (error) {
    console.error("Error updating item status:", error);
    res
      .status(500)
      .json({
        error: "Internal Server Error",
        details: (error as any).message,
      });
  }
};

export const getOrders = (req: Request, res: Response) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const orders = db
    .prepare(`SELECT * FROM orders ORDER BY created_at DESC`)
    .all() as any[];
  const list: any[] = [];
  for (const o of orders) {
    const items = db
      .prepare(`SELECT * FROM order_items WHERE order_id = ?`)
      .all(o.ticket_id) as any[];
    list.push({
      ticketId: o.ticket_id,
      id: o.ticket_id,
      clientId: o.client_id,
      total: o.total,
      paid: o.paid,
      pickupDate: o.pickup_date,
      status: o.status,
      paymentMode: o.payment_mode || "place",
      customerPhone: o.customer_phone,
      isDelivery: o.is_delivery === 1,
      deliveryAddress: o.delivery_address,
      note: o.note || '',
      createdBy: o.created_by,
      createdAt: o.created_at,
      items: items.map((i) => ({
        id: i.id,
        articleId: i.article_id,
        service: i.service,
        quantity: i.quantity,
        width: i.width,
        height: i.height,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
        status: i.status || "reçu",
        supplierId: i.supplier_id,
        supplierPrice: i.supplier_price,
        placement: i.placement,
        assignedTo: i.assigned_to,
        processedBy: i.processed_by,
        sentAt: i.sent_at,
        receivedAt: i.received_at,
        statusUpdatedAt: i.status_updated_at,
      })),
    });
  }
  res.json(list);
};

// --- ADMIN: Edit item price ---
export const updateItemPrice = (req: Request, res: Response) => {
  const { id } = req.params; // item id
  const { unitPrice, totalPrice } = req.body;

  try {
    db.prepare(
      `UPDATE order_items SET unit_price = ?, total_price = ? WHERE id = ?`,
    ).run(unitPrice, totalPrice, id);

    // Recalculate order total
    const item = db
      .prepare("SELECT order_id FROM order_items WHERE id = ?")
      .get(id) as any;
    if (item) {
      const sum = db
        .prepare(
          "SELECT COALESCE(SUM(total_price), 0) as total FROM order_items WHERE order_id = ?",
        )
        .get(item.order_id) as any;
      db.prepare("UPDATE orders SET total = ? WHERE ticket_id = ?").run(
        sum.total,
        item.order_id,
      );
    }

    res.json({ ok: true });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to update item price",
        details: (error as any).message,
      });
  }
};

// --- ADMIN: Remove item from order ---
export const removeItem = (req: Request, res: Response) => {
  const { id } = req.params; // item id

  try {
    const item = db
      .prepare("SELECT order_id FROM order_items WHERE id = ?")
      .get(id) as any;
    if (!item) return res.status(404).json({ error: "Item not found" });

    db.prepare("DELETE FROM order_items WHERE id = ?").run(id);

    // Recalculate order total
    const sum = db
      .prepare(
        "SELECT COALESCE(SUM(total_price), 0) as total FROM order_items WHERE order_id = ?",
      )
      .get(item.order_id) as any;
    db.prepare("UPDATE orders SET total = ? WHERE ticket_id = ?").run(
      sum.total,
      item.order_id,
    );

    // If no items left, delete the order
    const remaining = db
      .prepare("SELECT COUNT(*) as c FROM order_items WHERE order_id = ?")
      .get(item.order_id) as any;
    if (remaining.c === 0) {
      db.prepare("DELETE FROM orders WHERE ticket_id = ?").run(item.order_id);
    }

    res.json({ ok: true, newTotal: sum.total });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to remove item",
        details: (error as any).message,
      });
  }
};

// --- ADMIN: Update order paid amount ---
export const updateOrderPaid = (req: Request, res: Response) => {
  const { id } = req.params; // ticket_id
  const { paid } = req.body;

  try {
    db.prepare("UPDATE orders SET paid = ? WHERE ticket_id = ?").run(paid, id);
    res.json({ ok: true });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to update paid amount",
        details: (error as any).message,
      });
  }
};

// --- Notify suppliers when ticket is printed (WhatsApp: article à récupérer) ---
export const notifySuppliersOnPrint = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!ticketId) {
    return res.status(400).json({ error: "Ticket id is required" });
  }
  try {
    const { notifySuppliersTicketPrinted } = await import("../services/whatsapp.service");
    await notifySuppliersTicketPrinted(ticketId);
    res.json({ ok: true });
  } catch (error) {
    res
      .status(500)
      .json({
        error: "Failed to notify suppliers",
        details: (error as any).message,
      });
  }
};

// --- Send ticket as PDF to client via WhatsApp when caissier prints ---
export const sendTicketPdfToClient = async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!ticketId) {
    return res.status(400).json({ error: "Ticket id is required" });
  }
  try {
    const language = typeof (req.body as any)?.language === "string" ? (req.body as any).language : "fr";
    const order = db.prepare("SELECT * FROM orders WHERE ticket_id = ?").get(ticketId) as any;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    let clientPhone: string | null = order.customer_phone && String(order.customer_phone).trim() ? order.customer_phone.trim() : null;
    if (!clientPhone && order.client_id) {
      const client = db.prepare("SELECT phone FROM clients WHERE id = ?").get(order.client_id) as { phone: string } | undefined;
      if (client?.phone && String(client.phone).trim()) clientPhone = client.phone.trim();
    }
    if (!clientPhone) {
      return res.status(400).json({ error: "No client phone for this order" });
    }

    const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(ticketId) as any[];
    const ticketItems: {
      articleName: string;
      serviceName: string;
      quantity: number;
      width?: number;
      height?: number;
      unitPrice: number;
      totalPrice: number;
      barcode?: string;
      statusLabel?: string;
    }[] = [];
    let subtotal = 0;
    for (const i of items) {
      const article = db
        .prepare("SELECT name, name_ar FROM articles WHERE id = ?")
        .get(i.article_id) as { name: string; name_ar?: string } | undefined;
      const service = db
        .prepare("SELECT name, name_ar FROM services WHERE id = ?")
        .get(i.service) as { name: string; name_ar?: string } | undefined;

      // Use primary (French) names in PDF for maximum readability in all viewers
      const articleName = (article?.name && String(article.name).trim()) || i.article_id;
      const serviceName = (service?.name && String(service.name).trim()) || i.service;
      ticketItems.push({
        articleName,
        serviceName,
        quantity: i.quantity ?? 1,
        width: i.width,
        height: i.height,
        unitPrice: i.unit_price,
        totalPrice: i.total_price,
        // In DB, item id *is* the barcode (ticketId + index)
        barcode: i.id,
        statusLabel: (i.status || "reçu").toString().toUpperCase(),
      });
      subtotal += i.total_price;
    }
    const total = Number(order.total);
    const discount = subtotal > total ? subtotal - total : 0;
    const discountRate = discount > 0 && subtotal > 0 ? Math.round((discount / subtotal) * 100) : undefined;

    const { buildTicketPdf } = await import("../services/ticket-pdf.service");
    const { sendWhatsAppDocument } = await import("../services/whatsapp.service");

    const pdfBuffer = await buildTicketPdf({
      ticketId,
      total,
      subtotal,
      discount: discount > 0 ? discount : undefined,
      discountRate,
      paid: Number(order.paid),
      pickupDate: order.pickup_date || new Date().toISOString(),
      deliveryAddress: order.delivery_address,
      isDelivery: order.is_delivery === 1,
      note: order.note,
      items: ticketItems,
      language,
    });

    const filename = `ticket-${ticketId}.pdf`;
    const caption =
      language === "ar"
        ? `تذكرتك #${ticketId} - مصبنة برو`
        : `Votre ticket #${ticketId} - Savonnerie Pro`;
    const sent = await sendWhatsAppDocument(clientPhone, pdfBuffer, filename, caption);
    if (!sent) {
      return res.status(500).json({ error: "Failed to send PDF to client" });
    }
    res.json({ ok: true });
  } catch (error) {
    console.error("[Order] sendTicketPdfToClient error:", error);
    res.status(500).json({
      error: "Failed to send ticket PDF",
      details: (error as any).message,
    });
  }
};
