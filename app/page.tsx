'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './page.module.scss';
import type { RawgGame } from '@/lib/rawg';
import type { KeyboardEvent } from 'react';

type GenreTile = {
  name: string;
  count: number;
  className: string;
};

const genreOptions = ['All Games', 'Action', 'Adventure', 'RPG', 'Shooter', 'Strategy', 'Sports'] as const;

const apiListUrl = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params);
  return `/api/games?${searchParams.toString()}`;
};

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function getYear(released: string | null) {
  if (!released) {
    return 'TBA';
  }

  return new Date(released).getFullYear().toString();
}

function getPrimaryGenre(game: RawgGame) {
  return game.genres[0]?.name ?? 'Mixed';
}

function filterByGenre(games: RawgGame[], genre: string) {
  if (genre === 'All Games') {
    return games;
  }

  return games.filter((game) =>
    game.genres.some((entry) => entry.name.toLowerCase() === genre.toLowerCase())
  );
}

function normalizeDescription(game: RawgGame | null) {
  const description = game?.description_raw?.trim();

  if (description) {
    return description;
  }

  return 'Tap et spil fra listen for at se mere information, finde favoritter og udforske genrer.';
}

function StarIcon() {
  return <span aria-hidden>★</span>;
}

export default function HomePage() {
  const [featuredGames, setFeaturedGames] = useState<RawgGame[]>([]);
  const [popularGames, setPopularGames] = useState<RawgGame[]>([]);
  const [searchResults, setSearchResults] = useState<RawgGame[]>([]);
  const [selectedGame, setSelectedGame] = useState<RawgGame | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGenre, setActiveGenre] = useState<(typeof genreOptions)[number]>('All Games');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedFavorites = window.localStorage.getItem('gamefinder:favorites');

    if (storedFavorites) {
      try {
        const parsed = JSON.parse(storedFavorites) as number[];
        setFavorites(Array.isArray(parsed) ? parsed : []);
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        const [featuredResponse, popularResponse] = await Promise.all([
          fetch(apiListUrl({ ordering: '-added', page_size: '4' })),
          fetch(apiListUrl({ ordering: '-rating', page_size: '8' }))
        ]);

        if (!featuredResponse.ok || !popularResponse.ok) {
          throw new Error('Kunne ikke hente spildata.');
        }

        const featuredData = (await featuredResponse.json()) as { results: RawgGame[] };
        const popularData = (await popularResponse.json()) as { results: RawgGame[] };

        setFeaturedGames(featuredData.results ?? []);
        setPopularGames(popularData.results ?? []);
        setSelectedGame(popularData.results?.[0] ?? featuredData.results?.[0] ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Noget gik galt.');
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const query = searchTerm.trim();

      if (!query) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      try {
        setSearching(true);

        const response = await fetch(apiListUrl({ search: query, ordering: '-rating', page_size: '8' }));

        if (!response.ok) {
          throw new Error('Søgningen mislykkedes.');
        }

        const data = (await response.json()) as { results: RawgGame[] };
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const loadSelectedDetails = async () => {
      if (!selectedGame || selectedGame.description_raw) {
        return;
      }

      try {
        setDetailsLoading(true);
        const response = await fetch(`/api/games?id=${selectedGame.id}`);

        if (!response.ok) {
          throw new Error('Kunne ikke hente spillets detaljer.');
        }

        const game = (await response.json()) as RawgGame;
        setSelectedGame(game);
      } catch {
        setSelectedGame((current) => current);
      } finally {
        setDetailsLoading(false);
      }
    };

    void loadSelectedDetails();
  }, [selectedGame]);

  const visibleFeaturedGames = filterByGenre(featuredGames, activeGenre);
  const visiblePopularGames = filterByGenre(popularGames, activeGenre);
  const visibleSearchResults = filterByGenre(searchResults, activeGenre);

  const genreTiles = Object.entries(
    [...featuredGames, ...popularGames].reduce<Record<string, number>>((counts, game) => {
      game.genres.forEach((genre) => {
        counts[genre.name] = (counts[genre.name] ?? 0) + 1;
      });

      return counts;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map<GenreTile>(([name, count]) => {
      const classMap: Record<string, string> = {
        Action: styles.genreAction,
        RPG: styles.genreRpg,
        Adventure: styles.genreAdventure,
        Strategy: styles.genreStrategy
      };

      return {
        name,
        count,
        className: classMap[name] ?? styles.genreStrategy
      };
    });

  const displayedSearchTitle = searchTerm.trim() ? 'Search Results' : 'Popular Games';

  const toggleFavorite = (gameId: number) => {
    setFavorites((current) => {
      const nextFavorites = current.includes(gameId)
        ? current.filter((id) => id !== gameId)
        : [...current, gameId];

      window.localStorage.setItem('gamefinder:favorites', JSON.stringify(nextFavorites));
      return nextFavorites;
    });
  };

  const openGame = async (game: RawgGame) => {
    setSelectedGame(game);

    if (game.description_raw) {
      return;
    }

    try {
      setDetailsLoading(true);
      const response = await fetch(`/api/games?id=${game.id}`);

      if (!response.ok) {
        throw new Error('Kunne ikke hente spillets detaljer.');
      }

      const details = (await response.json()) as RawgGame;
      setSelectedGame(details);
    } catch {
      setSelectedGame(game);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>, game: RawgGame) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openGame(game);
    }
  };

  return (
    <main className={styles.screen}>
      <div className={styles.appShell}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <div className={styles.brandMark} aria-hidden>
              <StarIcon />
            </div>
            <span>GameFinder</span>
          </div>

          <div className={styles.topActions}>
            <button className={styles.iconButton} type="button" aria-label="Search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M11 19a8 8 0 1 1 5.29-14.03A8 8 0 0 1 11 19Zm10 2-6-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <button className={styles.iconButton} type="button" aria-label="Favorites">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20.42 4.58a5.6 5.6 0 0 0-7.92 0L12 5.08l-.5-.5a5.6 5.6 0 1 0-7.92 7.92l.5.5L12 21l7.92-8.5.5-.5a5.6 5.6 0 0 0 0-7.92Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.hero}>
            <h1 className={styles.heroTitle}>Discover Amazing Games</h1>
            <p className={styles.heroText}>
              Find your next favorite game from RAWG, search dynamically, and keep your shortlist
              close with local favorites.
            </p>
          </section>

          <label className={styles.searchField}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M11 19a8 8 0 1 1 5.29-14.03A8 8 0 0 1 11 19Zm10 2-6-6"
                stroke="rgba(148, 163, 191, 0.95)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search for games..."
              aria-label="Search for games"
            />
          </label>

          <div className={styles.chipRow} aria-label="Genres">
            {genreOptions.map((genre) => (
              <button
                key={genre}
                type="button"
                className={`${styles.chip} ${activeGenre === genre ? styles.chipActive : ''}`}
                onClick={() => setActiveGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>

          {error ? <div className={styles.errorState}>{error}</div> : null}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Featured Games</h2>
              <span className={styles.sectionLink}>Handpicked</span>
            </div>

            {loading ? (
              <div className={styles.rail} aria-busy="true">
                <div className={styles.skeleton} />
                <div className={styles.skeleton} />
              </div>
            ) : (
              <div className={styles.rail}>
                {visibleFeaturedGames.map((game) => (
                  <article key={game.id} className={styles.featureCard}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={styles.cardSurface}
                      onClick={() => openGame(game)}
                      onKeyDown={(event) => handleCardKeyDown(event, game)}
                    >
                      <div className={styles.featureMedia}>
                        {game.background_image ? (
                          <Image
                            src={game.background_image}
                            alt={game.name}
                            fill
                            sizes="(max-width: 430px) 85vw, 360px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : null}
                        <div className={styles.featureOverlay} />
                      </div>

                      <div className={styles.featureBody}>
                        <div className={styles.featureTop}>
                          <div>
                            <h3 className={styles.gameTitle}>{game.name}</h3>
                            <div className={styles.metaRow}>
                              <span className={styles.rating}>
                                <StarIcon />
                                {game.rating.toFixed(1)}
                              </span>
                              <span>{getYear(game.released)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`${styles.favoriteButton} ${
                              favorites.includes(game.id) ? styles.favoriteActive : ''
                            }`}
                            aria-label={favorites.includes(game.id) ? 'Remove favorite' : 'Add favorite'}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(game.id);
                            }}
                          >
                            ♥
                          </button>
                        </div>

                        <div className={styles.tagRow}>
                          {game.genres.slice(0, 2).map((genre) => (
                            <span key={genre.id} className={styles.tag}>
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{displayedSearchTitle}</h2>
              <span className={styles.sectionLink}>{searching ? 'Updating…' : 'Live feed'}</span>
            </div>

            {searchTerm.trim() && searching ? (
              <div className={styles.loadingGrid} aria-busy="true">
                <div className={styles.skeleton} />
                <div className={styles.skeleton} />
              </div>
            ) : (
              <div className={styles.listStack}>
                {(searchTerm.trim() ? visibleSearchResults : visiblePopularGames).map((game) => (
                  <article key={game.id} className={styles.listCard}>
                    <div
                      role="button"
                      tabIndex={0}
                      className={styles.cardSurface}
                      onClick={() => openGame(game)}
                      onKeyDown={(event) => handleCardKeyDown(event, game)}
                    >
                      <div className={styles.listMedia}>
                        {game.background_image ? (
                          <Image
                            src={game.background_image}
                            alt={game.name}
                            fill
                            sizes="(max-width: 430px) 100vw, 430px"
                            style={{ objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>

                      <div className={styles.listBody}>
                        <div className={styles.listTop}>
                          <div>
                            <h3 className={styles.listTitle}>{game.name}</h3>
                            <div className={styles.metaRow}>
                              <span className={styles.rating}>
                                <StarIcon />
                                {game.rating.toFixed(1)}
                              </span>
                              <span>{getYear(game.released)}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`${styles.favoriteButton} ${
                              favorites.includes(game.id) ? styles.favoriteActive : ''
                            }`}
                            aria-label={favorites.includes(game.id) ? 'Remove favorite' : 'Add favorite'}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(game.id);
                            }}
                          >
                            ♥
                          </button>
                        </div>

                        <p className={styles.summary}>{truncateText(normalizeDescription(game), 115)}</p>

                        <div className={styles.tagRow}>
                          {game.genres.slice(0, 3).map((genre) => (
                            <span key={genre.id} className={styles.tag}>
                              {genre.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {!searchTerm.trim() && visiblePopularGames.length === 0 ? (
                  <div className={styles.statusCard}>
                    <h3 className={styles.statusTitle}>No games to show</h3>
                    <p className={styles.statusText}>
                      Try another genre, or search for a specific title to refresh the list.
                    </p>
                  </div>
                ) : null}

                {searchTerm.trim() && !searching && visibleSearchResults.length === 0 ? (
                  <div className={styles.statusCard}>
                    <h3 className={styles.statusTitle}>No search results</h3>
                    <p className={styles.statusText}>
                      Try a different name or remove the genre filter to broaden the results.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Game Details</h2>
              <span className={styles.sectionLink}>{detailsLoading ? 'Loading…' : 'Tap a game'}</span>
            </div>

            <article className={styles.detailsCard}>
              <div className={styles.detailsHero}>
                {selectedGame?.background_image ? (
                  <Image
                    src={selectedGame.background_image}
                    alt={selectedGame.name}
                    fill
                    sizes="(max-width: 430px) 100vw, 430px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : null}
              </div>

              <div className={styles.detailsBody}>
                <div className={styles.detailTop}>
                  <div>
                    <h3 className={styles.gameTitle}>{selectedGame?.name ?? 'Select a game'}</h3>
                    <div className={styles.metaRow}>
                      <span className={styles.rating}>
                        <StarIcon />
                        {selectedGame ? selectedGame.rating.toFixed(1) : '0.0'}
                      </span>
                      <span>{selectedGame ? getYear(selectedGame.released) : 'TBA'}</span>
                    </div>
                  </div>

                  {selectedGame ? (
                    <button
                      type="button"
                      className={`${styles.favoriteButton} ${
                        favorites.includes(selectedGame.id) ? styles.favoriteActive : ''
                      }`}
                      aria-label={
                        favorites.includes(selectedGame.id) ? 'Remove favorite' : 'Add favorite'
                      }
                      onClick={() => toggleFavorite(selectedGame.id)}
                    >
                      ♥
                    </button>
                  ) : null}
                </div>

                <p className={styles.detailsDescription}>{normalizeDescription(selectedGame)}</p>

                <div className={styles.tagRow}>
                  {selectedGame?.genres.length
                    ? selectedGame.genres.slice(0, 4).map((genre) => (
                        <span key={genre.id} className={styles.tag}>
                          {genre.name}
                        </span>
                      ))
                    : null}
                </div>

                <div className={styles.detailsGrid}>
                  <div className={styles.detailStat}>
                    <span className={styles.statLabel}>Rating count</span>
                    <span className={styles.statValue}>{selectedGame?.ratings_count ?? 0}</span>
                  </div>
                  <div className={styles.detailStat}>
                    <span className={styles.statLabel}>Primary genre</span>
                    <span className={styles.statValue}>{selectedGame ? getPrimaryGenre(selectedGame) : 'None'}</span>
                  </div>
                </div>
              </div>
            </article>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Browse by Genre</h2>
              <span className={styles.sectionLink}>Quick picks</span>
            </div>

            <div className={styles.genreGrid}>
              {genreTiles.map((genre) => (
                <button
                  key={genre.name}
                  type="button"
                  className={`${styles.genreCard} ${genre.className}`}
                  onClick={() => setActiveGenre(genre.name as (typeof genreOptions)[number])}
                >
                  <strong>{genre.name}</strong>
                  <span>{genre.count.toLocaleString('da-DK')} games</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <nav className={styles.bottomNav} aria-label="Primary">
        <button className={`${styles.navItem} ${styles.navActive}`} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
          </svg>
          Home
        </button>
        <button className={styles.navItem} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M11 19a8 8 0 1 1 5.29-14.03A8 8 0 0 1 11 19Zm10 2-6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          Search
        </button>
        <button className={styles.navItem} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M20.42 4.58a5.6 5.6 0 0 0-7.92 0L12 5.08l-.5-.5a5.6 5.6 0 1 0-7.92 7.92l.5.5L12 21l7.92-8.5.5-.5a5.6 5.6 0 0 0 0-7.92Z" />
          </svg>
          Favorites
        </button>
        <button className={styles.navItem} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
          </svg>
          Profile
        </button>
      </nav>
    </main>
  );
}