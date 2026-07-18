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
    const products = await db.all('SELECT * FROM products ORDER BY name ASC');
    return NextResponse.json({ products });
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

    const { id, name, price } = await request.json();
    if (!name || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const db = await getDb();
    if (id) {
      await db.run(
        'UPDATE products SET name = ?, price = ? WHERE id = ?',
        [name, price, id]
      );
    } else {
      await db.run(
        'INSERT INTO products (name, price) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET price = ?',
        [name, price, price]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Código PIN inválido' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do produto não informado' }, { status: 400 });
    }

    const db = await getDb();
    await db.run('DELETE FROM products WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
