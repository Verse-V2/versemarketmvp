'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Interface for market price history
interface MarketPriceHistory {
  id: string;
  name: string;
  data: { t: number; p: number }[];
}

interface PriceHistoryChartProps {
  priceHistories: MarketPriceHistory[];
  loading: boolean;
  isRateLimited: boolean;
  selectedTimeFrame: string;
  onTimeFrameChange: (timeFrame: string) => void;
}

const timeFrameOptions = [
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
  { label: '1m', value: '1m' },
  { label: 'All', value: 'max' }
];

const chartColors = [
  "#0BC700", // green for main market
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444"  // red
];

export function PriceHistoryChart({
  priceHistories,
  loading,
  isRateLimited,
  selectedTimeFrame,
  onTimeFrameChange
}: PriceHistoryChartProps) {
  // Create merged dataset for the chart
  const chartData = priceHistories.length > 0 && priceHistories[0].data.length > 0
    ? priceHistories[0].data.map((point, idx) => {
        const timePoint: Record<string, number> = { time: point.t * 1000 };
        
        // Add each market's price at this timestamp
        priceHistories.forEach((market, marketIdx) => {
          const marketData = market.data[idx];
          if (marketData) {
            timePoint[`market${marketIdx}`] = marketData.p * 100;
          }
        });
        
        return timePoint;
      })
    : [];

  const renderChart = () => {
    if (loading) {
      return (
        <div data-testid="loading" className="h-[300px] w-full bg-gray-900 dark:bg-gray-950 animate-pulse rounded-lg"></div>
      );
    }

    if (isRateLimited) {
      return (
        <div className="h-[300px] w-full bg-gray-900 dark:bg-gray-950 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-400 mb-2">Rate limit exceeded</p>
            <p className="text-sm text-gray-500">Please try again in a few minutes</p>
          </div>
        </div>
      );
    }

    if (priceHistories.length === 0 || chartData.length === 0) {
      return (
        <div className="h-[300px] w-full bg-gray-900 dark:bg-gray-950 rounded-lg flex items-center justify-center">
          <p className="text-gray-400">No price history available</p>
        </div>
      );
    }

    return (
      <div className="h-[300px] w-full px-1 pb-4 relative">
        {/* Legend */}
        <div className="mb-4 pt-0 flex flex-wrap gap-x-4 gap-y-2 justify-end text-xs">
          {priceHistories.map((market, idx) => (
            <div key={market.id} className="flex items-center">
              <div 
                className="w-3 h-3 mr-1 rounded-full" 
                style={{ backgroundColor: chartColors[idx] }}
              />
              <span className="text-gray-200">{market.name}</span>
            </div>
          ))}
        </div>
        
        <ResponsiveContainer width="100%" height="85%" style={{ marginLeft: '-10px' }}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.5} />
            <XAxis 
              dataKey="time" 
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
              }}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tickFormatter={(value) => `${value}%`}
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                // Extract market index from the dataKey (e.g., "market0" -> 0)
                const marketIndex = parseInt(name.replace('market', ''));
                // Get the market name from our data
                const marketName = priceHistories[marketIndex]?.name || 'Unknown';
                // Return formatted value and name
                return [`${value.toFixed(2)}%`, marketName];
              }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
              contentStyle={{ 
                backgroundColor: '#111827', 
                borderColor: '#374151',
                color: '#f9fafb',
                fontSize: '12px',
                borderRadius: '4px'
              }}
              itemStyle={{ color: '#f9fafb' }}
            />
            
            {/* Lines for each market */}
            <Line 
              type="monotone" 
              dataKey="market0" 
              name="market0"
              stroke={chartColors[0]} 
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: chartColors[0], stroke: "#064e3b" }}
              isAnimationActive={true}
            />
            
            {/* Lines for additional markets */}
            {priceHistories.slice(1).map((market, index) => {
              const strokeColor = chartColors[index + 1];
              
              return (
                <Line 
                  key={market.id}
                  type="monotone" 
                  dataKey={`market${index + 1}`}
                  name={`market${index + 1}`}
                  stroke={strokeColor}
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 4, fill: strokeColor }}
                  isAnimationActive={true}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-2">
        {renderChart()}
        
        {/* Time frame toggles */}
        <div className="flex justify-center px-1">
          <div className="flex space-x-1">
            {timeFrameOptions.map((timeFrame) => (
              <button
                key={timeFrame.value}
                onClick={() => onTimeFrameChange(timeFrame.value)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  selectedTimeFrame === timeFrame.value
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {timeFrame.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 