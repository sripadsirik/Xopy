import { motion } from 'framer-motion';
import { useLiveFeed } from '../hooks/useLiveFeed';
import AnimatedBackground from './AnimatedBackground';
import Header from './Header';
import EquipmentList from './EquipmentList';
import RiskChart from './RiskChart';
import PurchaseEngine from './PurchaseEngine';
import ControlPanel from './ControlPanel';
import AlertLog from './AlertLog';

export default function Dashboard() {
  const {
    equipment,
    selectedEquipment,
    selectedId,
    setSelectedId,
    alerts,
    isPaused,
    setIsPaused,
    controls,
    applyControls,
  } = useLiveFeed();

  const criticalCount = equipment.filter((eq) => eq.riskLevel === 'critical').length;
  const attentionCount = equipment.filter((eq) => eq.riskLevel === 'critical' || eq.riskLevel === 'high').length;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Warm spotlight background */}
      <AnimatedBackground />

      {/* Film grain texture */}
      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />

      {/* Warm ambient radial gradients */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(123,159,212,0.03) 0%, transparent 70%)' }} />
      </div>

      {/* Content Layer */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 10 }}>
        <Header
          isPaused={isPaused}
          onTogglePause={() => setIsPaused((p) => !p)}
          equipmentCount={equipment.length}
          criticalCount={criticalCount}
          attentionCount={attentionCount}
        />

        <main className="flex-1 flex min-h-0 p-3 gap-3" role="main">
          {/* Left Panel — Equipment Cast List */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="w-[300px] shrink-0 cinema-panel rounded-2xl overflow-hidden"
          >
            <EquipmentList
              equipment={equipment}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </motion.div>

          {/* Center Panel — Main Screen + What-If Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col min-w-0 gap-3"
          >
            <div className="flex-1 cinema-panel rounded-2xl overflow-hidden min-h-0">
              <RiskChart equipment={selectedEquipment} />
            </div>
            <ControlPanel controls={controls} onChange={applyControls} />
          </motion.div>

          {/* Right Panel — Buying Decision + Alerts */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-[320px] shrink-0 flex flex-col gap-3"
          >
            <div className="flex-1 cinema-panel rounded-2xl overflow-hidden min-h-0">
              <PurchaseEngine equipment={selectedEquipment} />
            </div>
            <AlertLog alerts={alerts} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
