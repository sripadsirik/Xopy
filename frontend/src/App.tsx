import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SimulationView from './components/SimulationView';

type Screen = 'landing' | 'dashboard' | 'simulation';

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');

  const handleEnter = useCallback(() => setScreen('dashboard'), []);
  const handleSimulation = useCallback(() => setScreen('simulation'), []);
  const handleBack = useCallback(() => setScreen('landing'), []);

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === 'landing' ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h-screen w-full"
          >
            <LandingPage onEnter={handleEnter} onSimulation={handleSimulation} />
          </motion.div>
        ) : screen === 'simulation' ? (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, clipPath: 'inset(0 50% 0 50%)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0%)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-screen w-full"
          >
            <SimulationView onBack={handleBack} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, clipPath: 'inset(0 50% 0 50%)' }}
            animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0%)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="h-screen w-full"
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(22, 20, 28, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#ece7df',
            border: '1px solid rgba(200, 170, 110, 0.2)',
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(212,168,83,0.06)',
            padding: '12px 16px',
          },
          success: {
            style: { borderColor: 'rgba(106, 171, 138, 0.3)' },
            iconTheme: { primary: '#6aab8a', secondary: '#0d0b11' },
          },
          error: {
            style: {
              borderColor: 'rgba(199, 80, 80, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(199,80,80,0.08)',
            },
            iconTheme: { primary: '#c75050', secondary: '#0d0b11' },
          },
        }}
      />
    </>
  );
}
