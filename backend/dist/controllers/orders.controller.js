"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTicketPdfToClient = exports.notifySuppliersOnPrint = exports.updateOrderPaid = exports.removeItem = exports.updateItemPrice = exports.getOrders = exports.updateItemStatus = exports.createOrder = void 0;
const crypto_1 = require("crypto");
const sqlite_1 = require("../database/sqlite");
// Generate date-based ticket barcode: YYYYMMDD + incrementing counter (01, 02, ...)
function generateTicketBarcode() {
    const now = new Date();
    const datePrefix = (now.getMonth() + 1).toString().padStart(2, "0") +
        now.getDate().toString().padStart(2, "0");
    // Find the highest counter for today's date
    const row = sqlite_1.db
        .prepare(`SELECT ticket_id FROM orders WHERE ticket_id LIKE ? ORDER BY ticket_id DESC LIMIT 1`)
        .get(`${datePrefix}%`);
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
function generateItemBarcode(ticketId, index) {
    return ticketId + (index + 1).toString().padStart(2, "0");
}
const createOrder = (req, res) => {
    const { clientId, customerPhone: bodyCustomerPhone, items, total, paid, pickupDate, userId, isDelivery, deliveryAddress, note, paymentMode } = req.body;
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
    let customerPhone = bodyCustomerPhone && String(bodyCustomerPhone).trim() ? String(bodyCustomerPhone).trim() : null;
    if (!customerPhone && clientId) {
        const client = sqlite_1.db.prepare("SELECT phone FROM clients WHERE id = ?").get(clientId);
        if (client?.phone && String(client.phone).trim())
            customerPhone = String(client.phone).trim();
    }
    const insertOrder = sqlite_1.db.prepare(`
    INSERT INTO orders
      (ticket_id, client_id, total, paid, pickup_date, created_by, is_delivery, delivery_address, note, payment_mode, customer_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const insertItem = sqlite_1.db.prepare(`
    INSERT INTO order_items
      (id, order_id, article_id, service, quantity, width, height, unit_price, total_price, supplier_id, supplier_price, is_supplier_item)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const transaction = sqlite_1.db.transaction(() => {
        insertOrder.run(ticketId, clientId ?? null, total, paid, pickupDate ?? null, userId, isDelivery ? 1 : 0, deliveryAddress ?? null, note ?? null, paymentMode || 'place', customerPhone);
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            insertItem.run(generateItemBarcode(ticketId, i), ticketId, item.articleId, item.service, item.quantity, item.width ?? null, item.height ?? null, item.unitPrice, item.totalPrice, item.supplierId ?? null, item.supplierPrice ?? null, item.supplierId ? 1 : 0);
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
            sqlite_1.db.prepare(`
        INSERT INTO notifications (id, user_id, type, title, body)
        VALUES (lower(hex(randomblob(16))), ?, 'supplier_reminder', 'Fournisseurs', ?)
      `).run(userId || null, `Commande fournisseur créée (Ticket #${ticketId}).`);
        }
        catch (e) {
            console.error('[Order] Failed to insert supplier notification', e);
        }
    }
    res.status(201).json({ ticketId, itemIds });
};
exports.createOrder = createOrder;
const updateItemStatus = async (req, res) => {
    const { id } = req.params;
    const { status, placement, assignedTo, processedBy, userId, userName, reimbursementAmount } = req.body;
    try {
        const current = sqlite_1.db.prepare("SELECT status, supplier_id, supplier_price FROM order_items WHERE id = ?").get(id);
        const changes = { status };
        if (placement !== undefined)
            changes.placement = placement;
        if (assignedTo !== undefined)
            changes.assigned_to = assignedTo;
        if (processedBy !== undefined)
            changes.processed_by = processedBy;
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
        const update = sqlite_1.db.prepare(`UPDATE order_items SET ${setClause} WHERE id = ?`);
        const result = update.run(...values, id);
        if (result.changes === 0) {
            return res.status(404).json({ error: "Item not found" });
        }
        const itemRow = sqlite_1.db
            .prepare("SELECT order_id, article_id, total_price FROM order_items WHERE id = ?")
            .get(id);
        if (itemRow && (status === "no_service" || status === "lost")) {
            const orderRow = sqlite_1.db
                .prepare("SELECT paid FROM orders WHERE ticket_id = ?")
                .get(itemRow.order_id);
            const amount = reimbursementAmount != null && Number(reimbursementAmount) >= 0
                ? Number(reimbursementAmount)
                : itemRow.total_price;
            if (orderRow && (orderRow.paid > 0 || amount > 0) && amount > 0) {
                const today = new Date().toISOString().split("T")[0];
                const note = status === "no_service"
                    ? `Remboursement Fonds de Caisse - Pas de service (article ${id})`
                    : `Remboursement Fonds de Caisse - Article perdu (${id})`;
                sqlite_1.db.prepare(`INSERT INTO transactions (id, user_id, user_name, amount, type, date, note) VALUES (?, ?, ?, ?, 'expense', ?, ?)`).run((0, crypto_1.randomUUID)(), userId || "u1", userName || "Système", amount, today, note);
            }
        }
        if (current?.status === "fournisseur" && status !== "fournisseur" && current?.supplier_id && (current?.supplier_price ?? 0) > 0) {
            const today = new Date().toISOString().split("T")[0];
            const supplier = sqlite_1.db.prepare("SELECT name FROM suppliers WHERE id = ?").get(current.supplier_id);
            const note = `Paiement fournisseur - ${supplier?.name ?? current.supplier_id} (article ${id})`;
            sqlite_1.db.prepare(`INSERT INTO transactions (id, user_id, user_name, amount, type, date, note) VALUES (?, ?, ?, ?, 'expense', ?, ?)`).run((0, crypto_1.randomUUID)(), userId || "u1", userName || "Système", current.supplier_price, today, note);
        }
        // When status becomes "prêt", notify client by WhatsApp immediately, including ticket price,
        // and create a persistent notification in the app.
        if (status === "prêt" && itemRow) {
            const orderRow = sqlite_1.db.prepare("SELECT ticket_id, total, paid, customer_phone, client_id, created_by FROM orders WHERE ticket_id = ?").get(itemRow.order_id);
            if (orderRow) {
                let clientPhone = orderRow.customer_phone && String(orderRow.customer_phone).trim()
                    ? orderRow.customer_phone.trim()
                    : null;
                let clientName = null;
                if (orderRow.client_id) {
                    const client = sqlite_1.db
                        .prepare("SELECT phone, name FROM clients WHERE id = ?")
                        .get(orderRow.client_id);
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
                    const msg = rest > 0
                        ? `Bonjour ${clientName || "Cher client"}, votre article (Ticket #${orderRow.ticket_id}) est prêt.\nPrix du ticket : ${total.toFixed(2)} DH.\nReste à payer : ${rest.toFixed(2)} DH.\nMerci de passer le récupérer !`
                        : `Bonjour ${clientName || "Cher client"}, votre article (Ticket #${orderRow.ticket_id}) est prêt.\nPrix du ticket : ${total.toFixed(2)} DH.\nMerci de passer le récupérer !`;
                    const { sendWhatsAppMessage } = require("../services/whatsapp.service");
                    const sent = await sendWhatsAppMessage(clientPhone, msg);
                    if (sent) {
                        sqlite_1.db.prepare("UPDATE order_items SET client_notified_at = datetime('now') WHERE id = ?").run(id);
                        console.log("[Order] Client prêt WhatsApp sent to", clientPhone, "for ticket #", orderRow.ticket_id);
                    }
                    else {
                        console.warn("[Order] WhatsApp send failed for ticket #", orderRow.ticket_id);
                    }
                }
                else {
                    console.warn("[Order] Cannot notify client (prêt): no phone for order", orderRow.ticket_id);
                }
                // Persist a notification for the user who created the order (or global if unknown)
                try {
                    const body = `Ticket #${orderRow.ticket_id}`;
                    sqlite_1.db.prepare(`
            INSERT INTO notifications (id, user_id, type, title, body)
            VALUES (lower(hex(randomblob(16))), ?, 'client_reminder', 'Article prêt', ?)
          `).run(orderRow.created_by || userId || null, body);
                }
                catch (e) {
                    console.error("[Order] Failed to insert ready notification", e);
                }
            }
        }
        res.json({ id, status, placement, assignedTo, processedBy });
    }
    catch (error) {
        console.error("Error updating item status:", error);
        res
            .status(500)
            .json({
            error: "Internal Server Error",
            details: error.message,
        });
    }
};
exports.updateItemStatus = updateItemStatus;
const getOrders = (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    const orders = sqlite_1.db
        .prepare(`SELECT * FROM orders ORDER BY created_at DESC`)
        .all();
    const list = [];
    for (const o of orders) {
        const items = sqlite_1.db
            .prepare(`SELECT * FROM order_items WHERE order_id = ?`)
            .all(o.ticket_id);
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
exports.getOrders = getOrders;
// --- ADMIN: Edit item price ---
const updateItemPrice = (req, res) => {
    const { id } = req.params; // item id
    const { unitPrice, totalPrice } = req.body;
    try {
        sqlite_1.db.prepare(`UPDATE order_items SET unit_price = ?, total_price = ? WHERE id = ?`).run(unitPrice, totalPrice, id);
        // Recalculate order total
        const item = sqlite_1.db
            .prepare("SELECT order_id FROM order_items WHERE id = ?")
            .get(id);
        if (item) {
            const sum = sqlite_1.db
                .prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM order_items WHERE order_id = ?")
                .get(item.order_id);
            sqlite_1.db.prepare("UPDATE orders SET total = ? WHERE ticket_id = ?").run(sum.total, item.order_id);
        }
        res.json({ ok: true });
    }
    catch (error) {
        res
            .status(500)
            .json({
            error: "Failed to update item price",
            details: error.message,
        });
    }
};
exports.updateItemPrice = updateItemPrice;
// --- ADMIN: Remove item from order ---
const removeItem = (req, res) => {
    const { id } = req.params; // item id
    try {
        const item = sqlite_1.db
            .prepare("SELECT order_id FROM order_items WHERE id = ?")
            .get(id);
        if (!item)
            return res.status(404).json({ error: "Item not found" });
        sqlite_1.db.prepare("DELETE FROM order_items WHERE id = ?").run(id);
        // Recalculate order total
        const sum = sqlite_1.db
            .prepare("SELECT COALESCE(SUM(total_price), 0) as total FROM order_items WHERE order_id = ?")
            .get(item.order_id);
        sqlite_1.db.prepare("UPDATE orders SET total = ? WHERE ticket_id = ?").run(sum.total, item.order_id);
        // If no items left, delete the order
        const remaining = sqlite_1.db
            .prepare("SELECT COUNT(*) as c FROM order_items WHERE order_id = ?")
            .get(item.order_id);
        if (remaining.c === 0) {
            sqlite_1.db.prepare("DELETE FROM orders WHERE ticket_id = ?").run(item.order_id);
        }
        res.json({ ok: true, newTotal: sum.total });
    }
    catch (error) {
        res
            .status(500)
            .json({
            error: "Failed to remove item",
            details: error.message,
        });
    }
};
exports.removeItem = removeItem;
// --- ADMIN: Update order paid amount ---
const updateOrderPaid = (req, res) => {
    const { id } = req.params; // ticket_id
    const { paid } = req.body;
    try {
        sqlite_1.db.prepare("UPDATE orders SET paid = ? WHERE ticket_id = ?").run(paid, id);
        res.json({ ok: true });
    }
    catch (error) {
        res
            .status(500)
            .json({
            error: "Failed to update paid amount",
            details: error.message,
        });
    }
};
exports.updateOrderPaid = updateOrderPaid;
// --- Notify suppliers when ticket is printed (WhatsApp: article à récupérer) ---
const notifySuppliersOnPrint = async (req, res) => {
    const rawId = req.params.id;
    const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!ticketId) {
        return res.status(400).json({ error: "Ticket id is required" });
    }
    try {
        const { notifySuppliersTicketPrinted } = await Promise.resolve().then(() => __importStar(require("../services/whatsapp.service")));
        await notifySuppliersTicketPrinted(ticketId);
        res.json({ ok: true });
    }
    catch (error) {
        res
            .status(500)
            .json({
            error: "Failed to notify suppliers",
            details: error.message,
        });
    }
};
exports.notifySuppliersOnPrint = notifySuppliersOnPrint;
// --- Send ticket as PDF to client via WhatsApp when caissier prints ---
const sendTicketPdfToClient = async (req, res) => {
    const rawId = req.params.id;
    const ticketId = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!ticketId) {
        return res.status(400).json({ error: "Ticket id is required" });
    }
    try {
        const language = typeof req.body?.language === "string" ? req.body.language : "fr";
        const order = sqlite_1.db.prepare("SELECT * FROM orders WHERE ticket_id = ?").get(ticketId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        let clientPhone = order.customer_phone && String(order.customer_phone).trim() ? order.customer_phone.trim() : null;
        if (!clientPhone && order.client_id) {
            const client = sqlite_1.db.prepare("SELECT phone FROM clients WHERE id = ?").get(order.client_id);
            if (client?.phone && String(client.phone).trim())
                clientPhone = client.phone.trim();
        }
        if (!clientPhone) {
            return res.status(400).json({ error: "No client phone for this order" });
        }
        const items = sqlite_1.db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(ticketId);
        const ticketItems = [];
        let subtotal = 0;
        for (const i of items) {
            const article = sqlite_1.db
                .prepare("SELECT name, name_ar FROM articles WHERE id = ?")
                .get(i.article_id);
            const service = sqlite_1.db
                .prepare("SELECT name, name_ar FROM services WHERE id = ?")
                .get(i.service);
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
        const { buildTicketPdf } = await Promise.resolve().then(() => __importStar(require("../services/ticket-pdf.service")));
        const { sendWhatsAppDocument } = await Promise.resolve().then(() => __importStar(require("../services/whatsapp.service")));
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
        const caption = language === "ar"
            ? `تذكرتك #${ticketId} - مصبنة برو`
            : `Votre ticket #${ticketId} - Savonnerie Pro`;
        const sent = await sendWhatsAppDocument(clientPhone, pdfBuffer, filename, caption);
        if (!sent) {
            return res.status(500).json({ error: "Failed to send PDF to client" });
        }
        res.json({ ok: true });
    }
    catch (error) {
        console.error("[Order] sendTicketPdfToClient error:", error);
        res.status(500).json({
            error: "Failed to send ticket PDF",
            details: error.message,
        });
    }
};
exports.sendTicketPdfToClient = sendTicketPdfToClient;
