import { db } from '../database/sqlite';

try {
  db.prepare(`ALTER TABLE clients ADD COLUMN notifications_enabled INTEGER DEFAULT 1`).run();
  console.log('Added notifications_enabled column to clients table');
} catch (e: any) {
  if (e.message?.includes('duplicate column')) {
    console.log('notifications_enabled column already exists');
  } else {
    throw e;
  }
}
