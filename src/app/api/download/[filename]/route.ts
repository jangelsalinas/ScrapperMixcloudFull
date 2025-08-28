import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = decodeURIComponent(params.filename);
    const filePath = path.join(process.cwd(), "downloads", filename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que es un archivo de audio permitido
    if (!filename.endsWith('.mp3') && !filename.endsWith('.m4a')) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 403 }
      );
    }

    // Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);

    // Determinar el tipo MIME correcto
    const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4';

    // Crear respuesta con headers apropiados
    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

    return response;

  } catch (error) {
    console.error("Error sirviendo archivo:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
