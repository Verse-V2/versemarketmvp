'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { toAmericanOdds, formatDate, formatVolume } from '@/utils';

// Interface for related event data
interface RelatedEvent {
  id: string;
  slug: string;
  title: string;
  image: string;
  probability?: number;
  endDate?: string;
  volume?: string;
}

interface RelatedEventsProps {
  events: RelatedEvent[];
  loading: boolean;
  title?: string;
}

export function RelatedEvents({ 
  events, 
  loading, 
  title = "Related Events" 
}: RelatedEventsProps) {
  const renderLoadingState = () => (
    <div className="space-y-4" data-testid="loading-skeleton">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <p className="text-gray-500 dark:text-gray-400" data-testid="empty-state">
      No related events found.
    </p>
  );

  const renderEventCard = (relEvent: RelatedEvent) => (
    <div 
      key={relEvent.id} 
      className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
      data-testid="event-card"
    >
      <Link href={`/events/${relEvent.id}`} className="block">
        <div className="flex p-4 gap-4">
          {relEvent.image && (
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={relEvent.image}
                alt={relEvent.title}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          )}
          
          <div className="flex-1">
            <p className="font-semibold text-sm line-clamp-2">{relEvent.title}</p>
            <div className="flex justify-between items-center mt-1">
              {relEvent.probability !== undefined ? (
                <>
                  <div className="text-xs text-gray-500">
                    {(relEvent.probability * 100).toFixed(1)}% Yes
                  </div>
                  <div className="text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-0.5 rounded-full">
                    {toAmericanOdds(relEvent.probability)}
                  </div>
                </>
              ) : relEvent.endDate && relEvent.volume ? (
                <>
                  <div className="text-xs text-gray-500">
                    {formatDate(relEvent.endDate)}
                  </div>
                  <div className="text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 px-2 py-0.5 rounded-full">
                    {formatVolume(relEvent.volume)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500">Related market</div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );

  const renderContent = () => {
    if (loading) {
      return renderLoadingState();
    }

    if (events.length === 0) {
      return renderEmptyState();
    }

    return (
      <div className="space-y-4" data-testid="events-list">
        {events.map(renderEventCard)}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-0 px-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-1">
        {renderContent()}
      </CardContent>
    </Card>
  );
} 