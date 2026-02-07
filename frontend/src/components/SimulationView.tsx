import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts';
import {
  ArrowLeft, Play, Pause, RotateCcw, Clock, AlertTriangle,
  CheckCircle, XCircle, Wrench, Zap, Activity, Wind, ArrowUpDown, Radar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionHeader from './SectionHeader';
import ControlPanel from './ControlPanel';
import type { SimulationControls } from '../types';
import type { SimMachine, SimMachineStatus, SimEquipmentType } from '../data/simEquipment';
import { createSimMachines } from '../data/simEquipment';
import {
  advanceAllMachines, repairMachine, ignoreMachine,
  getSimDate, formatSimDate, TOTAL_SIM_DAYS, DAYS_PER_TICK, SPEED_LABELS,
  type SimSpeed,
} from '../engine/simulationEngine';

/* ── Constants ─────────────────────────────────────── */
const TICK_MS = 800;

/* ── Tooltip ───────────────────────────────────────── */
function Tip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group/tip inline-flex cursor-help">
      {children}
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tip:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-normal text-center tooltip-cinema"
        style={{ minWidth: 200 }}
      >
        {text}
      </span>
    </span>
  );
}

/* ── Visual config ─────────────────────────────────── */
const STATUS_CFG: Record<SimMachineStatus, {
  color: string; bg: string; label: string;
  border: string; dot: string; accent: string;
}> = {
  Healthy:  { color: 'text-accent-green', bg: 'bg-accent-green', label: 'Healthy',      border: 'border-accent-green/30', dot: 'status-dot-green',  accent: 'spotlight-green' },
  Warning:  { color: 'text-accent-gold',  bg: 'bg-accent-gold',  label: 'Warning',      border: 'border-accent-gold/30',  dot: 'status-dot-yellow', accent: 'spotlight-gold' },
  NeedsFix: { color: 'text-accent-red',   bg: 'bg-accent-red',   label: 'Needs Repair', border: 'border-accent-red/40',   dot: 'status-dot-red',    accent: 'spotlight-red' },
  Failed:   { color: 'text-accent-red',   bg: 'bg-accent-red',   label: 'Failed',       border: 'border-accent-red/50',   dot: 'status-dot-red',    accent: 'spotlight-red' },
};

const STATUS_STROKE: Record<SimMachineStatus, string> = {
  Healthy: '#6aab8a', Warning: '#d4a853', NeedsFix: '#c75050', Failed: '#c75050',
};

function barColor(usage: number, status: SimMachineStatus): string {
  if (status === 'Failed' || status === 'NeedsFix') return 'bg-accent-red';
  if (usage >= 80) return 'bg-accent-red';
  if (usage >= 50) return 'bg-accent-gold';
  return 'bg-accent-green';
}

const TYPE_ICON: Record<SimEquipmentType, React.ReactNode> = {
  motor: <Zap size={13} />, pump: <Activity size={13} />,
  hvac: <Wind size={13} />, conveyor: <ArrowUpDown size={13} />,
};

const TYPE_LABEL: Record<SimEquipmentType, string> = {
  motor: 'Motor', pump: 'Pump', hvac: 'Cooling', conveyor: 'Belt',
};

/* ── History ───────────────────────────────────────── */
type UsageHistory = Record<string, Array<{ day: number; usage: number }>>;

