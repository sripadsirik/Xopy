import { AnimatePresence, motion } from 'framer-motion';
import { Routes, Route, useLocation } from 'react-router-dom';

import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import SimulationView from './components/SimulationView';

function Page({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <motion.div
      key={pageKey}
      initial={{ opacity: 0, clipPath: 'inset(0 50% 0 50%)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0%)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen w-full"
    >
      {children}
    </motion.div>
  );
}

function LandingWrapper() {
  // landing has its own vibe: different exit like before
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="h-screen w-full"
    >
      <LandingPage />
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingWrapper />} />
        <Route
          path="/dashboard"
          element={
            <Page pageKey="dashboard">
              <Dashboard />
            </Page>
          }
        />
        <Route
          path="/simulation"
          element={
            <Page pageKey="simulation">
              <SimulationView />
            </Page>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}
