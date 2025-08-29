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
    <div className="min-h-screen relative overflow-hidden">
      {/* Fondo con gradiente verde musical */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-green-700 to-emerald-800"></div>
      
      {/* Patrón de ondas musicales de fondo */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
          {/* Ondas musicales */}
          <path d="M0,100 Q100,50 200,100 T400,100" stroke="white" strokeWidth="2" fill="none"/>
          <path d="M0,150 Q100,100 200,150 T400,150" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M0,200 Q100,150 200,200 T400,200" stroke="white" strokeWidth="1" fill="none"/>
          <path d="M0,250 Q100,200 200,250 T400,250" stroke="white" strokeWidth="1.5" fill="none"/>
          <path d="M0,300 Q100,250 200,300 T400,300" stroke="white" strokeWidth="2" fill="none"/>
          
          {/* Notas musicales flotantes */}
          <circle cx="50" cy="80" r="8" fill="white" opacity="0.3"/>
          <circle cx="150" cy="120" r="6" fill="white" opacity="0.4"/>
          <circle cx="250" cy="90" r="10" fill="white" opacity="0.2"/>
          <circle cx="350" cy="130" r="7" fill="white" opacity="0.3"/>
          
          <circle cx="80" cy="280" r="6" fill="white" opacity="0.3"/>
          <circle cx="180" cy="320" r="8" fill="white" opacity="0.2"/>
          <circle cx="280" cy="270" r="9" fill="white" opacity="0.4"/>
          <circle cx="320" cy="310" r="5" fill="white" opacity="0.3"/>
        </svg>
      </div>

      {/* Elementos decorativos de audio */}
      <div className="absolute top-20 left-10 text-white opacity-20 text-6xl">🎵</div>
      <div className="absolute top-40 right-20 text-white opacity-15 text-4xl">🎧</div>
      <div className="absolute bottom-20 left-20 text-white opacity-25 text-5xl">📻</div>
      <div className="absolute bottom-40 right-10 text-white opacity-20 text-3xl">🎶</div>
      
      {/* Contenido principal */}
      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header con diseño mejorado */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6 backdrop-blur-sm">
              <span className="text-4xl">🎵</span>
            </div>
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              Mixcloud Episode Scraper
            </h1>
            <p className="text-xl text-green-100 max-w-2xl mx-auto leading-relaxed">
              Descarga todos tus episodios favoritos de Mixcloud en alta calidad
            </p>
          </div>

          {/* Formulario con estilo glassmorphism */}
          <form onSubmit={handleSubmit} className="mb-8">
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-30 shadow-2xl">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.mixcloud.com/username/"
                    className="flex-1 px-4 py-3 bg-white bg-opacity-90 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder-gray-500 text-gray-900 backdrop-blur-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition hover:scale-105 shadow-lg"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Cargando...
                      </div>
                    ) : (
                      "🎵 Obtener Episodios"
                    )}
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    id="loadAll"
                    type="checkbox"
                    checked={loadAll}
                    onChange={(e) => setLoadAll(e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-white bg-opacity-90 border-green-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <label htmlFor="loadAll" className="text-sm font-medium text-white drop-shadow">
                    🔄 Cargar todos los episodios (puede tardar más tiempo)
                  </label>
                </div>
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
              className="text-sm text-green-100 hover:text-white underline transition-colors backdrop-blur-sm bg-white bg-opacity-10 px-3 py-1 rounded-full"
            >
              {showCleanupInfo ? "🔒 Ocultar" : "📁 Mostrar"} información de archivos temporales
            </button>
          
            {showCleanupInfo && (
              <div className="mt-4 p-6 bg-white bg-opacity-20 backdrop-blur-md border border-white border-opacity-30 rounded-xl shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  📁 Gestión de Archivos Temporales
                </h3>
              
                {cleanupInfo ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-green-100">
                      <div className="bg-green-800 bg-opacity-30 p-2 rounded">
                        <span className="font-medium">Archivos:</span> {cleanupInfo.downloadDir.fileCount}
                      </div>
                      <div className="bg-green-800 bg-opacity-30 p-2 rounded">
                        <span className="font-medium">Tamaño total:</span> {cleanupInfo.downloadDir.totalSizeMB} MB
                      </div>
                      <div className="bg-green-800 bg-opacity-30 p-2 rounded">
                        <span className="font-medium">Límite archivos:</span> {cleanupInfo.cleanupPolicy.maxFiles}
                      </div>
                      <div className="bg-green-800 bg-opacity-30 p-2 rounded">
                        <span className="font-medium">Límite tamaño:</span> {cleanupInfo.cleanupPolicy.maxSizeMB} MB
                      </div>
                    </div>
                    
                    <div className="text-sm text-green-100 bg-green-800 bg-opacity-20 p-3 rounded">
                      <p>🕐 Los archivos se eliminan automáticamente después de {cleanupInfo.cleanupPolicy.maxAgeMinutes} minutos</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={fetchCleanupInfo}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-all transform hover:scale-105"
                      >
                        🔄 Actualizar
                      </button>
                      <button
                        onClick={performCleanup}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-all transform hover:scale-105"
                      >
                        🧹 Limpiar ahora
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-300 mx-auto"></div>
                    <p className="text-sm text-green-100 mt-2">Cargando información...</p>
                  </div>
                )}
              </div>
            )}
        </div>

          {error && (
            <div className="mb-8 p-4 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 text-red-100 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span>❌</span>
                {error}
              </div>
            </div>
          )}

          {episodes.length > 0 && (
            <div className="space-y-6">
              <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-30 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    🎶 Episodios encontrados <span className="bg-green-500 text-white px-3 py-1 rounded-full text-lg">({episodes.length})</span>
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
                      <div className="mt-1 text-xs text-green-100 text-center backdrop-blur-sm bg-white bg-opacity-10 rounded px-2 py-1">
                        {bulkDownloadProgress}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Grid de episodios con tema musical - Espaciado aumentado para evitar solapamiento */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
              {episodes.map((episode) => (
                <div
                  key={episode.key}
                  className="bg-white bg-opacity-95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden hover:shadow-3xl hover:bg-opacity-100 transition-all duration-300 transform hover:scale-105 border border-green-200"
                >
                  <div className="relative">
                    <img
                      src={episode.pictures.medium}
                      alt={episode.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                    <div className="absolute bottom-2 left-2 text-white text-xs bg-black bg-opacity-50 px-2 py-1 rounded">
                      🎵 {formatDuration(episode.audio_length)}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-b from-white to-green-50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      🎧 {episode.name}
                    </h3>
                    <p className="text-sm text-green-600 mb-2 font-medium">
                      👨‍🎤 {episode.user.name}
                    </p>
                    <div className="flex justify-between text-xs text-gray-600 mb-2">
                      <span>📅 {formatDate(episode.created_time)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mb-3 bg-green-100 p-2 rounded">
                      <span>▶ {episode.play_count.toLocaleString()}</span>
                      <span>❤ {episode.favorite_count.toLocaleString()}</span>
                      <span>💬 {episode.comment_count.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">
                      <a
                        href={episode.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block w-full text-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 shadow-md"
                      >
                        🌐 Ver en Mixcloud
                      </a>
                      <button
                        onClick={() => handleDownload(episode)}
                        disabled={downloadingEpisodes.has(episode.key)}
                        className={`inline-block w-full text-center px-4 py-2 text-white rounded-lg transition-all transform hover:scale-105 shadow-md ${
                          downloadingEpisodes.has(episode.key)
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                        }`}
                      >
                        {downloadingEpisodes.has(episode.key) ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Descargando...
                          </div>
                        ) : (
                          '🎵 Descargar MP3'
                        )}
                      </button>
                      <button
                        onClick={() => handleDownloadM4A(episode)}
                        disabled={downloadingM4AEpisodes.has(episode.key)}
                        className={`inline-block w-full text-center px-4 py-2 text-white rounded-lg transition-all transform hover:scale-105 shadow-md ${
                          downloadingM4AEpisodes.has(episode.key)
                            ? 'bg-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600'
                        }`}
                      >
                        {downloadingM4AEpisodes.has(episode.key) ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Descargando...
                          </div>
                        ) : (
                          '🎧 Descargar M4A'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {!loading && episodes.length === 0 && !error && (
          <div className="text-center py-12 text-white">
            <div className="bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-8 border border-white border-opacity-30 shadow-2xl max-w-md mx-auto">
              <span className="text-4xl mb-4 block">🎵</span>
              <p className="text-green-100">
                Introduce una URL de Mixcloud para comenzar
              </p>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
