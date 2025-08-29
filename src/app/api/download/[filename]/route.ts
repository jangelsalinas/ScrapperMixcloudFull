import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename: encodedFilename } = await params;
    const filename = decodeURIComponent(encodedFilename);
    const filePath = path.join(process.cwd(), "downloads", filename);

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Archivo no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que es un archivo permitido
    if (!filename.endsWith('.mp3') && !filename.endsWith('.m4a') && !filename.endsWith('.zip')) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido" },
        { status: 403 }
      );
    }

    // Leer el archivo
    const fileBuffer = fs.readFileSync(filePath);

    // Determinar el tipo MIME correcto
    let contentType: string;
    if (filename.endsWith('.mp3')) {
      contentType = 'audio/mpeg';
    } else if (filename.endsWith('.m4a')) {
      contentType = 'audio/mp4';
    } else if (filename.endsWith('.zip')) {
      contentType = 'application/zip';
    } else {
      contentType = 'application/octet-stream';
    }

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
