import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Equipment, EquipmentType } from '../types';
import { Activity, Zap, Wind, ArrowUpDown, Search, Radar } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getStatusLabel, estimateHoursToFailure, formatTimeWindow } from '../engine/humanReadable';
import SectionHeader from './SectionHeader';

const TYPE_ICONS: Record<EquipmentType, React.ReactNode> = {
  motor: <Zap size={13} />,
  pump: <Activity size={13} />,
  hvac: <Wind size={13} />,
  conveyor: <ArrowUpDown size={13} />,
};

const TYPE_LABELS: Record<EquipmentType, string> = {
  motor: 'Motor', pump: 'Pump', hvac: 'HVAC', conveyor: 'Conveyor',
};

const RISK_COLORS: Record<string, string> = {
  low: 'bg-accent-green', medium: 'bg-accent-yellow', high: 'bg-accent-orange', critical: 'bg-accent-red',
};

const STATUS_DOT: Record<string, string> = {
  low: 'status-dot-green', medium: 'status-dot-yellow', high: 'status-dot-orange', critical: 'status-dot-red',
};

const RISK_STROKE: Record<string, string> = {
  low: '#6aab8a', medium: '#d4a853', high: '#c8956c', critical: '#c75050',
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  low: 'text-accent-green',
  medium: 'text-accent-yellow',
  high: 'text-accent-orange',
  critical: 'text-accent-red',
};

interface Props {
  equipment: Equipment[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function EquipmentList({ equipment, selectedId, onSelect }: Props) {
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<EquipmentType | 'all'>('all');

  const sorted = useMemo(() => {
    return [...equipment]
      .filter((eq) => {
        const matchesSearch = eq.name.toLowerCase().includes(filter.toLowerCase()) || eq.id.toLowerCase().includes(filter.toLowerCase());
        const matchesType = typeFilter === 'all' || eq.type === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => b.riskPercent - a.riskPercent);
  }, [equipment, filter, typeFilter]);

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Equipment cast list">
      <SectionHeader
        icon={<Radar size={15} />}
        title="Equipment Fleet"
        badge={
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-accent-green status-dot-green"
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium text-accent-green tracking-wider uppercase">Live</span>
          </div>
        }
      />

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search equipment..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Search equipment"
            className="w-full cinema-panel rounded-lg pl-9 pr-3 py-2.5 text-[12px] text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold/40 transition-all"
          />
        </div>
      </div>

      {/* Type Filters */}
      <div className="px-4 pb-3 flex gap-1.5 flex-wrap" role="group" aria-label="Filter by equipment type">
        {(['all', 'motor', 'pump', 'hvac', 'conveyor'] as const).map((t) => (
          <motion.button
            key={t}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setTypeFilter(t)}
            aria-pressed={typeFilter === t}
            className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] transition-all cursor-pointer border ${
              typeFilter === t
                ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/30'
                : 'cinema-panel text-text-muted border-transparent hover:text-text-secondary'
            }`}
          >
            {t === 'all' ? 'All' : TYPE_LABELS[t]}
          </motion.button>
        ))}
      </div>

      <div className="theater-divider mx-4" />

      {/* Equipment Cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" role="listbox" aria-label="Equipment list">
        <AnimatePresence mode="popLayout">
          {sorted.map((eq, idx) => {
            const sparkData = eq.sensorData.slice(-12).map((s, i) => ({ i, v: s.vibration }));
            const isSelected = selectedId === eq.id;
            const statusLabel = getStatusLabel(eq.riskLevel);
            const hoursLeft = estimateHoursToFailure(eq.riskPercent);

            return (
              <motion.button
                key={eq.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.03, duration: 0.3 }}
                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                onClick={() => onSelect(eq.id)}
                role="option"
                aria-selected={isSelected}
                aria-label={`${eq.name}, ${statusLabel}, risk ${eq.riskPercent.toFixed(0)}%`}
                className={`w-full text-left px-3.5 py-3 rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'cinema-panel spotlight-gold'
                    : 'cinema-panel cinema-panel-hover border-transparent'
                }`}
              >
                {/* Warm shimmer on critical */}
                {eq.riskLevel === 'critical' && <div className="absolute inset-0 warm-shimmer pointer-events-none" />}

                <div className="relative">
                  {/* Top row: name + risk% */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <motion.div
                        animate={eq.riskLevel === 'critical' ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${RISK_COLORS[eq.riskLevel]} ${STATUS_DOT[eq.riskLevel]}`}
                        aria-hidden="true"
                      />
                      <span className="text-[13px] font-semibold text-text-primary truncate">{eq.name}</span>
                    </div>
                    <span className={`text-[14px] font-mono font-bold shrink-0 ${STATUS_TEXT_COLOR[eq.riskLevel]}`}>
                      {eq.riskPercent.toFixed(0)}%
                    </span>
                  </div>

                  {/* Middle row: status label + type badge */}
                  <div className="flex items-center justify-between gap-2 ml-5">
                    <span className={`text-[11px] font-semibold ${STATUS_TEXT_COLOR[eq.riskLevel]}`}>
                      {statusLabel}
                    </span>
                    <div className="flex items-center gap-1.5 text-text-muted">
                      {TYPE_ICONS[eq.type]}
                      <span className="text-[10px] uppercase tracking-[0.08em]">{TYPE_LABELS[eq.type]}</span>
                    </div>
                  </div>

                  {/* Bottom row: time estimate + sparkline */}
                  <div className="flex items-center justify-between mt-2 ml-5">
                    <span className="text-[10px] text-text-muted">
                      {eq.riskLevel === 'low'
                        ? 'No action needed'
                        : `~${formatTimeWindow(hoursLeft)} until risk`}
                    </span>
                    <div className="w-14 h-5" aria-hidden="true">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <Line type="monotone" dataKey="v" stroke={RISK_STROKE[eq.riskLevel]} strokeWidth={1.2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Risk bar */}
                  <div className="mt-2 ml-5 h-[3px] rounded-full bg-white/5 overflow-hidden" aria-hidden="true">
                    <motion.div
                      className={`h-full rounded-full ${RISK_COLORS[eq.riskLevel]}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(eq.riskPercent, 100)}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      style={{
                        boxShadow: `0 0 6px ${RISK_STROKE[eq.riskLevel]}30`,
                      }}
                    />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-3">
        <div className="theater-divider mb-2" />
        <div className="flex justify-between text-[10px] text-text-muted tracking-wider uppercase">
          <span>{equipment.length} units monitored</span>
          <span className="flex items-center gap-1.5">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full bg-accent-gold"
              aria-hidden="true"
            />
            Streaming
          </span>
        </div>
      </div>
    </div>
  );
}
