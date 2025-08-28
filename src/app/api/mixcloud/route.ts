import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

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

    // Consultar la API de Mixcloud
    const mixcloudApiUrl = `https://api.mixcloud.com/${username}/cloudcasts/`;
    
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

    // Transformar los datos para el frontend
    const episodes = data.data.map((episode: any) => ({
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
