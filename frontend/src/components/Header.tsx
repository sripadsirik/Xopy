// src/components/Header.tsx
import { motion } from "framer-motion";
import { Radar, Pause, Play } from "lucide-react";

interface Props {
  isPaused: boolean;
  onTogglePause: () => void;
  equipmentCount: number;
  criticalCount: number;
  attentionCount: number;
}

export default function Header({
  isPaused,
  onTogglePause,
  equipmentCount,
  criticalCount,
  attentionCount,
}: Props) {
  const summaryText =
    attentionCount === 0
      ? "All Equipment Running Smoothly"
      : `${attentionCount} Machine${attentionCount > 1 ? "s" : ""} Need${
          attentionCount === 1 ? "s" : ""
        } Attention Today`;

  return (
    <header className="relative shrink-0 z-20 ops-header" role="banner">
      <div className="relative flex items-center justify-between px-6 py-4">
        <div className="flex-1" />

        <div className="flex items-center gap-5">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl cinema-panel spotlight-gold">
              <Radar size={18} className="text-accent-gold" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-[0.22em]">
                Operations Theater
              </p>
              <h1 className="text-[16px] font-bold text-text-primary">Xopy</h1>
            </div>
          </div>

          {/* Status summary */}
          <div className="hidden md:flex items-center gap-3">
            <div className="ops-chip">
              <span className="chip-dot bg-accent-green" />
              <span className="text-[11px] text-text-secondary">{summaryText}</span>
            </div>

            {criticalCount > 0 && (
              <div className="ops-chip danger">
                <span className="chip-dot bg-accent-red" />
                <span className="text-[11px] text-accent-red">
                  {criticalCount} Critical
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <div className="ops-chip" role="status" aria-live="polite">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-2 h-2 rounded-full bg-accent-green status-dot-green"
                aria-hidden="true"
              />
              <span className="text-[11px] text-text-secondary">
                {equipmentCount} units
              </span>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onTogglePause}
              aria-label={isPaused ? "Resume monitoring" : "Pause monitoring"}
              className={`ops-button ${isPaused ? "resume" : "pause"}`}
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
              {isPaused ? "Resume" : "Pause"}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="theater-divider" />
    </header>
  );
}
