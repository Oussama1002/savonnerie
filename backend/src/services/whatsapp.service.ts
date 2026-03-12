import axios from 'axios';
import { db } from '../database/sqlite';

// UltraMsg: https://api.ultramsg.com/instance162747/messages/chat
// Set WHATSAPP_TOKEN in .env (get it from https://ultramsg.com)
const BASE_URL = process.env.WHATSAPP_API_URL || "https://api.ultramsg.com/instance162747/messages/chat";
const WHATSAPP_API_URL = BASE_URL.replace(/\/messages\/.*$/, "/messages/chat");
const WHATSAPP_DOCUMENT_URL = BASE_URL.replace(/\/messages\/.*$/, "/messages/document");
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || "kcu5j2m5xvy8ou8r";
const WHATSAPP_ENABLED = WHATSAPP_TOKEN.length > 0;

function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "212" + digits.slice(1);
  return digits.startsWith("212") ? `+${digits}` : digits.length <= 10 ? `+212${digits}` : `+${digits}`;
}

export const sendWhatsAppMessage = async (phone: string, text: string) => {
  if (!phone) {
    console.warn(`[WhatsApp] Cannot send message, no phone number provided. Text: ${text}`);
    return false;
  }

  const toNumber = formatPhone(phone);

  console.log(`[WhatsApp] Sending to ${toNumber}: ${text.substring(0, 50)}...`);

  if (!WHATSAPP_ENABLED) {
    console.warn("[WhatsApp] Set WHATSAPP_TOKEN in .env (from ultramsg.com) to send messages.");
    return true;
  }

  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        token: WHATSAPP_TOKEN,
        to: toNumber,
        body: text,
      },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );
    console.log("[WhatsApp] Sent to", toNumber, response.data);
    return true;
  } catch (error: any) {
    console.error("[WhatsApp] Failed to send to", toNumber, error?.response?.data ?? error.message);
    return false;
  }
};

export const notifySuppliers = async (ticketId: string, supplierItems: any[]) => {
  try {
    // Group items by supplierId
    const grouped: Record<string, any[]> = {};
    for (const item of supplierItems) {
      if (!grouped[item.supplierId]) grouped[item.supplierId] = [];
      grouped[item.supplierId].push(item);
    }

    for (const supplierId of Object.keys(grouped)) {
      const supplier = db.prepare('SELECT name, contact FROM suppliers WHERE id = ?').get(supplierId) as any;
      if (!supplier || !supplier.contact) {
        console.warn(`[WhatsApp] Supplier ${supplierId} not found or missing contact.`);
        continue;
      }

      const items = grouped[supplierId];
      let message = `Bonjour ${supplier.name}, vous avez une nouvelle commande à récupérer (Ticket #${ticketId}).\n\nArticles:\n`;
      
      for (const item of items) {
        // Find article name
        const article = db.prepare('SELECT name FROM articles WHERE id = ?').get(item.articleId) as any;
        const articleName = article ? article.name : item.articleId;
        message += `- ${item.quantity}x ${articleName}\n`;
      }
      message += `\nMerci de vous présenter pour la récupération.`;

      await sendWhatsAppMessage(supplier.contact, message);

      // In-app notification for admins: supplier reminder
      try {
        db.prepare(
          `INSERT INTO notifications (id, user_id, type, title, body)
           VALUES (lower(hex(randomblob(16))), NULL, 'supplier_reminder', 'Rappel Fournisseur', 'Commande fournisseur envoyée à ${supplier.name} (Ticket #${ticketId}).')`,
        ).run();
      } catch (e) {
        console.error('[WhatsApp] Failed to insert supplier reminder notification', e);
      }
    }
  } catch (error) {
    console.error('[WhatsApp] Failed to notify suppliers:', error);
  }
};

/** Notify suppliers when ticket is printed: short message to come and pick up. */
export const notifySuppliersTicketPrinted = async (ticketId: string) => {
  try {
    const rows = db.prepare(
      `SELECT id, supplier_id, article_id, quantity FROM order_items WHERE order_id = ? AND supplier_id IS NOT NULL`
    ).all(ticketId) as { id: string; supplier_id: string; article_id: string; quantity: number }[];

    const grouped: Record<string, { articleId: string; quantity: number }[]> = {};
    for (const row of rows) {
      if (!grouped[row.supplier_id]) grouped[row.supplier_id] = [];
      grouped[row.supplier_id].push({ articleId: row.article_id, quantity: row.quantity });
    }

    for (const supplierId of Object.keys(grouped)) {
      const supplier = db.prepare('SELECT name, contact FROM suppliers WHERE id = ?').get(supplierId) as { name: string; contact: string } | undefined;
      if (!supplier || !supplier.contact) {
        console.warn(`[WhatsApp] Supplier ${supplierId} not found or missing contact.`);
        continue;
      }
      const message = `Bonjour ${supplier.name}, il y a un article à récupérer (Ticket #${ticketId}). Merci de passer.`;
      await sendWhatsAppMessage(supplier.contact, message);
    }
  } catch (error) {
    console.error('[WhatsApp] Failed to notify suppliers (ticket printed):', error);
  }
};

/** Send a PDF/document to a phone number via WhatsApp (UltraMsg document API). */
export const sendWhatsAppDocument = async (
  phone: string,
  pdfBuffer: Buffer,
  filename: string,
  caption: string
): Promise<boolean> => {
  if (!phone) {
    console.warn("[WhatsApp] Cannot send document: no phone");
    return false;
  }
  const toNumber = formatPhone(phone);
  if (!WHATSAPP_ENABLED) {
    console.warn("[WhatsApp] API not configured, document not sent.");
    return true;
  }
  try {
    const base64 = pdfBuffer.toString("base64");
    const response = await axios.post(
      WHATSAPP_DOCUMENT_URL,
      {
        token: WHATSAPP_TOKEN,
        to: toNumber,
        filename: filename.endsWith(".pdf") ? filename : `${filename}.pdf`,
        document: base64,
        caption: caption || "Votre ticket",
      },
      { timeout: 20000, headers: { "Content-Type": "application/json" } }
    );
    console.log("[WhatsApp] Document sent to", toNumber, response.data);
    return true;
  } catch (error: any) {
    console.error("[WhatsApp] Failed to send document to", toNumber, error?.response?.data ?? error.message);
    return false;
  }
};
