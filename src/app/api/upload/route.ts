import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Helper to verify admin PIN
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const pin = request.headers.get('x-admin-pin');
  if (!pin) return false;
  
  const db = await getDb();
  const setting = await db.get("SELECT value FROM settings WHERE key = 'admin_pin'");
  return setting && setting.value === pin;
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Código PIN inválido' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validate that the file is indeed an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo enviado deve ser uma imagem' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    // Generate unique name to prevent caching issues
    const ext = path.extname(file.name) || '.jpg';
    const filename = `vitrine_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Save to local public/uploads directory
    await writeFile(filePath, buffer);

    const imageUrl = `/api/images?file=${filename}`;

    // Update settings table with new URL
    const db = await getDb();
    await db.run(
      "INSERT INTO settings (key, value) VALUES ('vitrine_image_url', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [imageUrl, imageUrl]
    );

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
