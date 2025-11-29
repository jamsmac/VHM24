import React from 'react';
import { Link, useLocation } from 'wouter';
import { Star, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useFavorites } from '@/hooks/useFavorites';

interface FavoritesSectionProps {
  isCollapsed: boolean;
}

export function FavoritesSection({ isCollapsed }: FavoritesSectionProps) {
  const [location] = useLocation();
  const { favorites, toggleFavorite } = useFavorites();

  if (favorites.length === 0) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="px-2 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-full h-12 text-yellow-400 hover:bg-slate-800"
            >
              <Star size={20} fill="currentColor" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Favorites</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Star size={14} fill="currentColor" className="text-yellow-400" />
          <span>Favorites</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-slate-200"
        >
          <Edit size={14} />
        </Button>
      </div>
      <div className="space-y-1">
        {favorites.map((fav) => {
          const isActive = location === fav.href;
          return (
            <Link key={fav.href} href={fav.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 px-4 py-2 h-auto',
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-slate-300 hover:bg-slate-800'
                )}
              >
                <span className="text-lg">{fav.icon}</span>
                <span className="text-sm flex-1 text-left">{fav.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
