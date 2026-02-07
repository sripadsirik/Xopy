import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Pause, Play, AlertTriangle } from 'lucide-react';

interface Props {
  isPaused: boolean;
  onTogglePause: () => void;
  equipmentCount: number;
  criticalCount: number;
  attentionCount: number;
}

export default function Header({ isPaused, onTogglePause, equipmentCount, criticalCount, attentionCount }: Props) {
  const summaryText = attentionCount === 0
    ? 'All Equipment Running Smoothly'
    : `${attentionCount} Machine${attentionCount > 1 ? 's' : ''} Need${attentionCount === 1 ? 's' : ''} Attention Today`;

  return (
    <header className="relative shrink-0 z-20 marquee-header" role="banner">
      <div className="relative flex items-center justify-between px-6 py-3">
        {/* Left — Brand + Headline */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <Radar size={22} className="text-accent-gold opacity-80" />
            <h1 className="text-[15px] font-bold tracking-[0.15em] uppercase">
              <span className="text-accent-gold">Downtime</span>
              <span className="text-text-primary ml-1.5">Radar</span>
            </h1>
          </div>

          <div className="hidden sm:block h-5 w-px bg-border-dim" />

          {/* Marquee headline */}
          <div className="hidden sm:block">
            <p className="text-[15px] font-semibold text-text-primary leading-tight">
              {summaryText}
            </p>
            <AnimatePresence>
              {criticalCount > 0 && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[12px] text-accent-red font-medium mt-0.5 flex items-center gap-1.5"
                >
                  <AlertTriangle size={12} />
                  {criticalCount} Critical — Order Parts Now
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right — Status + Controls */}
        <div className="flex items-center gap-4">
          {/* Live indicator */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg cinema-panel" role="status" aria-live="polite">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2.5 h-2.5 rounded-full bg-accent-green status-dot-green"
              aria-hidden="true"
            />
            <span className="text-[12px] font-medium text-accent-green tracking-wide">Live</span>
            <span className="text-[12px] text-text-muted">{equipmentCount} units</span>
          </div>

          {/* Pause/Resume */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume monitoring' : 'Pause monitoring'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold uppercase tracking-wider cursor-pointer transition-all border ${
              isPaused
                ? 'bg-accent-green/8 text-accent-green border-accent-green/20 hover:bg-accent-green/15'
                : 'bg-accent-red/8 text-accent-red border-accent-red/20 hover:bg-accent-red/15'
            }`}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            {isPaused ? 'Resume' : 'Pause'}
          </motion.button>
        </div>
      </div>

      {/* Bottom theater rail */}
      <div className="theater-divider" />

      {/* Alert ribbon — breaking-news style */}
      <AnimatePresence>
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="overflow-hidden"
            role="alert"
          >
            <div
              className="h-8 flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.15em] text-accent-red/90"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(199,80,80,0.06), rgba(199,80,80,0.1), rgba(199,80,80,0.06), transparent)',
                animation: 'ribbon-scroll 3s ease-in-out infinite',
              }}
            >
              <AlertTriangle size={12} />
              <span>{criticalCount} equipment unit{criticalCount > 1 ? 's' : ''} in critical failure zone — immediate action recommended</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
