"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
const sqlite_1 = require("../../database/sqlite");
const crypto_1 = require("crypto");
function createOrder(req, res) {
    const { clientId, items, total, paid, pickupDate, userId } = req.body;
    const ticketId = (0, crypto_1.randomUUID)();
    const insertOrder = sqlite_1.db.prepare(`
    INSERT INTO orders
    (ticket_id, client_id, total, paid, pickup_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const insertItem = sqlite_1.db.prepare(`
    INSERT INTO order_items
    (id, order_id, article_id, service, quantity, width, height, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const transaction = sqlite_1.db.transaction(() => {
        insertOrder.run(ticketId, clientId || null, total, paid, pickupDate || null, userId);
        for (const item of items) {
            insertItem.run((0, crypto_1.randomUUID)(), ticketId, item.articleId, item.service, item.quantity, item.width || null, item.height || null, item.unitPrice, item.totalPrice);
        }
    });
    transaction();
    res.json({ ticketId });
}
