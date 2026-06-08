// Built by vsrupeshkumar
"use client";

import React, { useEffect, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Loader2 } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="neural-card px-4 py-3 border-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="label-xs text-white/40 mb-1">{label}</div>
        <div className="text-sm font-semibold text-white tabular-nums">
          {payload[0].value.toLocaleString()} <span className="text-[10px] text-accent-cyan ml-1">PUSD</span>
        </div>
      </div>
    );
  }
  return null;
};

export const TreasuryChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/treasury/history');
        const json = await res.json();
        // Ensure data is sorted by time if possible, or mapping labels properly
        setData(json);
      } catch (err) {
        console.error('Failed to load chart data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00e5cc" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="rgba(255,255,255,0.03)" 
          />
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 500 }}
            dy={15}
            padding={{ left: 20, right: 20 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 500 }}
            dx={-10}
            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255, 255, 255, 0.08)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#00e5cc"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#chartGradient)"
            animationDuration={1500}
            activeDot={{ 
              r: 5, 
              fill: '#00e5cc', 
              stroke: '#ffffff', 
              strokeWidth: 2,
              filter: 'drop-shadow(0 0 8px rgba(0,229,204,0.8))'
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
