import { motion } from 'framer-motion';
import type { SimulationControls } from '../types';
import { SlidersHorizontal } from 'lucide-react';
import GlassPanel from './GlassPanel';

interface Props {
  controls: SimulationControls;
  onChange: (controls: SimulationControls) => void;
}

const sliders: { key: keyof SimulationControls; label: string; help: string; min: number; max: number; step: number; unit: string; color: string }[] = [
  { key: 'runtimeHours', label: 'Operating Hours', help: 'Adjust hours of use', min: -2000, max: 5000, step: 100, unit: 'hrs', color: '#7b9fd4' },
  { key: 'heat', label: 'Heat Level', help: 'Temperature stress', min: -50, max: 50, step: 1, unit: '', color: '#c75050' },
  { key: 'dust', label: 'Dust Exposure', help: 'Particulate level', min: -50, max: 50, step: 1, unit: '', color: '#d4a853' },
  { key: 'moisture', label: 'Moisture', help: 'Humidity factor', min: -50, max: 50, step: 1, unit: '', color: '#7b9fd4' },
  { key: 'pastFailures', label: 'Past Failures', help: 'Failure history count', min: 0, max: 10, step: 1, unit: '', color: '#c8956c' },
];

export default function ControlPanel({ controls, onChange }: Props) {
  const handleChange = (key: keyof SimulationControls, value: number) => {
    onChange({ ...controls, [key]: value });
  };

  return (
    <GlassPanel accent="gold" delay={0.2}>
      <div className="p-4" role="group" aria-label="What-if scenario controls">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-1 h-4 rounded-full bg-accent-gold" />
          <SlidersHorizontal size={14} className="text-accent-gold" />
          <div>
            <h3 className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.15em]">What-If Scenarios</h3>
            <p className="text-[9px] text-text-muted mt-0.5">Adjust conditions to see how risk changes</p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {sliders.map((s, i) => {
            const pct = ((controls[s.key] - s.min) / (s.max - s.min)) * 100;
            return (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04 }}
              >
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[9px] text-text-muted uppercase tracking-[0.12em]" title={s.help}>{s.label}</label>
                  <span className="text-[11px] font-mono font-bold" style={{ color: s.color }}>
                    {controls[s.key] > 0 ? '+' : ''}{controls[s.key]}{s.unit}
                  </span>
                </div>
                <p className="text-[8px] text-text-muted mb-1.5 opacity-70">{s.help}</p>
                <div className="relative h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${s.color}30, ${s.color})`,
                      boxShadow: `0 0 6px ${s.color}40`,
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={controls[s.key]}
                  onChange={(e) => handleChange(s.key, Number(e.target.value))}
                  aria-label={`${s.label}: ${controls[s.key]}${s.unit}`}
                  className="whatif-slider w-full h-1.5 mt-[-6px] relative z-10 cursor-pointer"
                  style={{ '--slider-color': s.color } as React.CSSProperties}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </GlassPanel>
  );
}
