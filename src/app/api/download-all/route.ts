import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import archiver from "archiver";

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

interface Episode {
  key: string;
  name: string;
  url: string;
  user: {
    name: string;
    username: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { episodes, username } = await req.json();

    if (!episodes || !Array.isArray(episodes) || episodes.length === 0) {
      return NextResponse.json(
        { error: "Lista de episodios es requerida" },
        { status: 400 }
      );
    }

    console.log(`🚀 Iniciando descarga masiva de ${episodes.length} episodios para ${username}`);

    // Crear directorio temporal para esta descarga
    const timestamp = Date.now();
    const tempDir = path.join(process.cwd(), "downloads", `bulk_${username}_${timestamp}`);
    await mkdir(tempDir, { recursive: true });

    const downloadedFiles: string[] = [];
    const failedDownloads: string[] = [];

    // Función para limpiar nombre de archivo
    const sanitizeFilename = (filename: string) => {
      return filename
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, "_")
        .substring(0, 200); // Limitar longitud
    };

    // Descargar cada episodio
    for (let i = 0; i < episodes.length; i++) {
      const episode = episodes[i];
      const progressPercent = Math.round(((i + 1) / episodes.length) * 100);
      
      console.log(`📥 [${i + 1}/${episodes.length}] (${progressPercent}%) Descargando: ${episode.name}`);

      try {
        const sanitizedName = sanitizeFilename(episode.name);
        const outputPath = path.join(tempDir, `${sanitizedName}.m4a`);

        // Usar yt-dlp para descargar en formato M4A
        await new Promise<void>((resolve, reject) => {
          const ytDlp = spawn("yt-dlp", [
            "--extract-audio",
            "--audio-format", "m4a",
            "--audio-quality", "0", // Mejor calidad
            "--output", outputPath.replace('.m4a', '.%(ext)s'),
            "--no-playlist",
            "--no-part", // Evitar archivos .part
            "--no-cache-dir",
            "--no-continue", // No continuar descargas parciales
            "--no-overwrites", // No sobrescribir
            "--retries", "3", // 3 intentos máximo
            "--fragment-retries", "3", // 3 intentos por fragmento
            "--no-keep-fragments", // No mantener fragmentos
            "--embed-metadata", // Incluir metadata
            episode.url
          ]);

          let errorOutput = "";
          let stdOutput = "";

          ytDlp.stdout.on("data", (data) => {
            stdOutput += data.toString();
          });

          ytDlp.stderr.on("data", (data) => {
            errorOutput += data.toString();
          });

          ytDlp.on("close", (code) => {
            if (code === 0) {
              // Buscar el archivo descargado (puede tener un nombre ligeramente diferente)
              try {
                const files = fs.readdirSync(tempDir);
                const downloadedFile = files.find(file => 
                  file.includes(sanitizedName) && 
                  file.endsWith('.m4a') && 
                  !file.includes('.part') &&
                  !file.includes('Frag') &&
                  !file.includes('.ytdl')
                );
                
                if (downloadedFile) {
                  const actualPath = path.join(tempDir, downloadedFile);
                  downloadedFiles.push(actualPath);
                  console.log(`✅ Descargado: ${downloadedFile}`);
                } else {
                  console.error(`❌ No se encontró archivo descargado para ${episode.name}`);
                  console.log(`📁 Archivos en directorio: ${files.join(', ')}`);
                  failedDownloads.push(episode.name);
                }
              } catch (dirError) {
                console.error(`❌ Error leyendo directorio: ${dirError}`);
                failedDownloads.push(episode.name);
              }
              resolve();
            } else {
              console.error(`❌ Error descargando ${episode.name}: ${errorOutput}`);
              failedDownloads.push(episode.name);
              resolve(); // Continuar con el siguiente
            }
          });

          ytDlp.on("error", (error) => {
            console.error(`❌ Error spawn para ${episode.name}:`, error);
            failedDownloads.push(episode.name);
            resolve(); // Continuar con el siguiente
          });
        });

        // Pequeña pausa entre descargas para no saturar
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error descargando ${episode.name}:`, error);
        failedDownloads.push(episode.name);
      }
    }

    console.log(`✅ Descarga masiva completada. Exitosos: ${downloadedFiles.length}, Fallidos: ${failedDownloads.length}`);

    if (downloadedFiles.length === 0) {
      return NextResponse.json(
        { error: "No se pudo descargar ningún archivo" },
        { status: 500 }
      );
    }

    // Crear archivo ZIP sin comprimir
    const zipPath = path.join(process.cwd(), "downloads", `${username}_all_episodes_${timestamp}.zip`);
    
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        store: true // Sin compresión
      });

      output.on('close', () => {
        console.log(`📦 ZIP creado: ${archive.pointer()} bytes totales`);
        resolve();
      });

      archive.on('error', (err: Error) => {
        reject(err);
      });

      archive.pipe(output);

      // Añadir cada archivo descargado al ZIP
      for (const filePath of downloadedFiles) {
        if (fs.existsSync(filePath)) {
          const fileName = path.basename(filePath);
          archive.file(filePath, { name: fileName });
        }
      }

      archive.finalize();
    });

    // Limpiar archivos temporales individuales y fragmentos
    console.log("🧹 Limpiando archivos temporales...");
    try {
      // Limpiar archivos individuales descargados
      for (const filePath of downloadedFiles) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`🗑️ Eliminado: ${path.basename(filePath)}`);
          }
        } catch (error) {
          console.error(`Error eliminando archivo temporal ${filePath}:`, error);
        }
      }

      // Limpiar todo el directorio temporal (incluye fragmentos y archivos .ytdl)
      if (fs.existsSync(tempDir)) {
        const tempFiles = fs.readdirSync(tempDir);
        for (const file of tempFiles) {
          const fullPath = path.join(tempDir, file);
          try {
            fs.unlinkSync(fullPath);
            console.log(`🗑️ Eliminado fragmento: ${file}`);
          } catch (error) {
            console.error(`Error eliminando fragmento ${file}:`, error);
          }
        }
        
        // Eliminar el directorio vacío
        fs.rmdirSync(tempDir);
        console.log(`📁 Directorio temporal eliminado: ${tempDir}`);
      }
    } catch (error) {
      console.error(`Error en limpieza general:`, error);
    }

    // Obtener tamaño del archivo ZIP
    const zipStats = await stat(zipPath);
    const zipSizeMB = (zipStats.size / 1024 / 1024).toFixed(2);

    const downloadUrl = `/api/download/${path.basename(zipPath)}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename: path.basename(zipPath),
      totalEpisodes: episodes.length,
      successfulDownloads: downloadedFiles.length,
      failedDownloads: failedDownloads.length,
      failedList: failedDownloads,
      zipSizeMB: parseFloat(zipSizeMB),
      message: `ZIP creado con ${downloadedFiles.length} episodios. Tamaño: ${zipSizeMB} MB`
    });

  } catch (error) {
    console.error("❌ Error en descarga masiva:", error);
    return NextResponse.json(
      { error: `Error en descarga masiva: ${error instanceof Error ? error.message : "Error desconocido"}` },
      { status: 500 }
    );
  }
}
