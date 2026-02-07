import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Zap,
  Activity,
  Wind,
  ArrowUpDown,
  Radar,
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import SectionHeader from './SectionHeader';
import type { Equipment, MachineStatus, EquipmentType } from '../data/equipment';
import { createInitialEquipment } from '../data/equipment';
import {
  advanceAllMachines,
  repairMachine,
  ignoreMachine,
  getSimDate,
  formatSimDate,
  TOTAL_SIM_DAYS,
  DAYS_PER_TICK,
  SPEED_LABELS,
  type SimSpeed,
} from '../engine/simulationEngine';

/* ── Constants ─────────────────────────────────────── */

const TICK_MS = 800;

/* ── Inline Tooltip ────────────────────────────────── */

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

/* ── Status / visual helpers ───────────────────────── */

const STATUS_CFG: Record<
  MachineStatus,
  { color: string; bg: string; label: string; border: string; dot: string; accent: string }
> = {
  Healthy:  { color: 'text-accent-green', bg: 'bg-accent-green', label: 'Healthy',      border: 'border-accent-green/30', dot: 'status-dot-green',  accent: 'spotlight-green' },
  Warning:  { color: 'text-accent-gold',  bg: 'bg-accent-gold',  label: 'Warning',      border: 'border-accent-gold/30',  dot: 'status-dot-yellow', accent: 'spotlight-gold' },
  NeedsFix: { color: 'text-accent-red',   bg: 'bg-accent-red',   label: 'Needs Repair', border: 'border-accent-red/40',   dot: 'status-dot-red',    accent: 'spotlight-red' },
  Failed:   { color: 'text-accent-red',   bg: 'bg-accent-red',   label: 'Failed',       border: 'border-accent-red/50',   dot: 'status-dot-red',    accent: 'spotlight-red' },
};

const STATUS_STROKE: Record<MachineStatus, string> = {
  Healthy: '#6aab8a',
  Warning: '#d4a853',
  NeedsFix: '#c75050',
  Failed: '#c75050',
};

function barColor(usage: number, status: MachineStatus): string {
  if (status === 'Failed' || status === 'NeedsFix') return 'bg-accent-red';
  if (usage >= 80) return 'bg-accent-red';
  if (usage >= 50) return 'bg-accent-gold';
  return 'bg-accent-green';
}

const TYPE_ICON: Record<EquipmentType, React.ReactNode> = {
  motor: <Zap size={13} />,
  pump: <Activity size={13} />,
  hvac: <Wind size={13} />,
  conveyor: <ArrowUpDown size={13} />,
};

const TYPE_LABEL: Record<EquipmentType, string> = {
  motor: 'Motor',
  pump: 'Pump',
  hvac: 'Cooling',
  conveyor: 'Belt',
};

/* ── History type ──────────────────────────────────── */

type UsageHistory = Record<string, Array<{ day: number; usage: number }>>;

/* ── Component ─────────────────────────────────────── */

interface Props {
  onBack: () => void;
}

