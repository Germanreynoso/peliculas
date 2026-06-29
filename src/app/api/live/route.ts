import { NextResponse } from 'next/server';
import { getLiveCatalog } from '@/app/_lib/liveCatalog';

export const revalidate = 86400;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = (searchParams.get('source') || 'all') as 'iptv' | 'fast' | 'all';
  const country = searchParams.get('country');

  try {
    const channels = await getLiveCatalog({ source, country });
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error in live API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
