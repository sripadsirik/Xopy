import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
  LineChart, Line,
} from 'recharts';
import type { Equipment } from '../types';
import { generateRiskCurve } from '../engine/riskEngine';
import { TrendingUp, Thermometer, Activity as VibIcon, Gauge, Radio } from 'lucide-react';
import GlassPanel from './GlassPanel';
import SectionHeader from './SectionHeader';

interface Props {
  equipment: Equipment;
}

export default function RiskChart({ equipment }: Props) {
  const curveData = useMemo(() => generateRiskCurve(equipment.riskPercent), [equipment.riskPercent]);

  const sensorChartData = useMemo(() => {
    return equipment.sensorData.slice(-30).map((s, i) => ({
      idx: i,
      temp: Math.round(s.temperature * 10) / 10,
      vib: Math.round(s.vibration * 100) / 100,
      pres: Math.round(s.pressure * 10) / 10,
    }));
  }, [equipment.sensorData]);

  const riskAt24 = curveData.find((p) => p.hour === 24)?.probability ?? 0;
  const riskAt48 = curveData.find((p) => p.hour === 48)?.probability ?? 0;
  const riskAt72 = curveData.find((p) => p.hour === 72)?.probability ?? 0;

  const riskColor = (v: number) =>
    v >= 75 ? 'text-accent-red' : v >= 50 ? 'text-accent-orange' : v >= 25 ? 'text-accent-yellow' : 'text-accent-green';

  const riskAccent = (v: number) =>
    v >= 75 ? 'spotlight-red' : v >= 50 ? 'spotlight-gold' : 'spotlight-blue';

  return (
    <div className="flex flex-col h-full relative" role="region" aria-label="Risk analysis chart">
      <SectionHeader
        icon={<TrendingUp size={14} />}
        title="Failure Probability — 72H Forecast"
        subtitle={`${equipment.name} — ${equipment.type.toUpperCase()} — ${equipment.id}`}
        badge={
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md cinema-panel">
            <Radio size={10} className="text-accent-gold" />
            <span className="text-[9px] font-mono text-accent-gold">{equipment.id}</span>
          </div>
        }
      />

      {/* Risk stat cards */}
      <div className="flex gap-2.5 px-5 py-2" role="group" aria-label="Risk projections">
        {[
          { label: 'Current', value: equipment.riskPercent },
          { label: '+24H', value: riskAt24 },
          { label: '+48H', value: riskAt48 },
          { label: '+72H', value: riskAt72 },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`flex-1 cinema-panel rounded-xl px-3 py-2.5 border ${riskAccent(stat.value)} relative overflow-hidden`}
            aria-label={`${stat.label}: ${stat.value.toFixed(1)}%`}
          >
            <div
              className="absolute inset-0 opacity-8"
              style={{
                background: `radial-gradient(circle at 50% 80%, ${stat.value >= 50 ? 'rgba(199,80,80,0.08)' : 'rgba(212,168,83,0.06)'}, transparent 70%)`,
              }}
            />
            <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] font-mono relative">{stat.label}</p>
            <p className={`text-xl font-mono font-bold relative ${riskColor(stat.value)}`}>
              {stat.value.toFixed(1)}
              <span className="text-xs ml-0.5 opacity-60">%</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* Main Chart */}
      <div className="flex-1 px-4 min-h-0 relative">
        <div className="absolute inset-0 mx-4 rounded-xl overflow-hidden pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 100%, rgba(199,80,80,0.03) 0%, transparent 60%)',
          }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 15, right: 25, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="riskGradientCinema" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c75050" stopOpacity={0.3} />
                <stop offset="40%" stopColor="#c8956c" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#c8956c" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bandGradientCinema" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7b9fd4" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#7b9fd4" stopOpacity={0.01} />
              </linearGradient>
              <filter id="warmGlow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,100,80,0.08)" />
            <XAxis
              dataKey="hour"
              stroke="rgba(101,94,84,0.5)"
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              tickFormatter={(v) => `${v}h`}
              interval={11}
            />
            <YAxis
              stroke="rgba(101,94,84,0.5)"
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(22,20,28,0.92)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(200,170,110,0.2)',
                borderRadius: '10px',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                color: '#ece7df',
              }}
              labelFormatter={(v) => `T+${v}h`}
              formatter={(value?: number, name?: string) => {
                const labels: Record<string, string> = { probability: 'Risk', upper: 'Upper', lower: 'Lower' };
                return [`${(value ?? 0).toFixed(1)}%`, labels[name ?? ''] || name || ''];
              }}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="bandGradientCinema" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" />
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#c75050"
              strokeWidth={2.5}
              fill="riskGradientCinema"
              filter="url(#warmGlow)"
            />
            <ReferenceLine
              x={0}
              stroke="#d4a853"
              strokeWidth={2}
              strokeDasharray="5 3"
              label={{ value: 'NOW', position: 'top', fill: '#d4a853', fontSize: 9, fontWeight: 700 }}
            />
            <ReferenceLine y={50} stroke="#d4a853" strokeDasharray="4 4" strokeOpacity={0.25} />
            <ReferenceLine y={75} stroke="#c75050" strokeDasharray="4 4" strokeOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Sensor Feed */}
      <div className="px-5 py-3">
        <div className="theater-divider mb-3" />
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 rounded-full bg-accent-green" />
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Live Sensor Feed</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-accent-green status-dot-green"
              aria-hidden="true"
            />
            <span className="text-[9px] font-medium text-accent-green tracking-wider uppercase">Streaming</span>
          </div>
        </div>

        {/* Sensor metric cards */}
        <div className="grid grid-cols-3 gap-2 mb-2.5">
          {[
            { icon: <Thermometer size={13} />, label: 'Temperature', value: `${sensorChartData[sensorChartData.length - 1]?.temp ?? 0}`, unit: 'F', iconClass: 'text-accent-red', valueClass: 'text-accent-red', accent: 'spotlight-red' },
            { icon: <VibIcon size={13} />, label: 'Vibration', value: `${sensorChartData[sensorChartData.length - 1]?.vib ?? 0}`, unit: 'mm/s', iconClass: 'text-accent-amber', valueClass: 'text-accent-amber', accent: 'spotlight-gold' },
            { icon: <Gauge size={13} />, label: 'Pressure', value: `${sensorChartData[sensorChartData.length - 1]?.pres ?? 0}`, unit: 'PSI', iconClass: 'text-accent-blue', valueClass: 'text-accent-blue', accent: 'spotlight-blue' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`cinema-panel rounded-lg px-3 py-2 flex items-center gap-2.5 ${s.accent}`}
            >
              <span className={s.iconClass}>{s.icon}</span>
              <div>
                <p className="text-[8px] text-text-muted uppercase tracking-[0.15em]">{s.label}</p>
                <p className={`text-sm font-mono font-bold ${s.valueClass}`}>
                  {s.value}<span className="text-[9px] opacity-50 ml-0.5">{s.unit}</span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sensor sparkline chart */}
        <GlassPanel className="p-2" accent="blue">
          <div className="h-16" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorChartData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Line type="monotone" dataKey="temp" stroke="#c75050" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="vib" stroke="#d4a853" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="pres" stroke="#7b9fd4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
