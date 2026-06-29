import { NextResponse } from 'next/server';
import { getAnimeTrending, searchAnime, mapAnime } from '@/app/_lib/anime';

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'trending';
  const page = parseInt(searchParams.get('page') || '1', 10);

  try {
    if (mode === 'search') {
      const q = searchParams.get('q');
      if (!q) return NextResponse.json({ error: 'q is required' }, { status: 400 });
      const items = await searchAnime(q, page);
      return NextResponse.json({ items });
    }

    if (mode === 'map') {
      const anilistId = parseInt(searchParams.get('anilistId') || '', 10);
      if (!anilistId) return NextResponse.json({ error: 'anilistId is required' }, { status: 400 });
      const mapping = await mapAnime(anilistId);
      return NextResponse.json(mapping);
    }

    // trending (default)
    const items = await getAnimeTrending(page);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in anime API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
