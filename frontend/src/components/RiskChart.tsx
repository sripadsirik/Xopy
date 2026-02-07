import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import type { Equipment } from '../types';
import { generateRiskCurve } from '../engine/riskEngine';
import {
  getHeadline,
  estimateHoursToFailure,
  formatTimeWindow,
  estimateDowntimeCost,
  formatCurrency,
  getRiskTrendLabel,
  getOrderWindowLabel,
  getStatusLabel,
} from '../engine/humanReadable';
import { Clock, TrendingUp, DollarSign, ShoppingCart, Thermometer, Activity as VibIcon, Gauge, AlertTriangle, CheckCircle } from 'lucide-react';

interface Props {
  equipment: Equipment;
}

function CountdownRing({ hours, riskLevel }: { hours: number; riskLevel: string }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const maxHours = 72;
  const progress = Math.max(0, Math.min(1, 1 - hours / maxHours));
  const offset = circumference * (1 - progress);

  const color = riskLevel === 'critical' ? '#c75050' : riskLevel === 'high' ? '#c8956c' : riskLevel === 'medium' ? '#d4a853' : '#6aab8a';

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="countdown-ring"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold font-mono" style={{ color }}>{hours}</span>
        <span className="text-[9px] text-text-muted uppercase tracking-wider">hours</span>
      </div>
    </div>
  );
}

