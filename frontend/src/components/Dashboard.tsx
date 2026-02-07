import { motion } from 'framer-motion';
import { useLiveFeed } from '../hooks/useLiveFeed';
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
  } = useLiveFeed();

  const criticalCount = equipment.filter((eq) => eq.riskLevel === 'critical').length;
  const attentionCount = equipment.filter((eq) => eq.riskLevel === 'critical' || eq.riskLevel === 'high').length;

  return (
    <div className="h-screen flex relative overflow-hidden ops-shell">
      {/* Visual layers */}
      <div className="absolute inset-0 hud-grid pointer-events-none" style={{ zIndex: 1 }} />
      <div className="absolute inset-0 film-grain pointer-events-none" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 scanlines pointer-events-none" style={{ zIndex: 3 }} />

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div
          className="absolute top-0 left-1/4 w-[560px] h-[560px] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.035) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[480px] h-[480px] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(123,159,212,0.028) 0%, transparent 70%)' }}
        />
      </div>

      {/* Content */}
      <div className="relative flex h-full w-full" style={{ zIndex: 10 }}>
        {/* Sidebar */}
        <aside className="ops-sidebar" aria-label="Equipment fleet">
          {/* Brand */}
          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl cinema-panel spotlight-gold">
                <span className="text-accent-gold text-[14px] font-bold">XR</span>
              </div>
              <div className="leading-tight">
                <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Control Center</p>
                <p className="text-[14px] font-bold text-text-primary">Live Fleet</p>
              </div>
            </div>
          </div>

          {/* Fleet list only (no extra nav clutter) */}
          <div className="px-3 pb-3 flex-1 min-h-0">
            <div className="cinema-panel rounded-2xl overflow-hidden h-full">
              <EquipmentList equipment={equipment} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 flex flex-col min-w-0">
          <Header
            isPaused={isPaused}
            onTogglePause={() => setIsPaused((p) => !p)}
            equipmentCount={equipment.length}
            criticalCount={criticalCount}
            attentionCount={attentionCount}
          />

          {/* MAIN LAYOUT (no KPI boxes) */}
          <main className="flex-1 min-h-0 p-4 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
            {/* Left column */}
            <div className="flex flex-col min-h-0 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="flex-1 cinema-panel rounded-2xl overflow-hidden min-h-0"
              >
                <RiskChart equipment={selectedEquipment} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="cinema-panel rounded-2xl overflow-hidden"
              >
                <ControlPanel controls={{}} onChange={() => {}} />
              </motion.div>
            </div>

            {/* Right column */}
            <div className="flex flex-col min-h-0 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.07 }}
                className="cinema-panel rounded-2xl overflow-hidden min-h-0 flex-1"
              >
                <PurchaseEngine equipment={selectedEquipment} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="cinema-panel rounded-2xl overflow-hidden"
              >
                <AlertLog alerts={alerts} />
              </motion.div>
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}
