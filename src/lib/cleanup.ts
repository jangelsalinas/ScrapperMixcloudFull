import fs from "fs";
import path from "path";

export interface CleanupOptions {
  maxAge: number; // Tiempo en milisegundos
  maxFiles: number; // Número máximo de archivos
  maxSize: number; // Tamaño máximo en bytes
}

export const DEFAULT_CLEANUP_OPTIONS: CleanupOptions = {
  maxAge: 30 * 60 * 1000, // 30 minutos
  maxFiles: 50, // Máximo 50 archivos
  maxSize: 500 * 1024 * 1024, // 500 MB
};

export async function cleanupDownloads(options: CleanupOptions = DEFAULT_CLEANUP_OPTIONS): Promise<{
  deletedFiles: string[];
  remainingFiles: number;
  freedSpace: number;
}> {
  const downloadDir = path.join(process.cwd(), "downloads");
  
  if (!fs.existsSync(downloadDir)) {
    return { deletedFiles: [], remainingFiles: 0, freedSpace: 0 };
  }

  const files = fs.readdirSync(downloadDir);
  const fileStats = files.map(file => {
    const filePath = path.join(downloadDir, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      path: filePath,
      size: stats.size,
      modified: stats.mtime.getTime(),
      age: Date.now() - stats.mtime.getTime()
    };
  });

  const deletedFiles: string[] = [];
  let freedSpace = 0;

  // Ordenar por fecha de modificación (más antiguos primero)
  fileStats.sort((a, b) => a.modified - b.modified);

  // 1. Eliminar archivos por edad
  const filesToDeleteByAge = fileStats.filter(file => file.age > options.maxAge);
  
  // 2. Eliminar archivos excedentes por cantidad
  const totalFiles = fileStats.length;
  const filesToDeleteByCount = totalFiles > options.maxFiles 
    ? fileStats.slice(0, totalFiles - options.maxFiles)
    : [];

  // 3. Calcular tamaño total y eliminar archivos si excede el límite
  const totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);
  let currentSize = totalSize;
  const filesToDeleteBySize: typeof fileStats = [];
  
  if (totalSize > options.maxSize) {
    const sizeToFree = totalSize - options.maxSize;
    let freedSoFar = 0;
    
    for (const file of fileStats) {
      if (freedSoFar < sizeToFree) {
        filesToDeleteBySize.push(file);
        freedSoFar += file.size;
      }
    }
  }

  // Combinar todos los archivos a eliminar (sin duplicados)
  const allFilesToDelete = new Set([
    ...filesToDeleteByAge.map(f => f.path),
    ...filesToDeleteByCount.map(f => f.path),
    ...filesToDeleteBySize.map(f => f.path)
  ]);

  // Eliminar archivos
  for (const filePath of allFilesToDelete) {
    try {
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;
      
      fs.unlinkSync(filePath);
      deletedFiles.push(fileName);
      freedSpace += fileSize;
      
      console.log(`✅ Archivo eliminado: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
    } catch (error) {
      console.error(`❌ Error eliminando archivo ${filePath}:`, error);
    }
  }

  const remainingFiles = files.length - deletedFiles.length;

  console.log(`🧹 Limpieza completada:`);
  console.log(`   - Archivos eliminados: ${deletedFiles.length}`);
  console.log(`   - Archivos restantes: ${remainingFiles}`);
  console.log(`   - Espacio liberado: ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);

  return {
    deletedFiles,
    remainingFiles,
    freedSpace
  };
}

export function getDownloadsDirInfo(): {
  exists: boolean;
  fileCount: number;
  totalSize: number;
  files: Array<{
    name: string;
    size: number;
    modified: Date;
    age: number;
  }>;
} {
  const downloadDir = path.join(process.cwd(), "downloads");
  
  if (!fs.existsSync(downloadDir)) {
    return { exists: false, fileCount: 0, totalSize: 0, files: [] };
  }

  const files = fs.readdirSync(downloadDir);
  const fileInfo = files.map(file => {
    const filePath = path.join(downloadDir, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      modified: stats.mtime,
      age: Date.now() - stats.mtime.getTime()
    };
  });

  const totalSize = fileInfo.reduce((sum, file) => sum + file.size, 0);

  return {
    exists: true,
    fileCount: files.length,
    totalSize,
    files: fileInfo
  };
}
