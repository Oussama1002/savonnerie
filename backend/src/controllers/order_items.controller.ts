import { Request, Response } from 'express';
import { db } from '../database/sqlite';

export const updateSupplier = (req: Request, res: Response) => {
  const { id } = req.params;
  const { supplierId, supplierPrice } = req.body;
  
  db.prepare(`
    UPDATE order_items 
    SET supplier_id = ?, supplier_price = ?, is_supplier_item = ?
    WHERE id = ?
  `).run(
    supplierId ?? null,
    supplierPrice ?? null,
    supplierId ? 1 : 0,
    id
  );
  
  res.json({ ok: true });
};