function TimelineBar({ riskPercent, hoursToFailure }: { riskPercent: number; hoursToFailure: number }) {
  // 3 segments: NOW (safe) → RISK ZONE → LIKELY FAILURE
  // The marker position reflects how close to failure we are
  const safeWidth = Math.max(10, Math.min(60, 100 - riskPercent));
  const riskWidth = Math.max(15, Math.min(50, riskPercent * 0.5));
  const failWidth = Math.max(10, 100 - safeWidth - riskWidth);
  const markerPct = Math.max(5, Math.min(95, riskPercent));

  return (
    <div className="px-6 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] text-text-muted uppercase tracking-[0.15em]">Failure timeline</p>
        <p className="text-[10px] text-text-secondary">
          Est. <span className="font-bold text-text-primary">{hoursToFailure}h</span> until likely failure
        </p>
      </div>
      <div className="timeline-bar" role="progressbar" aria-valuenow={riskPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Failure timeline: ${riskPercent}% risk`}>
        <div
          className="timeline-segment text-accent-green"
          style={{ flex: safeWidth, background: 'linear-gradient(90deg, rgba(106,171,138,0.12) 0%, rgba(106,171,138,0.06) 100%)' }}
        >
          <CheckCircle size={10} className="mr-1 opacity-70" /> NOW
        </div>
        <div
          className="timeline-segment text-accent-yellow"
          style={{ flex: riskWidth, background: 'linear-gradient(90deg, rgba(212,168,83,0.1) 0%, rgba(212,168,83,0.06) 100%)' }}
        >
          <AlertTriangle size={10} className="mr-1 opacity-70" /> RISK&nbsp;ZONE
        </div>
        <div
          className="timeline-segment text-accent-red"
          style={{ flex: failWidth, background: 'linear-gradient(90deg, rgba(199,80,80,0.1) 0%, rgba(199,80,80,0.15) 100%)' }}
        >
          LIKELY&nbsp;FAILURE
        </div>
        {/* Animated marker */}
        <motion.div
          className="timeline-marker"
          style={{ color: riskPercent >= 75 ? '#c75050' : riskPercent >= 50 ? '#d4a853' : '#6aab8a' }}
          initial={{ left: '5%' }}
          animate={{ left: `${markerPct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <div className="w-2 h-2 rounded-full bg-current" />
        </motion.div>
      </div>
    </div>
  );
}

function RiskChartInner({ equipment }: Props) {
  const curveData = useMemo(() => generateRiskCurve(equipment.riskPercent), [equipment.riskPercent]);

  const { riskAt24, riskAt48, riskAt72 } = useMemo(() => {
    const at24 = curveData.find((p) => p.hour === 24)?.probability ?? 0;
    const at48 = curveData.find((p) => p.hour === 48)?.probability ?? 0;
    const at72 = curveData.find((p) => p.hour === 72)?.probability ?? 0;
    return { riskAt24: at24, riskAt48: at48, riskAt72: at72 };
  }, [curveData]);

  const sensorChartData = useMemo(() => {
    const last = equipment.sensorData.slice(-30);
    return last.map((s, i) => ({
      idx: i,
      temp: Math.round(s.temperature * 10) / 10,
      vib: Math.round(s.vibration * 100) / 100,
      pres: Math.round(s.pressure * 10) / 10,
    }));
  }, [equipment.sensorData]);

  const lastSensor = sensorChartData[sensorChartData.length - 1];
  const hoursToFailure = estimateHoursToFailure(equipment.riskPercent);
  const downtimeCost = estimateDowntimeCost(equipment.type, equipment.riskPercent);
  const headline = getHeadline(equipment.name, equipment.riskPercent);
  const trendLabel = getRiskTrendLabel(equipment.riskPercent);
  const orderWindow = getOrderWindowLabel(equipment.riskPercent);
  const statusLabel = getStatusLabel(equipment.riskLevel);

  const headlineColor = equipment.riskLevel === 'critical' ? 'text-accent-red'
    : equipment.riskLevel === 'high' ? 'text-accent-orange'
    : equipment.riskLevel === 'medium' ? 'text-accent-yellow'
    : 'text-accent-green';

  return (
    <div className="flex flex-col h-full relative" role="region" aria-label="Main risk analysis screen">
      {/* Hero Headline */}
      <div className="px-6 pt-5 pb-3">
        <div className="flex items-start gap-5">
          <CountdownRing hours={hoursToFailure} riskLevel={equipment.riskLevel} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-1">
              {equipment.type.toUpperCase()} / {equipment.id}
            </p>
            <h2 className={`text-[20px] font-bold leading-tight ${headlineColor}`}>
              {headline}
            </h2>
            <p className="text-[12px] text-text-secondary mt-1.5">
              {equipment.failureMode ? `Likely cause: ${equipment.failureMode}` : 'Monitoring for anomalies'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Bar: NOW → RISK ZONE → LIKELY FAILURE */}
      <TimelineBar riskPercent={equipment.riskPercent} hoursToFailure={hoursToFailure} />

      <div className="theater-divider mx-6" />

      {/* Plain-Language Metric Cards */}
      <div className="grid grid-cols-4 gap-2.5 px-6 py-3" role="group" aria-label="Key risk metrics">
        {[
          {
            icon: <Clock size={15} />,
            label: 'Failure risk in 48h',
            value: `${riskAt48.toFixed(0)}%`,
            explain: `Chance this equipment fails within 48 hours`,
            color: riskAt48 >= 75 ? 'text-accent-red' : riskAt48 >= 50 ? 'text-accent-orange' : 'text-accent-green',
            accent: riskAt48 >= 75 ? 'spotlight-red' : riskAt48 >= 50 ? 'spotlight-gold' : 'spotlight-green',
          },
          {
            icon: <DollarSign size={15} />,
            label: 'Est. downtime cost',
            value: formatCurrency(downtimeCost),
            explain: `Estimated cost if this equipment goes down`,
            color: 'text-accent-amber',
            accent: 'spotlight-gold',
          },
          {
            icon: <TrendingUp size={15} />,
            label: 'Risk trend',
            value: trendLabel,
            explain: `How quickly failure probability is increasing`,
            color: equipment.riskPercent >= 60 ? 'text-accent-red' : 'text-accent-yellow',
            accent: equipment.riskPercent >= 60 ? 'spotlight-red' : 'spotlight-gold',
          },
          {
            icon: <ShoppingCart size={15} />,
            label: 'Order window',
            value: orderWindow,
            explain: `Best time to order replacement parts`,
            color: equipment.riskPercent >= 65 ? 'text-accent-red' : 'text-accent-green',
            accent: equipment.riskPercent >= 65 ? 'spotlight-red' : 'spotlight-green',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`cinema-panel rounded-xl px-3.5 py-3 border ${stat.accent} relative overflow-hidden group`}
            aria-label={`${stat.label}: ${stat.value}`}
            title={stat.explain}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-text-muted">{stat.icon}</span>
              <p className="text-[10px] text-text-muted uppercase tracking-[0.1em]">{stat.label}</p>
            </div>
            <p className={`text-[16px] font-bold ${stat.color}`}>{stat.value}</p>
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 tooltip-cinema hidden group-hover:block z-50 whitespace-nowrap text-[11px]">
              {stat.explain}
            </div>
          </div>
        ))}
      </div>

      {/* 72H Forecast Chart with Safe/Danger Zones */}
      <div className="flex-1 px-4 min-h-0 relative">
        <div className="flex items-center justify-between px-2 mb-1">
          <p className="text-[11px] text-text-secondary font-medium">72-Hour Failure Forecast</p>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-green" /> Safe zone (below 50%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent-red" /> Danger zone (above 75%)
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={curveData} margin={{ top: 10, right: 25, left: 5, bottom: 5 }}>
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
              fontSize={10}
              fontFamily="Inter, sans-serif"
              tickFormatter={(v) => `${v}h`}
              interval={11}
            />
            <YAxis
              stroke="rgba(101,94,84,0.5)"
              fontSize={10}
              fontFamily="Inter, sans-serif"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            {/* Danger zone shading */}
            <ReferenceArea y1={75} y2={100} fill="rgba(199,80,80,0.04)" />
            {/* Warning zone shading */}
            <ReferenceArea y1={50} y2={75} fill="rgba(212,168,83,0.03)" />
            <Tooltip
              contentStyle={{
                background: 'rgba(22,20,28,0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(200,170,110,0.2)',
                borderRadius: '10px',
                fontSize: '12px',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                color: '#ece7df',
                padding: '10px 14px',
              }}
              labelFormatter={(v) => `In ${v} hours`}
              formatter={(value?: number, name?: string) => {
                const labels: Record<string, string> = { probability: 'Failure chance', upper: 'Worst case', lower: 'Best case' };
                return [`${(value ?? 0).toFixed(0)}%`, labels[name ?? ''] || name || ''];
              }}
            />
            <Area type="monotone" dataKey="upper" stroke="none" fill="bandGradientCinema" isAnimationActive={false} />
            <Area type="monotone" dataKey="lower" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area
              type="monotone"
              dataKey="probability"
              stroke="#c75050"
              strokeWidth={2.5}
              fill="riskGradientCinema"
              filter="url(#warmGlow)"
              isAnimationActive={false}
            />
            <ReferenceLine
              x={0}
              stroke="#d4a853"
              strokeWidth={2}
              strokeDasharray="5 3"
              label={{ value: 'NOW', position: 'top', fill: '#d4a853', fontSize: 10, fontWeight: 700 }}
            />
            <ReferenceLine y={50} stroke="#d4a853" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: 'Watch', position: 'right', fill: '#d4a853', fontSize: 9 }} />
            <ReferenceLine y={75} stroke="#c75050" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: 'Danger', position: 'right', fill: '#c75050', fontSize: 9 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Live Sensor Summary — compact */}
      <div className="px-6 py-3">
        <div className="theater-divider mb-3" />
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.15em]">Live Sensor Readings</p>
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-accent-green status-dot-green"
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium text-accent-green tracking-wider uppercase">Streaming</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: <Thermometer size={14} />, label: 'Temperature', value: `${lastSensor?.temp ?? 0}`, unit: '\u00B0F', explain: 'Current operating temperature', iconClass: 'text-accent-red', accent: 'spotlight-red' },
            { icon: <VibIcon size={14} />, label: 'Vibration', value: `${lastSensor?.vib ?? 0}`, unit: 'mm/s', explain: 'Vibration intensity level', iconClass: 'text-accent-amber', accent: 'spotlight-gold' },
            { icon: <Gauge size={14} />, label: 'Pressure', value: `${lastSensor?.pres ?? 0}`, unit: 'PSI', explain: 'Operating pressure', iconClass: 'text-accent-blue', accent: 'spotlight-blue' },
          ].map((s) => (
            <div
              key={s.label}
              className={`cinema-panel rounded-lg px-3.5 py-2.5 flex items-center gap-3 ${s.accent}`}
              title={s.explain}
            >
              <span className={s.iconClass}>{s.icon}</span>
              <div>
                <p className="text-[9px] text-text-muted uppercase tracking-[0.12em]">{s.label}</p>
                <p className={`text-[14px] font-bold ${s.iconClass}`}>
                  {s.value}<span className="text-[10px] opacity-50 ml-0.5">{s.unit}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(RiskChartInner);
