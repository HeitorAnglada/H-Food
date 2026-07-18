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

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Código PIN inválido' }, { status: 401 });
    }

    const db = await getDb();
    
    // Fetch active orders
    const orders = await db.all('SELECT * FROM orders WHERE status = "active" ORDER BY created_at DESC');
    
    // Fetch all items for active orders
    const orderItems = await db.all(`
      SELECT oi.*, o.student_name 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = "active"
    `);

    // Group items by order_id for the breakdown
    const ordersWithItems = orders.map(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return {
        ...order,
        items,
        total
      };
    });

    // Generate consolidated totals
    const consolidatedMap: Record<string, { quantity: number; price: number; total: number }> = {};
    orderItems.forEach(item => {
      if (!consolidatedMap[item.product_name]) {
        consolidatedMap[item.product_name] = {
          quantity: 0,
          price: item.price,
          total: 0
        };
      }
      consolidatedMap[item.product_name].quantity += item.quantity;
      consolidatedMap[item.product_name].total += item.price * item.quantity;
    });

    const consolidated = Object.entries(consolidatedMap).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.quantity - a.quantity); // sort by quantity descending

    return NextResponse.json({
      orders: ordersWithItems,
      consolidated
    });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { student_name, items } = await request.json();
    if (!student_name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Dados do pedido inválidos' }, { status: 400 });
    }

    const db = await getDb();

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      const result = await db.run(
        'INSERT INTO orders (student_name, status) VALUES (?, ?)',
        [student_name, 'active']
      );
      const orderId = result.lastID;

      for (const item of items) {
        if (!item.name || typeof item.price !== 'number' || typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new Error(`Item inválido: ${item.name}`);
        }
        await db.run(
          'INSERT INTO order_items (order_id, product_name, price, quantity) VALUES (?, ?, ?, ?)',
          [orderId, item.name, item.price, item.quantity]
        );
      }

      await db.run('COMMIT');
      return NextResponse.json({ success: true, orderId });
    } catch (e) {
      await db.run('ROLLBACK');
      throw e;
    }
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

    const db = await getDb();
    
    // Soft-archive active orders
    await db.run('UPDATE orders SET status = "archived" WHERE status = "active"');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
