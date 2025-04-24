"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Market } from "@/lib/polymarket-api";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface EventHeaderProps {
  market: Market;
}

export function EventHeader({ market }: EventHeaderProps) {
  // Format the end date
  const formattedEndDate = market.endDate
    ? `Ends ${formatDistanceToNow(new Date(market.endDate), { addSuffix: true })}`
    : "No end date";

  return (
    <Card className="mb-4">
      <CardHeader className="pb-0">
        <div className="flex gap-4 items-start">
          {market.imageUrl && (
            <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-md">
              <Image
                src={market.imageUrl}
                alt={market.question}
                fill
                sizes="(max-width: 768px) 100px, 128px"
                style={{ objectFit: "cover" }}
                priority={false}
                className="transition-transform duration-300 hover:scale-105"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-1">
              <CardTitle className="text-lg line-clamp-2">{market.question}</CardTitle>
            </div>
            <CardDescription className="text-gray-500 dark:text-gray-400">{formattedEndDate}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
} 