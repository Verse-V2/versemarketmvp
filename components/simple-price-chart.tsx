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
  { date: new Date('2023-01-01').getTime(), yes: 0.35, no: 0.65 },
  { date: new Date('2023-01-15').getTime(), yes: 0.42, no: 0.58 },
  { date: new Date('2023-02-01').getTime(), yes: 0.48, no: 0.52 },
  { date: new Date('2023-02-15').getTime(), yes: 0.53, no: 0.47 },
  { date: new Date('2023-03-01').getTime(), yes: 0.60, no: 0.40 },
  { date: new Date('2023-03-15').getTime(), yes: 0.65, no: 0.35 },
  { date: new Date('2023-04-01').getTime(), yes: 0.72, no: 0.28 },
  { date: new Date('2023-04-15').getTime(), yes: 0.68, no: 0.32 },
  { date: new Date('2023-05-01').getTime(), yes: 0.75, no: 0.25 },
  { date: new Date('2023-05-15').getTime(), yes: 0.82, no: 0.18 },
];

interface SimplePriceChartProps {
  marketId?: string; // This is intentionally unused for now, will be used for fetching real data later
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
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
        <p className="font-medium mb-1">
          Yes: <span className="text-blue-500">{(payload[0].value * 100).toFixed(1)}%</span>
        </p>
        <p className="font-medium">
          No: <span className="text-red-500">{(payload[1].value * 100).toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

// We're declaring marketId as an unused parameter as it will be used in future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SimplePriceChart: React.FC<SimplePriceChartProps> = ({ marketId }) => {
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
          <Line 
            type="monotone" 
            dataKey="yes" 
            stroke="#2563eb" 
            strokeWidth={2}
            dot={false}
            name="Yes"
          />
          <Line 
            type="monotone" 
            dataKey="no" 
            stroke="#dc2626" 
            strokeWidth={2}
            dot={false}
            name="No"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimplePriceChart; 