import { useState, useEffect } from 'react';

export interface Favorite {
  label: string;
  href: string;
  icon: string;
}

const FAVORITES_KEY = 'vendhub_favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (favorite: Favorite) => {
    setFavorites((prev) => {
      // Don't add duplicates
      if (prev.some((f) => f.href === favorite.href)) {
        return prev;
      }
      return [...prev, favorite];
    });
  };

  const removeFavorite = (href: string) => {
    setFavorites((prev) => prev.filter((f) => f.href !== href));
  };

  const toggleFavorite = (favorite: Favorite) => {
    const exists = favorites.some((f) => f.href === favorite.href);
    if (exists) {
      removeFavorite(favorite.href);
    } else {
      addFavorite(favorite);
    }
  };

  const isFavorite = (href: string) => {
    return favorites.some((f) => f.href === href);
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
  };
}
