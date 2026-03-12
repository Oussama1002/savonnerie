import { db } from '../../database/sqlite';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

export function createOrder(req: Request, res: Response) {
  const {
    clientId,
    items,
    total,
    paid,
    pickupDate,
    userId
  } = req.body;

  const ticketId = randomUUID();

  const insertOrder = db.prepare(`
    INSERT INTO orders
    (ticket_id, client_id, total, paid, pickup_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items
    (id, order_id, article_id, service, quantity, width, height, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertOrder.run(
      ticketId,
      clientId || null,
      total,
      paid,
      pickupDate || null,
      userId
    );

    for (const item of items) {
      insertItem.run(
        randomUUID(),
        ticketId,
        item.articleId,
        item.service,
        item.quantity,
        item.width || null,
        item.height || null,
        item.unitPrice,
        item.totalPrice
      );
    }
  });

  transaction();

  res.json({ ticketId });
}
