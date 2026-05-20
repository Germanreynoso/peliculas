import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'search';
  const type = searchParams.get('type') || 'movies';
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';

  const TMDB_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_KEY) {
    return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 });
  }

  let url = '';
  if (mode === 'search') {
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }
    const endpoint = type === 'movies' ? 'search/movie' : 'search/tv';
    url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&language=es-ES&page=${page}`;
  } else if (mode === 'details') {
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }
    if (type === 'movies') {
      url = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=es-ES`;
    } else {
      url = `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_KEY}&language=es-ES&append_to_response=external_ids`;
    }
  } else {
    // Mode is trending/now_playing
    if (type === 'movies') {
      url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${TMDB_KEY}&language=es-ES&page=${page}`;
    } else {
      url = `https://api.themoviedb.org/3/tv/on_the_air?api_key=${TMDB_KEY}&language=es-ES&page=${page}`;
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch from TMDB');
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in TMDB proxy API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
