import { motion, AnimatePresence } from 'framer-motion';
import type { AlertEvent } from '../types';
import { Bell, AlertTriangle, XCircle } from 'lucide-react';
import GlassPanel from './GlassPanel';

interface Props {
  alerts: AlertEvent[];
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

export default function AlertLog({ alerts }: Props) {
  return (
    <GlassPanel accent={alerts.some((a) => a.severity === 'critical') ? 'red' : 'gold'} delay={0.3}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-3 rounded-full bg-accent-gold" />
          <Bell size={13} className="text-accent-gold" />
          <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Alert Log</h3>
        </div>
        {alerts.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border border-accent-red/30 bg-accent-red/10 text-accent-red"
            aria-label={`${alerts.length} alerts`}
          >
            {alerts.length}
          </motion.span>
        )}
      </div>
      <div className="theater-divider mx-4" />
      <div className="max-h-36 overflow-y-auto" role="log" aria-label="Alert history" aria-live="polite">
        {alerts.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-[10px] text-text-muted tracking-wider uppercase">No alerts — monitoring active</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {alerts.slice(0, 15).map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ duration: 0.3 }}
                className="px-4 py-2 flex items-start gap-2.5 border-b border-border-dim"
              >
                {alert.severity === 'critical' ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }} aria-hidden="true">
                    <XCircle size={12} className="text-accent-red mt-0.5" />
                  </motion.div>
                ) : (
                  <AlertTriangle size={12} className="text-accent-yellow mt-0.5" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-text-primary leading-snug">{alert.message}</p>
                  <p className="text-[8px] text-text-muted mt-0.5 font-mono tracking-wider">{timeAgo(alert.timestamp)}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </GlassPanel>
  );
}
