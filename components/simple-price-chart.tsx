'use client';

import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';

// Sample data for Yes/No lines
const SAMPLE_PRICE_DATA = [
  { date: new Date('2023-01-01').getTime(), yes: 0.35, no: 0.65, option1: 0.15, option2: 0.55, option3: 0.28, option4: 0.42 },
  { date: new Date('2023-01-10').getTime(), yes: 0.42, no: 0.58, option1: 0.22, option2: 0.47, option3: 0.19, option4: 0.38 },
  { date: new Date('2023-01-20').getTime(), yes: 0.39, no: 0.61, option1: 0.28, option2: 0.41, option3: 0.24, option4: 0.31 },
  { date: new Date('2023-02-01').getTime(), yes: 0.48, no: 0.52, option1: 0.32, option2: 0.36, option3: 0.29, option4: 0.25 },
  { date: new Date('2023-02-10').getTime(), yes: 0.45, no: 0.55, option1: 0.25, option2: 0.44, option3: 0.33, option4: 0.36 },
  { date: new Date('2023-02-20').getTime(), yes: 0.53, no: 0.47, option1: 0.35, option2: 0.51, option3: 0.27, option4: 0.42 },
  { date: new Date('2023-03-01').getTime(), yes: 0.47, no: 0.53, option1: 0.42, option2: 0.39, option3: 0.20, option4: 0.48 },
  { date: new Date('2023-03-10').getTime(), yes: 0.60, no: 0.40, option1: 0.38, option2: 0.45, option3: 0.15, option4: 0.52 },
  { date: new Date('2023-03-20').getTime(), yes: 0.55, no: 0.45, option1: 0.42, option2: 0.38, option3: 0.21, option4: 0.44 },
  { date: new Date('2023-04-01').getTime(), yes: 0.65, no: 0.35, option1: 0.48, option2: 0.32, option3: 0.35, option4: 0.40 },
  { date: new Date('2023-04-10').getTime(), yes: 0.58, no: 0.42, option1: 0.53, option2: 0.28, option3: 0.42, option4: 0.32 },
  { date: new Date('2023-04-20').getTime(), yes: 0.72, no: 0.28, option1: 0.45, option2: 0.25, option3: 0.38, option4: 0.27 },
  { date: new Date('2023-05-01').getTime(), yes: 0.68, no: 0.32, option1: 0.52, option2: 0.32, option3: 0.45, option4: 0.23 },
  { date: new Date('2023-05-10').getTime(), yes: 0.75, no: 0.25, option1: 0.59, option2: 0.41, option3: 0.38, option4: 0.28 },
  { date: new Date('2023-05-20').getTime(), yes: 0.69, no: 0.31, option1: 0.63, option2: 0.47, option3: 0.33, option4: 0.35 },
  { date: new Date('2023-06-01').getTime(), yes: 0.82, no: 0.18, option1: 0.57, option2: 0.51, option3: 0.28, option4: 0.41 },
];

interface SimplePriceChartProps {
  marketId?: string; // This is intentionally unused for now, will be used for fetching real data later
  hasMultipleMarkets?: boolean;
  topSubmarkets?: Array<{
    id: string;
    question: string;
    probability: number;
    groupItemTitle?: string;
  }>;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    color?: string;
  }>;
  label?: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700 shadow-md">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {format(new Date(label || 0), 'MMM d, yyyy')}
        </p>
        {payload.map((entry, index) => (
          <p key={index} className="font-medium mb-1">
            {entry.name}: <span style={{ color: entry.color }}>{(entry.value * 100).toFixed(1)}%</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Colors for the additional lines
const LINE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#f97316'];
const LINE_NAMES = ['Yes', 'No', 'Option 1', 'Option 2', 'Option 3', 'Option 4'];

// SimplePriceChart component that displays either 2 lines (Yes/No) or up to 4 lines for submarkets
const SimplePriceChart: React.FC<SimplePriceChartProps> = ({ 
  hasMultipleMarkets = false, 
  topSubmarkets = []
  // marketId is intentionally not destructured as it will be used in future implementation
}) => {
  const renderLines = () => {
    if (hasMultipleMarkets && topSubmarkets && topSubmarkets.length > 0) {
      // For multiple markets, render one line per top submarket (up to 4)
      return topSubmarkets.slice(0, 4).map((market, index) => {
        const dataKey = `option${index + 1}`;
        const name = market.groupItemTitle || market.question.substring(0, 15) || LINE_NAMES[index + 2];
        
        return (
          <Line 
            key={market.id}
            type="monotone" 
            dataKey={dataKey} 
            stroke={LINE_COLORS[index + 2]} 
            strokeWidth={2}
            dot={false}
            name={name}
          />
        );
      });
    } else {
      // Default Yes/No lines for single markets
      return (
        <>
          <Line 
            type="monotone" 
            dataKey="yes" 
            stroke={LINE_COLORS[0]} 
            strokeWidth={2}
            dot={false}
            name="Yes"
          />
          <Line 
            type="monotone" 
            dataKey="no" 
            stroke={LINE_COLORS[1]} 
            strokeWidth={2}
            dot={false}
            name="No"
          />
        </>
      );
    }
  };

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={SAMPLE_PRICE_DATA}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 30,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#33333333" />
          <XAxis 
            dataKey="date" 
            scale="time" 
            type="number" 
            domain={['auto', 'auto']}
            tickFormatter={(unixTime) => format(new Date(unixTime), 'MMM d')}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 1]} 
            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            align="center" 
            verticalAlign="top" 
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          {renderLines()}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimplePriceChart; 