import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    if (!pin) {
      return NextResponse.json({ error: 'PIN não informado' }, { status: 400 });
    }

    const db = await getDb();
    const setting = await db.get("SELECT value FROM settings WHERE key = 'admin_pin'");
    const storedPin = setting?.value || '';
    const isValid = storedPin === pin;

    console.log(`[Verify PIN] Recebido no request: "${pin}" | No banco de dados: "${storedPin}" | Válido: ${isValid}`);

    if (isValid) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Código PIN inválido' }, { status: 401 });
    }
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