export default function SimulationView({ onBack }: Props) {
  /* ── state ───────────────────────────────────────── */
  const [machines, setMachines] = useState<Equipment[]>(createInitialEquipment);
  const [day, setDay] = useState(0);
  const [speed, setSpeed] = useState<SimSpeed>('medium');
  const [playing, setPlaying] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('M-01');
  const [repairedIds, setRepairedIds] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<UsageHistory>(() => {
    const h: UsageHistory = {};
    createInitialEquipment().forEach((m) => {
      h[m.id] = [{ day: 0, usage: 0 }];
    });
    return h;
  });
  const tickRef = useRef<number | null>(null);
  const dayRef = useRef(day);
  dayRef.current = day;

  /* ── tick loop ───────────────────────────────────── */
  useEffect(() => {
    if (!playing) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    tickRef.current = window.setInterval(() => {
      const step = DAYS_PER_TICK[speed];
      let newDay = dayRef.current + step;
      if (newDay >= TOTAL_SIM_DAYS) {
        newDay = TOTAL_SIM_DAYS;
        setPlaying(false);
      }
      setDay(newDay);
      dayRef.current = newDay;

      setMachines((prev) => {
        const next = advanceAllMachines(prev, step);
        // record history snapshot
        setHistory((h) => {
          const updated = { ...h };
          next.forEach((m) => {
            updated[m.id] = [...(updated[m.id] ?? []), { day: newDay, usage: Math.round(m.usagePercent) }];
          });
          return updated;
        });
        return next;
      });
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [playing, speed]);

  /* ── actions ─────────────────────────────────────── */
  const handleReset = useCallback(() => {
    setPlaying(false);
    setDay(0);
    const fresh = createInitialEquipment();
    setMachines(fresh);
    setRepairedIds(new Set());
    const h: UsageHistory = {};
    fresh.forEach((m) => {
      h[m.id] = [{ day: 0, usage: 0 }];
    });
    setHistory(h);
  }, []);

  const handleFix = useCallback((id: string) => {
    setMachines((prev) => prev.map((m) => (m.id === id ? repairMachine(m) : m)));
    // record repair in history
    setHistory((h) => {
      const updated = { ...h };
      updated[id] = [...(updated[id] ?? []), { day, usage: 0 }];
      return updated;
    });
    setRepairedIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setRepairedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1500);
  }, [day]);

  const handleIgnore = useCallback((id: string) => {
    setMachines((prev) => prev.map((m) => (m.id === id ? ignoreMachine(m) : m)));
  }, []);

  /* ── derived ─────────────────────────────────────── */
  const simDate = getSimDate(day);
  const progress = Math.min((day / TOTAL_SIM_DAYS) * 100, 100);
  const isFinished = day >= TOTAL_SIM_DAYS;

  const selected = machines.find((m) => m.id === selectedId) ?? machines[0];
  const selectedCfg = STATUS_CFG[selected.status];

  const healthyCount  = machines.filter((m) => m.status === 'Healthy').length;
  const warningCount  = machines.filter((m) => m.status === 'Warning').length;
  const needsFixCount = machines.filter((m) => m.status === 'NeedsFix').length;
  const failedCount   = machines.filter((m) => m.status === 'Failed').length;
  const totalDowntime = machines.reduce((s, m) => s + m.downtimeHours, 0);
  const attentionCount = needsFixCount + failedCount;

  const chartData = useMemo(() => history[selected.id] ?? [], [history, selected.id]);

  /* ── render ──────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Background — matches dashboard exactly */}
      <AnimatedBackground />
      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.04) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(123,159,212,0.03) 0%, transparent 70%)' }}
        />
      </div>

      {/* Content layer */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 10 }}>

        {/* ── Header ────────────────────────────────── */}
        <header className="relative shrink-0 z-20 marquee-header">
          <div className="flex items-center justify-between px-6 py-3">
            {/* Left — back + brand */}
            <div className="flex items-center gap-5">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-[12px] uppercase tracking-wider cursor-pointer"
              >
                <ArrowLeft size={15} />
                Back
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

            {/* Center — date */}
            <Tip text="This is the current date in the simulation. Time moves forward as the simulation runs.">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-lg cinema-panel">
                <Clock size={15} className="text-accent-gold" />
                <span className="text-[13px] font-semibold text-text-primary">
                  {formatSimDate(simDate)}
                </span>
              </div>
            </Tip>

            {/* Right — summary */}
            <div className="flex items-center gap-3">
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
          </div>

          <div className="theater-divider" />

          {/* Controls bar */}
          <div className="flex items-center justify-between px-6 py-2.5 gap-4" style={{ background: 'rgba(13,11,17,0.5)' }}>
            {/* Timeline mini-bar */}
            <div className="flex-1 max-w-md">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">Day {Math.min(Math.round(day), TOTAL_SIM_DAYS)}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-accent-gold"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-[10px] text-text-muted uppercase tracking-wider shrink-0">{TOTAL_SIM_DAYS}</span>
              </div>
            </div>

            {/* Speed buttons */}
            <div className="flex items-center gap-1.5">
              {(['slow', 'medium', 'fast'] as SimSpeed[]).map((s) => (
                <Tip
                  key={s}
                  text={
                    s === 'slow'
                      ? 'Time moves one day at a time. Good for watching closely.'
                      : s === 'medium'
                        ? 'Time moves one week at a time. Good for seeing trends.'
                        : 'Time moves one month at a time. Good for seeing the big picture.'
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

            {/* Playback */}
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

            {/* Speed label */}
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
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(199,80,80,0.06), rgba(199,80,80,0.1), rgba(199,80,80,0.06), transparent)',
                  }}
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

        {/* ── Main content — 2-panel layout ─────────── */}
        <main className="flex-1 flex min-h-0 p-3 gap-3">
          {/* Left panel — Machine list */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-[300px] shrink-0 cinema-panel rounded-2xl overflow-hidden flex flex-col"
          >
            <SectionHeader
              icon={<Radar size={15} />}
              title="Machine Fleet"
              badge={
                <span className="text-[10px] font-medium text-text-muted tracking-wider uppercase">
                  {machines.length} units
                </span>
              }
            />

            {/* Machine cards */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              <AnimatePresence mode="popLayout">
                {machines.map((machine, idx) => {
                  const cfg = STATUS_CFG[machine.status];
                  const isSelected = selectedId === machine.id;
                  const justRepaired = repairedIds.has(machine.id);

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
                        isSelected
                          ? 'cinema-panel spotlight-gold'
                          : 'cinema-panel cinema-panel-hover border-transparent'
                      }`}
                    >
                      {/* Shimmer on failed */}
                      {machine.status === 'Failed' && (
                        <div className="absolute inset-0 warm-shimmer pointer-events-none" />
                      )}

                      {/* Green flash on repair */}
                      {justRepaired && (
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(106,171,138,0.08)' }} />
                      )}

                      <div className="relative">
                        {/* Top: name + usage % */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <motion.div
                              animate={
                                machine.status === 'NeedsFix' || machine.status === 'Failed'
                                  ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }
                                  : {}
                              }
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.bg} ${cfg.dot}`}
                            />
                            <span className="text-[13px] font-semibold text-text-primary truncate">
                              {machine.name}
                            </span>
                          </div>
                          <span className={`text-[14px] font-mono font-bold shrink-0 ${cfg.color}`}>
                            {Math.round(machine.usagePercent)}%
                          </span>
                        </div>

                        {/* Middle: status + type */}
                        <div className="flex items-center justify-between gap-2 ml-5">
                          <span className={`text-[11px] font-semibold ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <div className="flex items-center gap-1.5 text-text-muted">
                            {TYPE_ICON[machine.type]}
                            <span className="text-[10px] uppercase tracking-[0.08em]">
                              {TYPE_LABEL[machine.type]}
                            </span>
                          </div>
                        </div>

                        {/* Bottom: downtime or info + usage bar */}
                        <div className="flex items-center justify-between mt-1.5 ml-5">
                          <span className="text-[10px] text-text-muted">
                            {machine.status === 'Failed'
                              ? `${Math.round(machine.downtimeHours)}h downtime`
                              : machine.status === 'NeedsFix'
                                ? 'Waiting for repair'
                                : machine.usagePercent >= 50
                                  ? 'Getting worn'
                                  : 'Running fine'}
                          </span>
                        </div>

                        {/* Usage bar */}
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

            {/* Footer summary */}
            <div className="px-4 py-3 shrink-0">
              <div className="theater-divider mb-2" />
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-text-muted tracking-wider uppercase">
                <Tip text="Machines that are working normally with no issues.">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                    {healthyCount} Healthy
                  </span>
                </Tip>
                <Tip text="Machines that are getting worn out and should be watched.">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
                    {warningCount} Warning
                  </span>
                </Tip>
                <Tip text="Machines that have worn out completely and need to be fixed right away.">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
                    {needsFixCount + failedCount} Down
                  </span>
                </Tip>
              </div>
            </div>
          </motion.div>

          {/* Right panel — Selected machine detail + chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col min-w-0 gap-3"
          >
            {/* Main detail panel */}
            <div className="flex-1 cinema-panel rounded-2xl overflow-hidden flex flex-col min-h-0">
              {/* Machine header */}
              <div className="px-6 pt-5 pb-3">
                <div className="flex items-start gap-5">
                  {/* Usage ring */}
                  <UsageRing usage={selected.usagePercent} status={selected.status} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] mb-1">
                      {TYPE_LABEL[selected.type].toUpperCase()} / {selected.id}
                    </p>
                    <h2 className={`text-[22px] font-bold leading-tight ${selectedCfg.color}`}>
                      {selected.name}
                    </h2>
                    <p className="text-[12px] text-text-secondary mt-1.5">
                      {selected.status === 'Failed'
                        ? 'This machine broke down because it was not repaired in time.'
                        : selected.status === 'NeedsFix'
                          ? 'This machine has worn out completely and needs to be fixed.'
                          : selected.usagePercent >= 50
                            ? 'This machine is getting worn. Keep an eye on it.'
                            : 'This machine is running normally. No problems detected.'}
                    </p>
                  </div>

                  {/* Action buttons (NeedsFix) */}
                  {selected.status === 'NeedsFix' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex gap-2 shrink-0"
                    >
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

                {/* Repaired flash */}
                <AnimatePresence>
                  {repairedIds.has(selected.id) && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 flex items-center gap-2 text-accent-green"
                    >
                      <CheckCircle size={15} />
                      <span className="text-[12px] font-semibold uppercase tracking-wider">
                        Repaired! Machine is back to healthy.
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Failed warning */}
                {selected.status === 'Failed' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 breaking-alert p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-accent-red">
                      <AlertTriangle size={14} />
                      <span className="text-[12px] font-semibold">
                        This machine is down and costing time.
                      </span>
                    </div>
                    {selected.downtimeHours > 0 && (
                      <Tip text="How long this machine has been unable to work.">
                        <p className="text-[11px] text-accent-red/80 mt-1 ml-6">
                          {Math.round(selected.downtimeHours)} hours of downtime accumulated
                        </p>
                      </Tip>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Metric cards row */}
              <div className="grid grid-cols-4 gap-2.5 px-6 py-2">
                {[
                  {
                    icon: <Zap size={15} />,
                    label: 'Usage',
                    value: `${Math.round(selected.usagePercent)}%`,
                    explain: 'How much this machine has been used. Higher means closer to failure.',
                    color: selectedCfg.color,
                    accent: selectedCfg.accent,
                  },
                  {
                    icon: <Activity size={15} />,
                    label: 'Status',
                    value: selectedCfg.label,
                    explain: 'The current condition of this machine.',
                    color: selectedCfg.color,
                    accent: selectedCfg.accent,
                  },
                  {
                    icon: <Clock size={15} />,
                    label: 'Downtime',
                    value: selected.downtimeHours > 0 ? `${Math.round(selected.downtimeHours)}h` : '0h',
                    explain: 'How long this machine has been unable to work.',
                    color: selected.downtimeHours > 0 ? 'text-accent-red' : 'text-accent-green',
                    accent: selected.downtimeHours > 0 ? 'spotlight-red' : 'spotlight-green',
                  },
                  {
                    icon: <AlertTriangle size={15} />,
                    label: 'Wear Rate',
                    value: selected.type === 'conveyor' ? 'Fast' : selected.type === 'motor' ? 'Medium' : selected.type === 'pump' ? 'Moderate' : 'Slow',
                    explain: 'How quickly this type of machine wears out compared to others.',
                    color: selected.type === 'conveyor' ? 'text-accent-red' : selected.type === 'hvac' ? 'text-accent-green' : 'text-accent-gold',
                    accent: selected.type === 'conveyor' ? 'spotlight-red' : selected.type === 'hvac' ? 'spotlight-green' : 'spotlight-gold',
                  },
                ].map((stat) => (
                  <Tip key={stat.label} text={stat.explain}>
                    <div className={`cinema-panel rounded-xl px-3.5 py-3 border ${stat.accent} w-full`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-text-muted">{stat.icon}</span>
                        <p className="text-[10px] text-text-muted uppercase tracking-[0.1em]">{stat.label}</p>
                      </div>
                      <p className={`text-[16px] font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                  </Tip>
                ))}
              </div>

              <div className="theater-divider mx-6 mt-1" />

              {/* Usage History Chart */}
              <div className="flex-1 px-4 min-h-0 relative py-2">
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[11px] text-text-secondary font-medium">Usage Over Time</p>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-green" /> Healthy (below 50%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-gold" /> Warning (50-80%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-red" /> Danger (above 80%)
                    </span>
                  </div>
                </div>

                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 25, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="simUsageGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={STATUS_STROKE[selected.status]} stopOpacity={0.3} />
                          <stop offset="60%" stopColor={STATUS_STROKE[selected.status]} stopOpacity={0.08} />
                          <stop offset="100%" stopColor={STATUS_STROKE[selected.status]} stopOpacity={0} />
                        </linearGradient>
                        <filter id="simGlow">
                          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                          <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,100,80,0.08)" />
                      <XAxis
                        dataKey="day"
                        stroke="rgba(101,94,84,0.5)"
                        fontSize={10}
                        fontFamily="Inter, sans-serif"
                        tickFormatter={(v) => `Day ${v}`}
                      />
                      <YAxis
                        stroke="rgba(101,94,84,0.5)"
                        fontSize={10}
                        fontFamily="Inter, sans-serif"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      {/* Zone shading */}
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
                      <Area
                        type="monotone"
                        dataKey="usage"
                        stroke={STATUS_STROKE[selected.status]}
                        strokeWidth={2.5}
                        fill="url(#simUsageGradient)"
                        filter="url(#simGlow)"
                        isAnimationActive={false}
                      />
                      <ReferenceLine
                        y={50}
                        stroke="#d4a853"
                        strokeDasharray="4 4"
                        strokeOpacity={0.3}
                        label={{ value: 'Warning', position: 'right', fill: '#d4a853', fontSize: 9 }}
                      />
                      <ReferenceLine
                        y={80}
                        stroke="#c75050"
                        strokeDasharray="4 4"
                        strokeOpacity={0.3}
                        label={{ value: 'Danger', position: 'right', fill: '#c75050', fontSize: 9 }}
                      />
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

            {/* Bottom summary bar */}
            <div className="cinema-panel rounded-2xl px-5 py-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5 text-[12px]">
                  <Tip text="Machines that are working normally with no issues.">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-green status-dot-green" />
                      <span className="text-text-secondary font-medium">{healthyCount} Healthy</span>
                    </div>
                  </Tip>
                  <Tip text="Machines that are getting worn out and should be watched.">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-gold status-dot-yellow" />
                      <span className="text-text-secondary font-medium">{warningCount} Warning</span>
                    </div>
                  </Tip>
                  <Tip text="Machines that have worn out completely and need to be fixed right away.">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-red status-dot-red" />
                      <span className="text-text-secondary font-medium">{needsFixCount} Needs Repair</span>
                    </div>
                  </Tip>
                  <Tip text="Machines that broke down because they were not fixed in time.">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-accent-red animate-soft-pulse" />
                      <span className="text-text-secondary font-medium">{failedCount} Failed</span>
                    </div>
                  </Tip>
                </div>

                {totalDowntime > 0 && (
                  <Tip text="Total time all machines have been unable to work. Less downtime is better!">
                    <div className="flex items-center gap-2 text-accent-red font-semibold text-[12px]">
                      <Zap size={14} />
                      <span>{Math.round(totalDowntime)} hours lost</span>
                    </div>
                  </Tip>
                )}

                {isFinished && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] text-accent-gold font-semibold uppercase tracking-wider"
                  >
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

/* ── Usage Ring (like CountdownRing in RiskChart) ──── */

function UsageRing({ usage, status }: { usage: number; status: MachineStatus }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(usage / 100, 1);
  const offset = circumference * (1 - progress);
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
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="countdown-ring"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-bold font-mono" style={{ color }}>
          {Math.round(usage)}
        </span>
        <span className="text-[9px] text-text-muted uppercase tracking-wider">% used</span>
      </div>
    </div>
  );
}
