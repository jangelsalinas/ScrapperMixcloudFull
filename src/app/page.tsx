"use client";
import { useState } from "react";

interface Episode {
  key: string;
  name: string;
  url: string;
  user: {
    name: string;
    username: string;
  };
  created_time: string;
  audio_length: number;
  play_count: number;
  favorite_count: number;
  comment_count: number;
  pictures: {
    medium: string;
  };
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [downloadingEpisodes, setDownloadingEpisodes] = useState<Set<string>>(new Set());
  const [downloadingM4AEpisodes, setDownloadingM4AEpisodes] = useState<Set<string>>(new Set());
  const [showCleanupInfo, setShowCleanupInfo] = useState(false);
  const [cleanupInfo, setCleanupInfo] = useState<any>(null);
  const [loadAll, setLoadAll] = useState(false);
  const [allEpisodesLoaded, setAllEpisodesLoaded] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [bulkDownloadProgress, setBulkDownloadProgress] = useState("");
  const [bulkDownloadPercent, setBulkDownloadPercent] = useState(0);
  const [progressColor, setProgressColor] = useState("bg-green-400");

  const fetchCleanupInfo = async () => {
    try {
      const response = await fetch("/api/cleanup");
      const data = await response.json();
      setCleanupInfo(data);
    } catch (err) {
      console.error("Error obteniendo información de limpieza:", err);
    }
  };

  const performCleanup = async () => {
    try {
      const response = await fetch("/api/cleanup", { method: "POST" });
      const data = await response.json();
      
      if (data.success) {
        alert(`Limpieza completada: ${data.cleanup.deletedCount} archivos eliminados, ${data.cleanup.freedSpaceMB} MB liberados`);
        fetchCleanupInfo(); // Actualizar información
      }
    } catch (err) {
      console.error("Error en limpieza:", err);
      alert("Error al realizar la limpieza");
    }
  };

