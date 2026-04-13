import { NextResponse } from 'next/server';
import { fetchRawgGameDetails, fetchRawgGames } from '@/lib/rawg';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    try {
      const game = await fetchRawgGameDetails(id);
      return NextResponse.json(game);
    } catch {
      return NextResponse.json({ error: 'Unable to load game details.' }, { status: 500 });
    }
  }

  const params = new URLSearchParams();
  const search = url.searchParams.get('search');
  const ordering = url.searchParams.get('ordering');
  const pageSize = url.searchParams.get('page_size');

  params.set('page_size', pageSize ?? '8');
  params.set('ordering', ordering ?? '-rating');

  if (search) {
    params.set('search', search);
  }

  try {
    const games = await fetchRawgGames(params.toString());
    return NextResponse.json({ results: games });
  } catch {
    return NextResponse.json({ error: 'Unable to load games.' }, { status: 500 });
  }
}