import { NextRequest, NextResponse } from "next/server";
import { cleanupDownloads, getDownloadsDirInfo, DEFAULT_CLEANUP_OPTIONS } from "@/lib/cleanup";

export async function GET() {
  try {
    const info = getDownloadsDirInfo();
    
    return NextResponse.json({
      success: true,
      downloadDir: {
        exists: info.exists,
        fileCount: info.fileCount,
        totalSize: info.totalSize,
        totalSizeMB: (info.totalSize / 1024 / 1024).toFixed(2),
        files: info.files.map(file => ({
          name: file.name,
          sizeMB: (file.size / 1024 / 1024).toFixed(2),
          modified: file.modified,
          ageMinutes: Math.floor(file.age / 1000 / 60)
        }))
      },
      cleanupPolicy: {
        maxAgeMinutes: Math.floor(DEFAULT_CLEANUP_OPTIONS.maxAge / 1000 / 60),
        maxFiles: DEFAULT_CLEANUP_OPTIONS.maxFiles,
        maxSizeMB: Math.floor(DEFAULT_CLEANUP_OPTIONS.maxSize / 1024 / 1024)
      }
    });
  } catch (error) {
    console.error("Error obteniendo información de limpieza:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    const options = {
      maxAge: body.maxAgeMinutes ? body.maxAgeMinutes * 60 * 1000 : DEFAULT_CLEANUP_OPTIONS.maxAge,
      maxFiles: body.maxFiles || DEFAULT_CLEANUP_OPTIONS.maxFiles,
      maxSize: body.maxSizeMB ? body.maxSizeMB * 1024 * 1024 : DEFAULT_CLEANUP_OPTIONS.maxSize
    };

    console.log("🧹 Ejecutando limpieza manual con opciones:", options);
    const result = await cleanupDownloads(options);
    
    return NextResponse.json({
      success: true,
      cleanup: {
        deletedFiles: result.deletedFiles,
        deletedCount: result.deletedFiles.length,
        remainingFiles: result.remainingFiles,
        freedSpaceMB: (result.freedSpace / 1024 / 1024).toFixed(2)
      }
    });
  } catch (error) {
    console.error("Error en limpieza manual:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      },
      { status: 500 }
    );
  }
}
