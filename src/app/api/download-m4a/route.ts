import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { cleanupDownloads } from "@/lib/cleanup";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    // Ejecutar limpieza antes de la descarga
    console.log("🧹 Ejecutando limpieza de archivos temporales...");
    await cleanupDownloads();
    console.log("✅ Limpieza completada");
    
    const { url, episodeName } = await req.json();

    if (!url || !episodeName) {
      return NextResponse.json(
        { error: "URL y nombre del episodio son requeridos" },
        { status: 400 }
      );
    }

    // Limpiar el nombre del archivo para evitar caracteres problemáticos
    const cleanFilename = episodeName
      .replace(/[^a-zA-Z0-9\s\-\_]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 100); // Limitar longitud

    // Directorio temporal para descargas
    const downloadDir = path.join(process.cwd(), "downloads");
    
    // Crear directorio si no existe
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const filename = path.join(downloadDir, `${cleanFilename}.%(ext)s`);
    
    // Comando yt-dlp para descargar en formato M4A original (sin conversión)
    const command = `yt-dlp -x --audio-format m4a --embed-metadata -o "${filename}" "${url}"`;

    console.log(`Ejecutando comando M4A: ${command}`);

    // Ejecutar el comando
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minutos timeout
    });

    console.log("Salida del comando M4A:", stdout);
    if (stderr) console.log("Errores del comando M4A:", stderr);

    // Buscar el archivo descargado (debe ser .m4a)
    const files = fs.readdirSync(downloadDir);
    console.log("Archivos en directorio:", files);
    
    const downloadedFile = files.find(file => 
      file.startsWith(cleanFilename) && file.endsWith('.m4a')
    );

    if (!downloadedFile) {
      console.log("Archivos disponibles:", files);
      throw new Error(`No se pudo encontrar el archivo M4A descargado. Buscando: ${cleanFilename}.m4a`);
    }

    console.log("Archivo M4A encontrado:", downloadedFile);
    const filePath = path.join(downloadDir, downloadedFile);
    const fileStats = fs.statSync(filePath);

    return NextResponse.json({
      success: true,
      message: "Descarga M4A completada",
      filename: downloadedFile,
      format: "M4A",
      size: fileStats.size,
      downloadUrl: `/api/download/${encodeURIComponent(downloadedFile)}`,
      stdout: stdout,
      stderr: stderr,
    });

  } catch (error) {
    console.error("Error en descarga M4A:", error);
    
    // Verificar si yt-dlp está instalado
    if (error instanceof Error && error.message.includes("yt-dlp")) {
      return NextResponse.json(
        { 
          error: "yt-dlp no está instalado. Instálalo con: pip install yt-dlp",
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error interno del servidor",
        details: error instanceof Error ? error.stack : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
