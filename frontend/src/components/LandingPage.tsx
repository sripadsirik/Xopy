import { motion } from 'framer-motion';
import { Radar, ArrowRight, Play } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';

interface Props {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="h-screen w-full relative overflow-hidden flex items-center justify-center">
      {/* Animated spotlight background */}
      <AnimatedBackground />

      {/* Film grain */}
      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />

      {/* Center spotlight glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.06) 0%, transparent 60%)' }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[600px]"
          style={{
            background: 'linear-gradient(180deg, rgba(212,168,83,0.03) 0%, transparent 80%)',
            clipPath: 'polygon(40% 0%, 60% 0%, 80% 100%, 20% 100%)',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl px-8">
        {/* Logo + Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="p-3 rounded-2xl cinema-panel spotlight-gold">
            <Radar size={32} className="text-accent-gold" />
          </div>
          <h1 className="text-[28px] font-bold tracking-[0.2em] uppercase">
            <span className="text-accent-gold">Downtime</span>
            <span className="text-text-primary ml-2">Radar</span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-[36px] font-bold text-text-primary leading-tight mb-4"
        >
          Order before downtime does.
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="text-[16px] text-text-secondary leading-relaxed mb-10 max-w-lg mx-auto"
        >
          AI-powered equipment monitoring that predicts failures before they happen
          — and tells you exactly what to buy, when.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnter}
            className="cta-button px-8 py-4 rounded-xl text-[15px] font-bold uppercase tracking-[0.12em] cursor-pointer flex items-center gap-3"
          >
            <ArrowRight size={18} />
            Enter Operations Theater
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnter}
            className="cinema-panel cinema-panel-hover px-8 py-4 rounded-xl text-[15px] font-semibold text-text-secondary uppercase tracking-[0.12em] cursor-pointer flex items-center gap-3 border border-border-dim hover:text-text-primary transition-colors"
          >
            <Play size={16} />
            Start Demo
          </motion.button>
        </motion.div>

        {/* Bottom info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 flex items-center justify-center gap-6 text-[11px] text-text-muted uppercase tracking-[0.15em]"
        >
          <span>Real-time ML predictions</span>
          <span className="w-1 h-1 rounded-full bg-accent-gold opacity-50" />
          <span>Live equipment monitoring</span>
          <span className="w-1 h-1 rounded-full bg-accent-gold opacity-50" />
          <span>Instant purchase decisions</span>
        </motion.div>
      </div>

      {/* Curtain edges — decorative side gradients */}
      <div className="absolute inset-y-0 left-0 w-32 pointer-events-none curtain-left" style={{ zIndex: 3 }} />
      <div className="absolute inset-y-0 right-0 w-32 pointer-events-none curtain-right" style={{ zIndex: 3 }} />

      {/* Bottom theater rail */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="theater-divider" />
        <div className="h-8 flex items-center justify-center" style={{
          background: 'linear-gradient(180deg, rgba(13,11,17,0.95) 0%, rgba(13,11,17,1) 100%)',
        }}>
          <p className="text-[9px] text-text-muted uppercase tracking-[0.25em]">
            SparkHacks 2026 — Predictive Maintenance for Grainger
          </p>
        </div>
      </div>
    </div>
  );
}
