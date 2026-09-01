"use client";
import React from 'react';
import { useInvestigation } from '@/context/InvestigationContext';
import { Trophy, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

export default function Leaderboard() {
  const { data } = useInvestigation();
  const candidates = data?.candidates || [];
  
  if (candidates.length === 0) return null;
  
  const chartData = candidates.slice(0, 5).map(c => ({
    name: c.vessel.name || c.vessel.mmsi,
    score: parseFloat((c.attribution_score * 100).toFixed(1)),
    mmsi: c.vessel.mmsi
  }));

  return (
    <div className="tactical-panel" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Trophy size={16} color="var(--accent-yellow)" />
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Attribution Leaderboard (Top 5)
        </h3>
      </div>
      
      <div style={{ flex: 1, minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
              width={100}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: '#0f172a', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [`${value}% Match`, 'Score']}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.score > 80 ? 'var(--accent-red)' : entry.score > 50 ? 'var(--accent-yellow)' : 'var(--accent-blue)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
