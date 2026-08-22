
import React from 'react';
import {
  Radar, RadarChart as ReRadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';

interface RadarChartProps {
  data: { subject: string; A: number; fullMark: number }[];
  title?: string;
  color?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({ data, title, color = "#3b82f6" }) => {
  return (
    <div className="w-full h-full min-h-[300px] flex flex-col">
      {title && (
        <div className="text-[10px] font-headline font-bold text-dim uppercase tracking-[0.2em] mb-4 text-center">
          {title}
        </div>
      )}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <ReRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: 500 }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Property"
              dataKey="A"
              stroke={color}
              fill={color}
              fillOpacity={0.3}
            />
          </ReRadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