/* ── Component ─────────────────────────────────────── */
export default function SimulationView() {
  const navigate = useNavigate();

  const [machines, setMachines] = useState<SimMachine[]>(createSimMachines);
  const [day, setDay] = useState(0);
  const [speed, setSpeed] = useState<SimSpeed>('medium');
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState('S-01');
  const [repairedIds, setRepairedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<UsageHistory>(() => {
    const h: UsageHistory = {};
    createSimMachines().forEach((m) => { h[m.id] = [{ day: 0, usage: 0 }]; });
    return h;
  });

  const [controls, setControls] = useState<SimulationControls>({
    runtimeHours: 0, heat: 0, dust: 0, moisture: 0, pastFailures: 0,
  });

  const tickRef = useRef<number | null>(null);
  const dayRef = useRef(day);
  dayRef.current = day;
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  /* tick loop */
  useEffect(() => {
    if (!playing) { if (tickRef.current) clearInterval(tickRef.current); return; }

    tickRef.current = window.setInterval(() => {
      const step = DAYS_PER_TICK[speed];
      let newDay = dayRef.current + step;
      if (newDay >= TOTAL_SIM_DAYS) { newDay = TOTAL_SIM_DAYS; setPlaying(false); }
      setDay(newDay);
      dayRef.current = newDay;

      setMachines((prev) => {
        const c = controlsRef.current;
        const envFactor = 1 + (c.heat + c.dust + c.moisture) / 150;
        const runtimeFactor = 1 + c.runtimeHours / 5000;
        const failureFactor = 1 + c.pastFailures * 0.1;
        const wearMultiplier = envFactor * runtimeFactor * failureFactor;

        const next = advanceAllMachines(prev, step, wearMultiplier);
        setHistory((h) => {
          const u = { ...h };
          next.forEach((m) => { u[m.id] = [...(u[m.id] ?? []), { day: newDay, usage: Math.round(m.usagePercent) }]; });
          return u;
        });
        return next;
      });
    }, TICK_MS);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, speed]);

  /* actions */
  const handleReset = useCallback(() => {
    setPlaying(false); setDay(0); dayRef.current = 0;
    const fresh = createSimMachines();
    setMachines(fresh); setRepairedIds(new Set());
    const h: UsageHistory = {};
    fresh.forEach((m) => { h[m.id] = [{ day: 0, usage: 0 }]; });
    setHistory(h);
  }, []);

  const handleFix = useCallback((id: string) => {
    setMachines((prev) => prev.map((m) => (m.id === id ? repairMachine(m) : m)));
    setHistory((h) => ({ ...h, [id]: [...(h[id] ?? []), { day: dayRef.current, usage: 0 }] }));
    setRepairedIds((prev) => new Set(prev).add(id));
    setTimeout(() => setRepairedIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 1500);
  }, []);

  const handleIgnore = useCallback((id: string) => {
    setMachines((prev) => prev.map((m) => (m.id === id ? ignoreMachine(m) : m)));
  }, []);

  /* derived */
  const simDate = getSimDate(day);
  const progress = Math.min((day / TOTAL_SIM_DAYS) * 100, 100);
  const isFinished = day >= TOTAL_SIM_DAYS;
  const selected = machines.find((m) => m.id === selectedId) ?? machines[0];
  const cfg = STATUS_CFG[selected.status];

  const healthyCount  = machines.filter((m) => m.status === 'Healthy').length;
  const warningCount  = machines.filter((m) => m.status === 'Warning').length;
  const needsFixCount = machines.filter((m) => m.status === 'NeedsFix').length;
  const failedCount   = machines.filter((m) => m.status === 'Failed').length;
  const totalDowntime = machines.reduce((s, m) => s + m.downtimeHours, 0);
  const attentionCount = needsFixCount + failedCount;
  const chartData = useMemo(() => history[selected.id] ?? [], [history, selected.id]);

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* ✅ NO AnimatedBackground here */}

      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(123,159,212,0.03) 0%, transparent 70%)' }} />
      </div>

      <div className="relative flex flex-col h-full" style={{ zIndex: 10 }}>
        {/* Header */}
        <header className="relative shrink-0 z-20 ops-header">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-5">
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-[12px] uppercase tracking-wider cursor-pointer"
              >
                <ArrowLeft size={15} /> Back
              </button>

              <div className="h-5 w-px bg-border-dim" />

              <div className="flex items-center gap-3">
                <Radar size={20} className="text-accent-gold opacity-80" />
                <h1 className="text-[15px] font-bold tracking-[0.15em] uppercase">
                  <span className="text-accent-gold">Downtime</span>
                  <span className="text-text-primary ml-1.5">Simulation</span>
                </h1>
              </div>
            </div>

            <Tip text="This is the current date in the simulation. Time moves forward as the simulation runs.">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg cinema-panel">
                <Clock size={15} className="text-accent-gold" />
                <span className="text-[13px] font-semibold text-text-primary">{formatSimDate(simDate)}</span>
              </div>
            </Tip>

            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg cinema-panel">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-2.5 h-2.5 rounded-full bg-accent-green status-dot-green"
              />
              <span className="text-[12px] font-medium text-accent-green tracking-wide">Sim</span>
              <span className="text-[12px] text-text-muted">{machines.length} machines</span>
            </div>
          </div>

          <div className="theater-divider" />

          {/* Controls bar */}
          <div className="flex items-center justify-between px-6 py-2.5 gap-4" style={{ background: 'rgba(13,11,17,0.5)' }}>
            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">
                  Day {Math.min(Math.round(day), TOTAL_SIM_DAYS)}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div className="h-full rounded-full bg-accent-gold" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                </div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">{TOTAL_SIM_DAYS}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(['slow', 'medium', 'fast'] as SimSpeed[]).map((s) => (
                <Tip
                  key={s}
                  text={
                    s === 'slow' ? 'Time moves one day at a time.'
                      : s === 'medium' ? 'Time moves one week at a time.'
                        : 'Time moves one month at a time.'
                  }
                >
                  <button
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-[0.1em] transition-all cursor-pointer border ${
                      speed === s
                        ? 'bg-accent-gold/10 text-accent-gold border-accent-gold/30'
                        : 'cinema-panel text-text-muted border-transparent hover:text-text-secondary'
                    }`}
                  >
                    {s === 'slow' ? 'Days' : s === 'medium' ? 'Weeks' : 'Months'}
                  </button>
                </Tip>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!playing ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => !isFinished && setPlaying(true)}
                  disabled={isFinished}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider border transition-all ${
                    isFinished
                      ? 'opacity-40 cursor-not-allowed cinema-panel text-text-muted border-transparent'
                      : 'bg-accent-green/8 text-accent-green border-accent-green/20 hover:bg-accent-green/15 cursor-pointer'
                  }`}
                >
                  <Play size={12} /> Play
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPlaying(false)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-accent-red/8 text-accent-red border border-accent-red/20 hover:bg-accent-red/15 cursor-pointer transition-all"
                >
                  <Pause size={12} /> Pause
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider cinema-panel cinema-panel-hover text-text-muted hover:text-text-secondary cursor-pointer transition-all"
              >
                <RotateCcw size={12} /> Reset
              </motion.button>
            </div>

            <Tip text="How fast time is passing in the simulation.">
              <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">
                Speed: {SPEED_LABELS[speed]}
              </span>
            </Tip>
          </div>

          {/* Alert ribbon */}
          <AnimatePresence>
            {attentionCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 32 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div
                  className="h-8 flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-accent-red/90"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(199,80,80,0.06), rgba(199,80,80,0.1), rgba(199,80,80,0.06), transparent)' }}
                >
                  <AlertTriangle size={12} />
                  <span>
                    {attentionCount} machine{attentionCount > 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} attention
                    {failedCount > 0 && ` — ${failedCount} failed`}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Main */}
        <main className="flex-1 flex min-h-0 p-3 gap-3">
          {/* Left list */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-[300px] shrink-0 cinema-panel rounded-2xl overflow-hidden flex flex-col"
          >
            <SectionHeader
              icon={<Radar size={15} />}
              title="Machine Fleet"
              badge={<span className="text-[10px] font-medium text-text-muted tracking-wider uppercase">{machines.length} units</span>}
            />

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {machines.map((machine, idx) => {
                  const mc = STATUS_CFG[machine.status];
                  const isSel = selectedId === machine.id;
                  const justFixed = repairedIds.has(machine.id);

                  return (
                    <motion.button
                      key={machine.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: idx * 0.03, duration: 0.3 }}
                      whileHover={{ x: 4, transition: { duration: 0.15 } }}
                      onClick={() => setSelectedId(machine.id)}
                      className={`w-full text-left px-3.5 py-3 rounded-xl transition-all cursor-pointer relative overflow-hidden ${
                        isSel ? 'cinema-panel spotlight-gold' : 'cinema-panel cinema-panel-hover border-transparent'
                      }`}
                    >
                      {machine.status === 'Failed' && <div className="absolute inset-0 warm-shimmer pointer-events-none" />}
                      {justFixed && <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(106,171,138,0.08)' }} />}

                      <div className="relative">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <motion.div
                              animate={machine.status === 'NeedsFix' || machine.status === 'Failed' ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${mc.bg} ${mc.dot}`}
                            />
                            <span className="text-[13px] font-semibold text-text-primary truncate">{machine.name}</span>
                          </div>
                          <span className={`text-[14px] font-mono font-bold shrink-0 ${mc.color}`}>{Math.round(machine.usagePercent)}%</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 ml-5">
                          <span className={`text-[11px] font-semibold ${mc.color}`}>{mc.label}</span>
                          <div className="flex items-center gap-1.5 text-text-muted">
                            {TYPE_ICON[machine.type]}
                            <span className="text-[10px] uppercase tracking-[0.08em]">{TYPE_LABEL[machine.type]}</span>
                          </div>
                        </div>

                        <div className="mt-2 ml-5 h-[3px] rounded-full bg-white/5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${barColor(machine.usagePercent, machine.status)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(machine.usagePercent, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            style={{ boxShadow: `0 0 6px ${STATUS_STROKE[machine.status]}30` }}
                          />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right detail */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col min-w-0 gap-3"
          >
            <div className="flex-1 cinema-panel rounded-2xl overflow-hidden flex flex-col min-h-0">
              {/* Hero */}
              <div className="px-6 pt-5 pb-3">
                <div className="flex items-start gap-5">
                  <UsageRing usage={selected.usagePercent} status={selected.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-1">
                      {TYPE_LABEL[selected.type].toUpperCase()} / {selected.id}
                    </p>
                    <h2 className={`text-[22px] font-bold leading-tight ${cfg.color}`}>{selected.name}</h2>
                    <p className="text-[12px] text-text-secondary mt-1.5">
                      {selected.status === 'Failed' ? 'This machine broke down because it was not repaired in time.'
                        : selected.status === 'NeedsFix' ? 'This machine has worn out completely and needs to be fixed.'
                          : selected.usagePercent >= 50 ? 'This machine is getting worn. Keep an eye on it.'
                            : 'This machine is running normally. No problems detected.'}
                    </p>
                  </div>

                  {selected.status === 'NeedsFix' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleFix(selected.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-accent-green/15 border border-accent-green/30 text-accent-green hover:bg-accent-green/25 transition-all cursor-pointer"
                      >
                        <Wrench size={13} /> Fix Now
                      </button>
                      <button
                        onClick={() => handleIgnore(selected.id)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-accent-red/15 border border-accent-red/30 text-accent-red hover:bg-accent-red/25 transition-all cursor-pointer"
                      >
                        <XCircle size={13} /> Ignore
                      </button>
                    </motion.div>
                  )}
                </div>

                <AnimatePresence>
                  {repairedIds.has(selected.id) && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="mt-3 flex items-center gap-2 text-accent-green">
                      <CheckCircle size={15} />
                      <span className="text-[12px] font-semibold uppercase tracking-wider">Repaired! Machine is back to healthy.</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {selected.status === 'Failed' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 breaking-alert p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-accent-red">
                      <AlertTriangle size={14} />
                      <span className="text-[12px] font-semibold">This machine is down and costing time.</span>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="theater-divider mx-6 mt-1" />

              {/* Chart */}
              <div className="flex-1 px-4 min-h-0 relative py-2">
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[11px] text-text-secondary font-medium">Usage Over Time</p>
                </div>

                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 25, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={STATUS_STROKE[selected.status]} stopOpacity={0.3} />
                          <stop offset="60%" stopColor={STATUS_STROKE[selected.status]} stopOpacity={0.08} />
                          <stop offset="100%" stopColor={STATUS_STROKE[selected.status]} stopOpacity={0} />
                        </linearGradient>
                        <filter id="simGlow">
                          <feGaussianBlur stdDeviation="2" result="b" />
                          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,100,80,0.08)" />
                      <XAxis dataKey="day" stroke="rgba(101,94,84,0.5)" fontSize={10} fontFamily="Inter, sans-serif" tickFormatter={(v) => `Day ${v}`} />
                      <YAxis stroke="rgba(101,94,84,0.5)" fontSize={10} fontFamily="Inter, sans-serif" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <ReferenceArea y1={80} y2={100} fill="rgba(199,80,80,0.04)" />
                      <ReferenceArea y1={50} y2={80} fill="rgba(212,168,83,0.03)" />

                      <RechartsTooltip
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
                        labelFormatter={(v) => `Day ${v}`}
                        formatter={(value: number) => [`${value}%`, 'Usage']}
                      />

                      <Area type="monotone" dataKey="usage" stroke={STATUS_STROKE[selected.status]} strokeWidth={2.5} fill="url(#simGrad)" filter="url(#simGlow)" isAnimationActive={false} />
                      <ReferenceLine y={50} stroke="#d4a853" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: 'Warning', position: 'right', fill: '#d4a853', fontSize: 9 }} />
                      <ReferenceLine y={80} stroke="#c75050" strokeDasharray="4 4" strokeOpacity={0.3} label={{ value: 'Danger', position: 'right', fill: '#c75050', fontSize: 9 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-[13px] text-text-muted">
                      Press <span className="text-accent-gold font-semibold">Play</span> to start the simulation and see usage data appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* What-If Controls */}
            <div className="shrink-0 rounded-2xl overflow-hidden">
              <ControlPanel controls={controls} onChange={setControls} />
            </div>

            {/* Bottom summary */}
            <div className="cinema-panel rounded-2xl px-5 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-green status-dot-green" />
                    <span className="text-text-secondary font-medium">{healthyCount} Healthy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-gold status-dot-yellow" />
                    <span className="text-text-secondary font-medium">{warningCount} Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-red status-dot-red" />
                    <span className="text-text-secondary font-medium">{needsFixCount} Needs Repair</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-soft-pulse" />
                    <span className="text-text-secondary font-medium">{failedCount} Failed</span>
                  </div>
                </div>

                {totalDowntime > 0 && (
                  <div className="flex items-center gap-2 text-accent-red font-semibold text-[12px]">
                    <Zap size={14} />
                    <span>{Math.round(totalDowntime)} hours lost</span>
                  </div>
                )}

                {isFinished && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-accent-gold font-semibold uppercase tracking-wider">
                    Simulation Complete
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

/* ── Usage Ring ────────────────────────────────────── */
function UsageRing({ usage, status }: { usage: number; status: SimMachineStatus }) {
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(usage / 100, 1));
  const color = STATUS_STROKE[status];

  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="transform -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <motion.circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="countdown-ring"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold font-mono" style={{ color }}>{Math.round(usage)}</span>
        <span className="text-[9px] text-text-muted uppercase tracking-wider">% used</span>
      </div>
    </div>
  );
}
