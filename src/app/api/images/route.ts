import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileParam = searchParams.get('file');

    if (!fileParam) {
      return NextResponse.json({ error: 'Arquivo não especificado' }, { status: 400 });
    }

    // Prevenir directory traversal
    const safeFilename = path.basename(fileParam);
    const filePath = path.join(process.cwd(), 'public', 'uploads', safeFilename);

    try {
      const fileBuffer = await readFile(filePath);
      const ext = path.extname(safeFilename).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });
    } catch {
      return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 });
    }
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
