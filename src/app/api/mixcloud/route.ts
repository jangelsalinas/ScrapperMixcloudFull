import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url, loadAll = false, offset = 0, limit = 20 } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL es requerida" },
        { status: 400 }
      );
    }

    // Extraer el username de la URL de Mixcloud
    const urlPattern = /https?:\/\/(?:www\.)?mixcloud\.com\/([^\/]+)\/?/;
    const match = url.match(urlPattern);

    if (!match) {
      return NextResponse.json(
        { error: "URL de Mixcloud inválida. Formato esperado: https://www.mixcloud.com/username/" },
        { status: 400 }
      );
    }

    const username = match[1];
    let allEpisodes: any[] = [];
    let hasMore = true;
    let currentOffset = offset;
    let totalFetched = 0;

    console.log(`🔍 Obteniendo episodios para: ${username}`);
    console.log(`📄 Modo: ${loadAll ? 'Todos los episodios' : 'Paginado'}, Offset: ${offset}, Limit: ${limit}`);

    if (loadAll) {
      // Cargar TODOS los episodios (puede tardar)
      while (hasMore && totalFetched < 1000) { // Límite de seguridad
        const mixcloudApiUrl = `https://api.mixcloud.com/${username}/cloudcasts/?offset=${currentOffset}&limit=50`;
        
        console.log(`📡 Fetching: ${mixcloudApiUrl}`);
        
        const response = await fetch(mixcloudApiUrl, {
          headers: {
            'User-Agent': 'MixcloudScraper/1.0',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return NextResponse.json(
              { error: "Usuario no encontrado en Mixcloud" },
              { status: 404 }
            );
          }
          throw new Error(`Error de Mixcloud API: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
          allEpisodes.push(...data.data);
          totalFetched += data.data.length;
          currentOffset += data.data.length;
          hasMore = data.paging && data.paging.next;
          
          console.log(`📊 Obtenidos: ${data.data.length}, Total: ${totalFetched}`);
        } else {
          hasMore = false;
        }

        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } else {
      // Cargar una página específica
      const mixcloudApiUrl = `https://api.mixcloud.com/${username}/cloudcasts/?offset=${offset}&limit=${limit}`;
      
      const response = await fetch(mixcloudApiUrl, {
        headers: {
          'User-Agent': 'MixcloudScraper/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            { error: "Usuario no encontrado en Mixcloud" },
            { status: 404 }
          );
        }
        throw new Error(`Error de Mixcloud API: ${response.status}`);
      }

      const data = await response.json();
      allEpisodes = data.data || [];
      hasMore = data.paging && data.paging.next;
    }

    // Transformar los datos para el frontend
    const episodes = allEpisodes.map((episode: any) => ({
      key: episode.key,
      name: episode.name,
      url: episode.url,
      user: {
        name: episode.user.name,
        username: episode.user.username,
      },
      created_time: episode.created_time,
      audio_length: episode.audio_length,
      play_count: episode.play_count,
      favorite_count: episode.favorite_count,
      comment_count: episode.comment_count,
      pictures: {
        medium: episode.pictures.medium,
      },
    }));

    return NextResponse.json({
      success: true,
      episodes,
      total: episodes.length,
      user: username,
    });

  } catch (error) {
    console.error("Error en API de Mixcloud:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Error interno del servidor" 
      },
      { status: 500 }
    );
  }
}