  const handleDownloadM4A = async (episode: Episode) => {
    // Añadir episodio a la lista de descargas M4A en progreso
    setDownloadingM4AEpisodes(prev => new Set(prev).add(episode.key));

    try {
      const response = await fetch("/api/download-m4a", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: episode.url,
          episodeName: episode.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al descargar el M4A");
      }

      // Crear enlace para descargar el archivo
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Descarga M4A completada:", data.filename);
      alert(`¡Descarga M4A completada! Archivo: ${data.filename}`);

    } catch (err) {
      console.error("Error en descarga M4A:", err);
      alert(`Error al descargar M4A: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      // Remover episodio de la lista de descargas M4A en progreso
      setDownloadingM4AEpisodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(episode.key);
        return newSet;
      });
    }
  };

  const handleDownload = async (episode: Episode) => {
    // Añadir episodio a la lista de descargas en progreso
    setDownloadingEpisodes(prev => new Set(prev).add(episode.key));

    try {
      const response = await fetch("/api/download-mp3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: episode.url,
          episodeName: episode.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al descargar el MP3");
      }

      // Crear enlace para descargar el archivo
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log("Descarga completada:", data.filename);
      alert(`¡Descarga completada! Archivo: ${data.filename}`);

    } catch (err) {
      console.error("Error en descarga:", err);
      alert(`Error al descargar: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      // Remover episodio de la lista de descargas en progreso
      setDownloadingEpisodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(episode.key);
        return newSet;
      });
    }
  };

  const handleBulkDownload = async () => {
    // Confirmación del usuario
    const confirmMessage = `¿Estás seguro de que quieres descargar TODOS los ${episodes.length} episodios en formato M4A?

Esta operación puede tardar mucho tiempo (aproximadamente ${Math.ceil(episodes.length * 0.5)} minutos) y consumir mucho espacio en disco.

Los archivos se empaquetarán en un archivo ZIP sin comprimir.

¿Continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setBulkDownloading(true);
    setBulkDownloadProgress("Iniciando descarga masiva...");
    setBulkDownloadPercent(0);

    // Simulador de progreso
    const estimatedTimeMs = episodes.length * 30000; // 30 segundos por episodio estimado
    const updateInterval = 1000; // Actualizar cada segundo
    const totalSteps = estimatedTimeMs / updateInterval;
    let currentStep = 0;

    const progressInterval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / totalSteps) * 90, 90); // Máximo 90% durante descarga
      setBulkDownloadPercent(Math.round(progress));
      
      if (progress < 30) {
        setBulkDownloadProgress(`Descargando episodios... ${Math.round(progress)}%`);
        setProgressColor("bg-blue-400"); // Azul para descarga
      } else if (progress < 60) {
        setBulkDownloadProgress(`Procesando archivos... ${Math.round(progress)}%`);
        setProgressColor("bg-yellow-400"); // Amarillo para procesamiento
      } else if (progress < 90) {
        setBulkDownloadProgress(`Creando archivo ZIP... ${Math.round(progress)}%`);
        setProgressColor("bg-orange-400"); // Naranja para ZIP
      }
    }, updateInterval);

    try {
      // Extraer username de la URL
      const urlPattern = /https?:\/\/(?:www\.)?mixcloud\.com\/([^\/]+)\/?/;
      const match = url.match(urlPattern);
      const username = match ? match[1] : "unknown";

      const response = await fetch("/api/download-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          episodes,
          username
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error en descarga masiva");
      }

      // Limpiar el simulador de progreso
      clearInterval(progressInterval);
      
      // Mostrar progreso final
      setBulkDownloadPercent(100);
      setBulkDownloadProgress("¡Completado! Preparando descarga...");
      setProgressColor("bg-green-400"); // Verde para completado

      // Crear enlace para descargar el archivo ZIP
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const successMessage = `🎉 ¡Descarga masiva completada!

📊 Estadísticas:
• Total de episodios: ${data.totalEpisodes}
• Descargas exitosas: ${data.successfulDownloads}
• Descargas fallidas: ${data.failedDownloads}
• Tamaño del ZIP: ${data.zipSizeMB} MB

📁 Archivo: ${data.filename}

${data.failedDownloads > 0 ? `\n⚠️ Episodios no descargados:\n${data.failedList.join('\n')}` : ''}`;

      alert(successMessage);

    } catch (err) {
      console.error("Error en descarga masiva:", err);
      alert(`Error en descarga masiva: ${err instanceof Error ? err.message : "Error desconocido"}`);
    } finally {
      // Limpiar el simulador de progreso
      clearInterval(progressInterval);
      setBulkDownloading(false);
      setBulkDownloadProgress("");
      setBulkDownloadPercent(0);
      setProgressColor("bg-green-400");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setEpisodes([]);
    setAllEpisodesLoaded(false);

    try {
      const response = await fetch("/api/mixcloud", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          url,
          loadAll
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al obtener los episodios");
      }

      setEpisodes(data.episodes || []);
      setAllEpisodesLoaded(loadAll); // Marcar si se cargaron todos
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Mixcloud Episode Scraper
          </h1>
          <p className="text-lg text-gray-600">
            Introduce una URL de usuario de Mixcloud para obtener sus episodios
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.mixcloud.com/username/"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Cargando..." : "Obtener Episodios"}
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="loadAll"
                type="checkbox"
                checked={loadAll}
                onChange={(e) => setLoadAll(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="loadAll" className="text-sm font-medium text-gray-700">
                Cargar todos los episodios (puede tardar más tiempo)
              </label>
            </div>
          </div>
        </form>

        {/* Sección de información de limpieza */}
        <div className="mb-8">
          <button
            onClick={() => {
              setShowCleanupInfo(!showCleanupInfo);
              if (!showCleanupInfo && !cleanupInfo) {
                fetchCleanupInfo();
              }
            }}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            {showCleanupInfo ? "Ocultar" : "Mostrar"} información de archivos temporales
          </button>
          
          {showCleanupInfo && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                📁 Gestión de Archivos Temporales
              </h3>
              
              {cleanupInfo ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Archivos:</span> {cleanupInfo.downloadDir.fileCount}
                    </div>
                    <div>
                      <span className="font-medium">Tamaño total:</span> {cleanupInfo.downloadDir.totalSizeMB} MB
                    </div>
                    <div>
                      <span className="font-medium">Límite archivos:</span> {cleanupInfo.cleanupPolicy.maxFiles}
                    </div>
                    <div>
                      <span className="font-medium">Límite tamaño:</span> {cleanupInfo.cleanupPolicy.maxSizeMB} MB
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>🕐 Los archivos se eliminan automáticamente después de {cleanupInfo.cleanupPolicy.maxAgeMinutes} minutos</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={fetchCleanupInfo}
                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                    >
                      🔄 Actualizar
                    </button>
                    <button
                      onClick={performCleanup}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      🧹 Limpiar ahora
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-2">Cargando información...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {episodes.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Episodios encontrados ({episodes.length})
              </h2>
              
              {allEpisodesLoaded && episodes.length > 1 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <button
                      onClick={handleBulkDownload}
                      disabled={bulkDownloading}
                      className="relative overflow-hidden px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2 min-w-[200px]"
                    >
                      {/* Barra de progreso de fondo */}
                      {bulkDownloading && (
                        <div 
                          className={`absolute inset-0 transition-all duration-500 ease-out ${progressColor}`}
                          style={{ width: `${bulkDownloadPercent}%` }}
                        />
                      )}
                      
                      {/* Contenido del botón */}
                      <div className="relative z-10 flex items-center gap-2">
                        {bulkDownloading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>{bulkDownloadPercent}% - {bulkDownloadProgress.split(' ')[0]}...</span>
                          </>
                        ) : (
                          <>
                            📦 Descargar Todos (ZIP)
                          </>
                        )}
                      </div>
                    </button>
                    
                    {/* Indicador de progreso adicional debajo del botón */}
                    {bulkDownloading && (
                      <div className="mt-1 text-xs text-gray-600 text-center">
                        {bulkDownloadProgress}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {episodes.map((episode) => (
                <div
                  key={episode.key}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={episode.pictures.medium}
                    alt={episode.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      {episode.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Por {episode.user.name}
                    </p>
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>{formatDate(episode.created_time)}</span>
                      <span>{formatDuration(episode.audio_length)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mb-3">
                      <span>▶ {episode.play_count.toLocaleString()}</span>
                      <span>❤ {episode.favorite_count.toLocaleString()}</span>
                      <span>💬 {episode.comment_count.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      <a
                        href={episode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full text-center px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                      >
                        Ver en Mixcloud
                      </a>
                      <button
                        onClick={() => handleDownload(episode)}
                        disabled={downloadingEpisodes.has(episode.key)}
                        className={`inline-block w-full text-center px-4 py-2 text-white rounded transition-colors ${
                          downloadingEpisodes.has(episode.key)
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {downloadingEpisodes.has(episode.key) ? 'Descargando...' : 'Descargar MP3'}
                      </button>
                      <button
                        onClick={() => handleDownloadM4A(episode)}
                        disabled={downloadingM4AEpisodes.has(episode.key)}
                        className={`inline-block w-full text-center px-4 py-2 text-white rounded transition-colors ${
                          downloadingM4AEpisodes.has(episode.key)
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {downloadingM4AEpisodes.has(episode.key) ? 'Descargando...' : 'Descargar M4A'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && episodes.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Introduce una URL de Mixcloud para comenzar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
