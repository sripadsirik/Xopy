import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Pause, Play, Shield, AlertTriangle } from 'lucide-react';

interface Props {
  isPaused: boolean;
  onTogglePause: () => void;
  equipmentCount: number;
  criticalCount: number;
}

export default function Header({ isPaused, onTogglePause, equipmentCount, criticalCount }: Props) {
  return (
    <header className="relative h-14 shrink-0 z-20" role="banner">
      {/* Marquee background — warm dark gradient */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(22,20,28,0.95) 0%, rgba(13,11,17,0.98) 100%)',
      }} />
      {/* Bottom theater rail */}
      <div className="absolute bottom-0 left-0 right-0 theater-divider" />

      <div className="relative h-full flex items-center justify-between px-6">
        {/* Brand — marquee style */}
        <div className="flex items-center gap-4">
          <Radar size={20} className="text-accent-gold opacity-80" />
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-bold tracking-[0.18em] uppercase">
              <span className="text-accent-gold">Downtime</span>
              <span className="text-text-primary ml-1.5">Radar</span>
            </h1>
            <div className="hidden sm:block h-4 w-px bg-border-dim" />
            <span className="hidden sm:block text-[10px] text-text-muted uppercase tracking-[0.15em]">
              Industrial Reliability Dashboard
            </span>
          </div>
        </div>

        {/* Status + Controls */}
        <div className="flex items-center gap-5">
          {/* Live indicator */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg cinema-panel" role="status" aria-live="polite">
            <motion.div
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2 h-2 rounded-full bg-accent-green status-dot-green"
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium text-accent-green tracking-wide">Live</span>
            <span className="text-[11px] text-text-muted">{equipmentCount} units</span>
          </div>

          {/* Critical badge */}
          <AnimatePresence>
            {criticalCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-accent-red/20 bg-accent-red/8"
                role="alert"
              >
                <AlertTriangle size={13} className="text-accent-red" />
                <span className="text-[11px] font-semibold text-accent-red">
                  {criticalCount} Critical
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* System status */}
          <div className="hidden md:flex items-center gap-2 text-text-muted">
            <Shield size={13} />
            <span className="text-[10px] uppercase tracking-wider">Monitoring Active</span>
          </div>

          {/* Pause/Resume */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume simulation' : 'Pause simulation'}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider cursor-pointer transition-all border ${
              isPaused
                ? 'bg-accent-green/8 text-accent-green border-accent-green/20 hover:bg-accent-green/15'
                : 'bg-accent-red/8 text-accent-red border-accent-red/20 hover:bg-accent-red/15'
            }`}
          >
            {isPaused ? <Play size={12} /> : <Pause size={12} />}
            {isPaused ? 'Resume' : 'Pause'}
          </motion.button>
        </div>
      </div>

      {/* Alert ribbon — breaking-news style */}
      <AnimatePresence>
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 28 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute -bottom-7 left-0 right-0 z-10 overflow-hidden"
            role="alert"
          >
            <div
              className="h-7 flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.2em] text-accent-red/90"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(199,80,80,0.06), rgba(199,80,80,0.1), rgba(199,80,80,0.06), transparent)',
                animation: 'ribbon-scroll 3s ease-in-out infinite',
              }}
            >
              <AlertTriangle size={11} />
              <span>{criticalCount} equipment unit{criticalCount > 1 ? 's' : ''} in critical failure zone</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
