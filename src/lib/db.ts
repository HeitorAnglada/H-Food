import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.join(process.cwd(), 'database.sqlite');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Initialize tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      price REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Insert default settings if they don't exist
  await dbInstance.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('pix_key', 'lasse@ufpa.br')"
  );
  await dbInstance.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('admin_pin', '4632')"
  );
  await dbInstance.run(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('vitrine_image_url', '')"
  );

  // Update existing database PIN if it is still set to the old default '1234'
  await dbInstance.run(
    "UPDATE settings SET value = '4632' WHERE key = 'admin_pin' AND value = '1234'"
  );

  return dbInstance;
}
