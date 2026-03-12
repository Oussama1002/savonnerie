import { Request, Response } from 'express';
import { db } from '../database/sqlite';
import { v4 as uuidv4 } from 'uuid';

export const getAll = (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM machines ORDER BY name').all() as any[];
  res.json(rows.map(r => ({
    id: r.id, 
    name: r.name, 
    name_ar: r.name_ar,
    type: r.type, 
    status: r.status || 'disponible',
    capacity: r.capacity, 
    timeRemaining: r.time_remaining, 
    program: r.program
  })));
};

export const create = (req: Request, res: Response) => {
  const { name, name_ar, type, capacity } = req.body;
  
  if (!name || !type) {
    res.status(400).json({ error: 'Name and type are required' });
    return;
  }

  try {
    const id = uuidv4();
    const insert = db.prepare(`
      INSERT INTO machines (id, name, name_ar, type, capacity, status)
      VALUES (?, ?, ?, ?, ?, 'disponible')
    `);
    
    insert.run(id, name, name_ar || '', type, capacity || '10kg');
    
    res.status(201).json({ id, name, name_ar, type, capacity, status: 'disponible' });
  } catch (error) {
    console.error('CREATE ERROR:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMachine = (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const del = db.prepare('DELETE FROM machines WHERE id = ?');
    del.run(id);
    res.status(204).send();
  } catch (error) {
    console.error('DELETE ERROR:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateStatus = (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, timeRemaining, program } = req.body;
  
  try {
    const update = db.prepare(`
      UPDATE machines 
      SET status = ?, time_remaining = ?, program = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    
    update.run(status, timeRemaining || 0, program || '', id);
    res.json({ id, status, timeRemaining, program });
  } catch (error) {
    console.error('UPDATE ERROR:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
