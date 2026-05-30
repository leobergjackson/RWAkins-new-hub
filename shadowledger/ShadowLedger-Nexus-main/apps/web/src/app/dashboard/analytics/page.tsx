// Built by vsrupeshkumar
'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { BarChart3, LineChart as LineChartIcon, TrendingUp, Filter } from 'lucide-react';

interface AnalyticsData {
  date: string;
  volume: number;
  transactions: number;
  uniqueAddresses: number;
}

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('volume');

  // Mock analytics data
  const analyticsData: AnalyticsData[] = [
    { date: '2026-05-06', volume: 125000, transactions: 45, uniqueAddresses: 23 },
    { date: '2026-05-07', volume: 156000, transactions: 52, uniqueAddresses: 28 },
    { date: '2026-05-08', volume: 198000, transactions: 71, uniqueAddresses: 35 },
    { date: '2026-05-09', volume: 142000, transactions: 48, uniqueAddresses: 26 },
    { date: '2026-05-10', volume: 231000, transactions: 84, uniqueAddresses: 42 },
    { date: '2026-05-11', volume: 187000, transactions: 63, uniqueAddresses: 31 },
    { date: '2026-05-12', volume: 245000, transactions: 92, uniqueAddresses: 48 },
  ];

  const totalVolume = analyticsData.reduce((sum, d) => sum + d.volume, 0);
  const totalTransactions = analyticsData.reduce((sum, d) => sum + d.transactions, 0);
  const avgUniqueAddresses = Math.round(
    analyticsData.reduce((sum, d) => sum + d.uniqueAddresses, 0) / analyticsData.length
  );

  const topMetrics = [
    {
      title: 'Total Volume',
      value: `$${(totalVolume / 1000000).toFixed(2)}M`,
      change: '+12.5%',
      icon: BarChart3,
      color: 'cyan-glow',
    },
    {
      title: 'Transactions',
      value: totalTransactions.toLocaleString(),
      change: '+8.2%',
      icon: LineChartIcon,
      color: 'purple-glow',
    },
    {
      title: 'Avg Active Addresses',
      value: avgUniqueAddresses.toLocaleString(),
      change: '+5.3%',
      icon: TrendingUp,
      color: 'emerald-glow',
    },
  ];

  const getMetricValue = (data: AnalyticsData) => {
    switch (selectedMetric) {
      case 'volume':
        return (data.volume / 1000).toFixed(0);
      case 'transactions':
        return data.transactions;
      case 'addresses':
        return data.uniqueAddresses;
      default:
        return 0;
    }
  };

  const maxValue = Math.max(
    ...analyticsData.map((d) => {
      switch (selectedMetric) {
        case 'volume':
          return d.volume;
        case 'transactions':
          return d.transactions;
        case 'addresses':
          return d.uniqueAddresses;
        default:
          return 0;
      }
    })
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-2">Analytics & Intelligence</h1>
        <p className="text-muted-foreground">
          Real-time financial metrics and operational intelligence
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {topMetrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div
              key={idx}
              className={`glass border border-${metric.color}/20 rounded-2xl p-6 neo-glow-${metric.color}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-muted-foreground text-sm">{metric.title}</p>
                  <p className={`text-3xl font-bold text-${metric.color} mt-1`}>{metric.value}</p>
                </div>
                <Icon size={24} className={`text-${metric.color}`} />
              </div>
              <p className="text-xs text-emerald-glow">{metric.change} vs last period</p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="glass border border-cyan-glow/20 rounded-2xl p-8 neo-glow-cyan mb-12">
        {/* Controls */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-cyan-glow" />
            Financial Analytics
          </h2>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {['7d', '30d', '90d', '1y'].map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    timeframe === tf
                      ? 'bg-cyan-glow text-black font-semibold'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex gap-2 ml-4">
              {['volume', 'transactions', 'addresses'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1 text-sm rounded transition-all ${
                    selectedMetric === metric
                      ? 'bg-purple-glow/30 text-purple-glow'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-graphite/50 rounded-xl p-8 border border-white/5">
          <div className="h-64 flex items-end justify-around gap-2">
            {analyticsData.map((data, idx) => {
              const value = parseFloat(getMetricValue(data));
              const height = (value / maxValue) * 100;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1">
                  <div className="relative w-full group">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-glow to-purple-glow rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                      style={{ height: `${height}%` }}
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-t-lg flex items-center justify-center">
                        <span className="text-xs text-white font-bold">{getMetricValue(data)}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(data.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart Legend */}
        <div className="mt-6 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-cyan-glow rounded" />
            <span>Primary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-glow rounded" />
            <span>Secondary</span>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Treasury Health */}
        <div className="glass border border-emerald-glow/20 rounded-2xl p-6 neo-glow-emerald">
          <h3 className="text-lg font-bold mb-4 text-emerald-glow">Treasury Health</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Runway</span>
                <span className="text-emerald-glow font-semibold">14.2 months</span>
              </div>
              <div className="w-full bg-graphite/50 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-glow to-cyan-glow" style={{ width: '85%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Efficiency</span>
                <span className="text-emerald-glow font-semibold">97.3%</span>
              </div>
              <div className="w-full bg-graphite/50 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-glow to-cyan-glow" style={{ width: '97%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Privacy Score</span>
                <span className="text-emerald-glow font-semibold">99.8%</span>
              </div>
              <div className="w-full bg-graphite/50 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-glow to-cyan-glow" style={{ width: '99%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="glass border border-red-500/20 rounded-2xl p-6 neo-glow-red">
          <h3 className="text-lg font-bold mb-4 text-red-500">Risk Assessment</h3>
          <div className="space-y-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-500 mb-1">Stablecoin Exposure</p>
              <p className="text-xs text-muted-foreground">
                Portfolio weighted towards USDC (78%). USDT depeg risk within acceptable bounds.
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-yellow-500 mb-1">Liquidity Warning</p>
              <p className="text-xs text-muted-foreground">
                ETH exit liquidity adequate but recommend diversification.
              </p>
            </div>

            <div className="bg-emerald-glow/10 border border-emerald-glow/30 rounded-lg p-3">
              <p className="text-sm font-semibold text-emerald-glow mb-1">Compliance Status</p>
              <p className="text-xs text-muted-foreground">
                All temporal viewing keys valid. Next audit in 8 days.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
