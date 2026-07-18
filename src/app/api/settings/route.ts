import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Helper to verify admin PIN
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const pin = request.headers.get('x-admin-pin');
  if (!pin) return false;
  
  const db = await getDb();
  const setting = await db.get("SELECT value FROM settings WHERE key = 'admin_pin'");
  return setting && setting.value === pin;
}

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.all('SELECT key, value FROM settings WHERE key IN ("pix_key", "vitrine_image_url")');
    const settings: Record<string, string> = {};
    rows.forEach(row => {
      settings[row.key] = row.value || '';
    });
    return NextResponse.json({ settings });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Código PIN inválido' }, { status: 401 });
    }

    const updates = await request.json();
    const db = await getDb();

    // Start transaction
    await db.run('BEGIN TRANSACTION');
    try {
      for (const [key, value] of Object.entries(updates)) {
        if (typeof value !== 'string') {
          throw new Error(`Valor inválido para a chave: ${key}`);
        }
        if (key === 'admin_pin' && value.trim().length < 4) {
          throw new Error('O PIN deve ter pelo menos 4 caracteres');
        }
        await db.run(
          'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?',
          [key, value, value]
        );
      }
      await db.run('COMMIT');
      return NextResponse.json({ success: true });
    } catch (e) {
      await db.run('ROLLBACK');
      throw e;
    }
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
