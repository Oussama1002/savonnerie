import cron from 'node-cron';
import { db } from '../database/sqlite';
import { sendWhatsAppMessage } from './whatsapp.service';

export const startCronJobs = () => {
  console.log('[Cron] Starting scheduled background jobs...');

  // Daily report to all admin users (by phone) at end of day (23:59)
  cron.schedule('59 23 * * *', async () => {
    try {
      const admins = db.prepare(
        "SELECT id, name, phone FROM users WHERE role = 'admin' AND phone IS NOT NULL AND trim(phone) != ''"
      ).all() as { id: string; name: string; phone: string }[];
      if (admins.length === 0) {
        console.log('[Cron] Daily report skipped: no admin user with phone number');
        return;
      }
      const today = new Date().toISOString().split('T')[0];
      const orders = db.prepare(
        "SELECT ticket_id, total, paid, created_at FROM orders WHERE date(created_at) = ?"
      ).all(today) as { ticket_id: string; total: number; paid: number; created_at: string }[];
      const revenue = orders.reduce((s, o) => s + o.paid, 0);
      const expected = orders.reduce((s, o) => s + o.total, 0);
      const withdrawals = (db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE date = ? AND type = 'withdrawal'"
      ).get(today) as { total: number }).total;
      const msg = [
        `📊 Rapport quotidien – ${today}`,
        `• Recettes: ${revenue.toFixed(2)} DH`,
        `• Prévisions: ${expected.toFixed(2)} DH`,
        `• Commandes: ${orders.length}`,
        `• Retraits: ${withdrawals.toFixed(2)} DH`,
      ].join('\n');
      for (const admin of admins) {
        await sendWhatsAppMessage(admin.phone, msg);
        // In-app notifications for admin: salaries & withdrawals reminder
        try {
          db.prepare(
            `INSERT INTO notifications (id, user_id, type, title, body)
             VALUES (lower(hex(randomblob(16))), ?, 'salary_reminder', 'Salaires', 'Pensez à vérifier et payer les salaires du mois.')`,
          ).run(admin.id);
          db.prepare(
            `INSERT INTO notifications (id, user_id, type, title, body)
             VALUES (lower(hex(randomblob(16))), ?, 'withdrawal_reminder', 'Retraits', 'Retraits du jour: ${withdrawals.toFixed(
               2,
             )} DH.')`,
          ).run(admin.id);
        } catch (e) {
          console.error('[Cron] Failed to insert admin notifications', e);
        }
        console.log(`[Cron] Daily report sent to admin ${admin.name}`);
      }
    } catch (e) {
      console.error('[Cron] Daily report error:', e);
    }
  });

  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running hourly checks: caissier (12h stuck), client (prêt every 24h)...');

    try {
      // 1. Notify CLIENT when article is "prêt": first time after 24h, then every 24h until pickup
      const readyForPickUpItems = db.prepare(`
        SELECT oi.id, oi.order_id, oi.status_updated_at, oi.client_notified_at,
               o.ticket_id, o.customer_phone as order_phone, c.phone as client_phone_db, c.name as client_name
        FROM order_items oi
        JOIN orders o ON o.ticket_id = oi.order_id
        LEFT JOIN clients c ON c.id = o.client_id
        WHERE oi.status = 'prêt'
          AND (
            (oi.client_notified_at IS NULL AND oi.status_updated_at <= datetime('now', '-24 hours'))
            OR (oi.client_notified_at <= datetime('now', '-24 hours'))
          )
      `).all() as any[];

      if (readyForPickUpItems.length > 0) {
        console.log(`[Cron] Found ${readyForPickUpItems.length} item(s) prêt for client reminder`);
      }

      for (const item of readyForPickUpItems) {
        const orderPhone = item.order_phone && String(item.order_phone).trim();
        const clientPhone = orderPhone || (item.client_phone_db && String(item.client_phone_db).trim()) || null;
        if (!clientPhone) {
          console.warn(`[Cron] Skip client notification ticket #${item.ticket_id}: no phone (order_phone=${!!orderPhone}, client_phone=${!!item.client_phone_db})`);
          continue;
        }

        const isFirst = !item.client_notified_at;
        const message = isFirst
          ? `Bonjour ${item.client_name || 'Cher client'}, votre article (Ticket #${item.ticket_id}) est prêt. Merci de passer le récupérer !`
          : `Rappel: Bonjour ${item.client_name || 'Cher client'}, votre article (Ticket #${item.ticket_id}) est toujours prêt. Merci de passer le récupérer !`;
        const success = await sendWhatsAppMessage(clientPhone, message);

        if (success) {
          db.prepare("UPDATE order_items SET client_notified_at = datetime('now') WHERE id = ?").run(item.id);
          // In-app notification for all admins: client reminder sent
          try {
            db.prepare(
              `INSERT INTO notifications (id, user_id, type, title, body)
               VALUES (lower(hex(randomblob(16))), NULL, 'client_reminder', 'Rappel client', 'Ticket #${item.ticket_id} prêt pour ${item.client_name || 'client'}')`,
            ).run();
          } catch (e) {
            console.error('[Cron] Failed to insert client reminder notification', e);
          }
          console.log(`[Cron] Client prêt notification sent for ticket #${item.ticket_id}`);
        }
      }

      // 2. Notify CAISSIER (who created the order) when an article stayed in same status for 12h; repeat every 12h
      const stuckItems = db.prepare(`
        SELECT oi.id, oi.order_id, oi.status, oi.article_id, oi.status_updated_at, oi.caissier_stuck_notified_at,
               o.ticket_id, o.created_by,
               u.name as caissier_name, u.phone as caissier_phone
        FROM order_items oi
        JOIN orders o ON o.ticket_id = oi.order_id
        LEFT JOIN users u ON u.id = o.created_by
        WHERE oi.status NOT IN ('reçu', 'prêt', 'livré', 'fournisseur', 'no_service', 'lost')
          AND oi.status_updated_at <= datetime('now', '-12 hours')
          AND (oi.caissier_stuck_notified_at IS NULL OR oi.caissier_stuck_notified_at <= datetime('now', '-12 hours'))
      `).all() as any[];

      const statusLabels: Record<string, string> = {
        lavage: 'Lavage',
        repassage: 'Repassage',
        lavage_repassage: 'Mix',
        retard: 'Retard',
      };

      for (const item of stuckItems) {
        if (!item.caissier_phone || !String(item.caissier_phone).trim()) continue;

        const articleRow = db.prepare('SELECT name FROM articles WHERE id = ?').get(item.article_id) as { name: string } | undefined;
        const articleName = articleRow?.name || item.article_id;
        const statusLabel = statusLabels[item.status] || item.status;

        const message = `Rappel: L'article "${articleName}" (Ticket #${item.ticket_id}) est resté en statut "${statusLabel}" depuis plus de 12h. Merci de faire le suivi.`;
        const success = await sendWhatsAppMessage(item.caissier_phone, message);

        if (success) {
          db.prepare("UPDATE order_items SET caissier_stuck_notified_at = datetime('now') WHERE id = ?").run(item.id);
          // In-app notification for caissier: article stuck reminder
          try {
            if (item.created_by) {
              db.prepare(
                `INSERT INTO notifications (id, user_id, type, title, body)
                 VALUES (lower(hex(randomblob(16))), ?, 'article_reminder', 'Article en attente', '\"${articleName}\" (Ticket #${item.ticket_id}) en statut \"${statusLabel}\" depuis > 12h.')`,
              ).run(item.created_by);
            }
          } catch (e) {
            console.error('[Cron] Failed to insert article reminder notification', e);
          }
          console.log(`[Cron] Caissier stuck notification sent to ${item.caissier_name} for ticket #${item.ticket_id}`);
        }
      }
    } catch (error) {
      console.error('[Cron] Error running scheduled jobs:', error);
    }
  });
};
