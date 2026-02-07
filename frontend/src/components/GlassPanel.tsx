import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  accent?: 'gold' | 'red' | 'green' | 'blue' | 'none';
  delay?: number;
  hover?: boolean;
}

const accentMap = {
  gold: 'spotlight-gold',
  red: 'spotlight-red',
  green: 'spotlight-green',
  blue: 'spotlight-blue',
  none: '',
};

export default function GlassPanel({ children, className = '', accent = 'none', delay = 0, hover = false }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -1, transition: { duration: 0.3 } } : undefined}
      className={`cinema-panel rounded-xl overflow-hidden ${accentMap[accent]} ${hover ? 'cinema-panel-hover' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
