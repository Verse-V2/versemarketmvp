'use client';

import { memo, useRef, useLayoutEffect } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';

const safeImage = (url?: string | null) =>
  !url ||
  (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))
    ? '/league-logos/generic-league-logo.svg'
    : url;

interface LeagueDetails {
  id: string;
  name: string;
  type: string;
  sport: string;
  logoUrl?: string;
  description?: string;
  teamsCount?: number;
  syncedTeams?: number;
  lastSynced?: string;
}

interface CarouselProps {
  leagues: LeagueDetails[];
  currentId?: string;
  onSelect: (l: LeagueDetails) => void;
}

export const Carousel = memo(({ leagues, currentId, onSelect }: CarouselProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const savedPos = useRef(0);         // ← remembers scrollLeft across renders
  const drag = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);

  /* ───── Preserve scrollLeft ───── */
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollLeft = savedPos.current;
  });

  const beginDrag = (clientX: number) => {
    drag.current = true;
    if (!ref.current) return;
    ref.current.style.cursor = 'grabbing';
    startScroll.current = ref.current.scrollLeft;
    startX.current = clientX;
  };

  const moveDrag = (clientX: number) => {
    if (!drag.current || !ref.current) return;
    ref.current.scrollLeft = startScroll.current - (clientX - startX.current);
  };

  const stopDrag = () => {
    drag.current = false;
    if (ref.current) ref.current.style.cursor = 'grab';
  };

  /* ---------- handlers ------------ */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => beginDrag(e.clientX);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => moveDrag(e.clientX);
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => beginDrag(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => moveDrag(e.touches[0].clientX);

  /* Save scrollLeft *just before* we call onSelect */
  const clickTile = (l: LeagueDetails) => {
    if (ref.current) savedPos.current = ref.current.scrollLeft;
    onSelect(l);
  };

  return (
    <div className="px-2 sm:px-4 mb-4 overflow-hidden">
      <div
        ref={ref}
        className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDrag}
      >
        {leagues.map((l) => (
          <button
            key={l.id}
            onClick={() => clickTile(l)}
            className={`relative min-w-56 sm:min-w-64 p-2 rounded-lg transition-colors ${
              currentId === l.id ? 'bg-zinc-800' : 'bg-zinc-900 hover:bg-zinc-800'
            }`}
          >
            {/* active indicator */}
            {currentId === l.id && (
              <span className="absolute left-0 top-0 h-full w-1.5 bg-green-500 rounded-r-lg" />
            )}

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative size-8 sm:size-10 bg-black rounded-full overflow-hidden flex items-center justify-center">
                <Image
                  src={safeImage(l.logoUrl)}
                  alt={l.name}
                  fill
                  className="object-cover p-1"
                  style={{ borderRadius: '50%' }}
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm sm:text-base truncate max-w-32 sm:max-w-40">
                  {l.name}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate max-w-32 sm:max-w-40">
                  {l.syncedTeams}/{l.teamsCount} Teams • {l.type}
                </p>
              </div>
            </div>
          </button>
        ))}

        {/* "Add League" tile */}
        <button className="min-w-36 sm:min-w-48 bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 text-green-500 border border-dashed border-zinc-700 text-sm sm:text-base">
          <Plus size={16} className="sm:size-[18px]" />
          <span>Add League</span>
        </button>
      </div>
    </div>
  );
});

Carousel.displayName = 'Carousel'; 