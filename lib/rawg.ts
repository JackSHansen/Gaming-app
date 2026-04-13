const RAWG_BASE_URL = 'https://api.rawg.io/api';
const RAWG_API_KEY = 'c7bc67596b634837a361aa095fbdfd2d';

export type RawgGenre = {
  id: number;
  name: string;
};

export type RawgGame = {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  rating: number;
  ratings_count: number;
  metacritic: number | null;
  description_raw?: string;
  genres: RawgGenre[];
  short_screenshots?: Array<{ id: number; image: string }>;
};

type RawgListResponse = {
  results: RawgGame[];
};

export async function fetchRawgGames(query: string): Promise<RawgGame[]> {
  const response = await fetch(`${RAWG_BASE_URL}/games?${query}&key=${RAWG_API_KEY}`, {
    next: { revalidate: 120 }
  });

  if (!response.ok) {
    throw new Error('Could not load games from RAWG.');
  }

  const data = (await response.json()) as RawgListResponse;
  return data.results ?? [];
}

export async function fetchRawgGameDetails(id: string): Promise<RawgGame> {
  const response = await fetch(`${RAWG_BASE_URL}/games/${id}?key=${RAWG_API_KEY}`, {
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error('Could not load game details from RAWG.');
  }

  return (await response.json()) as RawgGame;
}