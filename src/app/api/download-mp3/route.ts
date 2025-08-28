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
    
    // Comando yt-dlp con parámetros más específicos para forzar MP3
    const command = `yt-dlp -x --audio-format mp3 --audio-quality 0 --embed-metadata -o "${filename}" "${url}"`;

    console.log(`Ejecutando: ${command}`);

    // Ejecutar el comando
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5 minutos timeout
    });

    console.log("Salida del comando:", stdout);
    if (stderr) console.log("Errores del comando:", stderr);

    // Buscar el archivo descargado (puede ser .mp3 o .m4a)
    const files = fs.readdirSync(downloadDir);
    console.log("Archivos en directorio:", files);
    
    const downloadedFile = files.find(file => 
      file.startsWith(cleanFilename) && (file.endsWith('.mp3') || file.endsWith('.m4a'))
    );

    if (!downloadedFile) {
      console.log("Archivos disponibles:", files);
      throw new Error(`No se pudo encontrar el archivo descargado. Buscando: ${cleanFilename}.*`);
    }

    console.log("Archivo encontrado:", downloadedFile);
    let finalFilePath = path.join(downloadDir, downloadedFile);
    let finalFileName = downloadedFile;

    // Si el archivo es .m4a, convertirlo a .mp3
    if (downloadedFile.endsWith('.m4a')) {
      const mp3FileName = downloadedFile.replace('.m4a', '.mp3');
      const mp3FilePath = path.join(downloadDir, mp3FileName);
      
      console.log(`Convirtiendo ${downloadedFile} a ${mp3FileName}`);
      
      // Usar ffmpeg para convertir m4a a mp3
      const convertCommand = `ffmpeg -i "${finalFilePath}" -codec:a libmp3lame -b:a 192k "${mp3FilePath}"`;
      
      try {
        await execAsync(convertCommand, { timeout: 300000 });
        console.log("Conversión completada");
        
        // Eliminar el archivo m4a original
        fs.unlinkSync(finalFilePath);
        
        finalFilePath = mp3FilePath;
        finalFileName = mp3FileName;
      } catch (convertError) {
        console.log("Error en conversión, usando archivo original:", convertError);
        // Si falla la conversión, usar el archivo original
      }
    }

    const fileStats = fs.statSync(finalFilePath);

    return NextResponse.json({
      success: true,
      message: "Descarga completada",
      filename: finalFileName,
      size: fileStats.size,
      downloadUrl: `/api/download/${encodeURIComponent(finalFileName)}`,
      stdout: stdout,
      stderr: stderr,
    });

  } catch (error) {
    console.error("Error en descarga:", error);
    
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
