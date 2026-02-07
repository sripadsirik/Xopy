// import type { Equipment } from '../types';
// import { generateSubstitutes, getPartCategory, generateRiskCurve } from '../engine/riskEngine';
// import { useMemo } from 'react';
// import { motion } from 'framer-motion';
// import { ShoppingCart, RefreshCw, Eye, AlertTriangle, Package, Clock, Shield, DollarSign, Crosshair } from 'lucide-react';
// import SectionHeader from './SectionHeader';

// interface Props {
//   equipment: Equipment;
// }

// export default function PurchaseEngine({ equipment }: Props) {
//   const substitutes = useMemo(() => generateSubstitutes(equipment.type), [equipment.type]);
//   const partCategory = getPartCategory(equipment.type);
//   const curve = useMemo(() => generateRiskCurve(equipment.riskPercent), [equipment.riskPercent]);
//   const risk48h = curve.find((p) => p.hour === 48)?.probability ?? 0;

//   const urgencyLevel = equipment.riskPercent >= 65 ? 'critical' : equipment.riskPercent >= 40 ? 'high' : 'monitor';

//   const urgencyConfig = {
//     critical: { border: 'spotlight-red', bg: 'rgba(199,80,80,0.06)', text: 'text-accent-red', icon: 'text-accent-red' },
//     high: { border: 'spotlight-gold', bg: 'rgba(200,149,108,0.06)', text: 'text-accent-orange', icon: 'text-accent-orange' },
//     monitor: { border: 'spotlight-green', bg: 'rgba(106,171,138,0.06)', text: 'text-accent-green', icon: 'text-accent-green' },
//   }[urgencyLevel];

//   return (
//     <div className="flex flex-col h-full" role="region" aria-label="Purchase decision engine">
//       <SectionHeader
//         icon={<Crosshair size={14} />}
//         title="Purchase Decision Engine"
//       />

//       <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
//         {/* Risk Summary Card */}
//         <motion.div
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           className={`cinema-panel rounded-xl p-3.5 ${urgencyConfig.border} relative overflow-hidden`}
//           role="alert"
//         >
//           <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 30% 50%, ${urgencyConfig.bg}, transparent 70%)` }} />
//           <div className="relative flex items-start gap-2.5">
//             <motion.div
//               animate={urgencyLevel === 'critical' ? { scale: [1, 1.2, 1] } : {}}
//               transition={{ duration: 1.5, repeat: Infinity }}
//               aria-hidden="true"
//             >
//               <AlertTriangle size={18} className={urgencyConfig.icon} />
//             </motion.div>
//             <div>
//               <p className={`text-[11px] font-semibold ${urgencyConfig.text}`}>
//                 {urgencyLevel === 'critical'
//                   ? `High risk of ${equipment.failureMode} in 48 hrs`
//                   : urgencyLevel === 'high'
//                   ? `Elevated risk of ${equipment.failureMode}`
//                   : `${equipment.name} within tolerances`}
//               </p>
//               <p className="text-[9px] text-text-muted mt-1 font-mono">
//                 CURRENT {equipment.riskPercent.toFixed(1)}% / 48H PROJECTION {risk48h.toFixed(1)}%
//               </p>
//             </div>
//           </div>
//         </motion.div>

//         {/* Part Category */}
//         <motion.div
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.05 }}
//           className="cinema-panel rounded-xl p-3 spotlight-gold"
//         >
//           <div className="flex items-center gap-2 mb-1">
//             <Package size={12} className="text-accent-gold" />
//             <span className="text-[8px] text-text-muted uppercase tracking-[0.2em]">Recommended Category</span>
//           </div>
//           <p className="text-[12px] font-bold text-accent-gold">
//             {partCategory}
//           </p>
//         </motion.div>

//         {/* Action Cards */}
//         <div>
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-1 h-3 rounded-full bg-accent-blue" />
//             <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] font-bold">Actions</p>
//           </div>
//           <div className="space-y-1.5" role="group" aria-label="Purchase actions">
//             {[
//               {
//                 icon: <ShoppingCart size={15} />,
//                 label: 'Buy Now',
//                 desc: 'Order primary replacement immediately',
//                 isRecommended: urgencyLevel === 'critical',
//                 iconClass: 'text-accent-red',
//                 activeBorder: 'spotlight-red',
//               },
//               {
//                 icon: <RefreshCw size={15} />,
//                 label: 'Buy Substitute',
//                 desc: 'Compatible alternative, faster delivery',
//                 isRecommended: urgencyLevel === 'high',
//                 iconClass: 'text-accent-amber',
//                 activeBorder: 'spotlight-gold',
//               },
//               {
//                 icon: <Eye size={15} />,
//                 label: 'Monitor Only',
//                 desc: 'Risk within acceptable range',
//                 isRecommended: urgencyLevel === 'monitor',
//                 iconClass: 'text-accent-green',
//                 activeBorder: 'spotlight-green',
//               },
//             ].map((action, i) => (
//               <motion.button
//                 key={action.label}
//                 initial={{ opacity: 0, x: 10 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 transition={{ delay: 0.1 + i * 0.06 }}
//                 whileHover={{ x: 3, scale: 1.01 }}
//                 whileTap={{ scale: 0.98 }}
//                 className={`w-full text-left cinema-panel rounded-xl p-3 cursor-pointer transition-all relative overflow-hidden ${
//                   action.isRecommended ? action.activeBorder : ''
//                 }`}
//               >
//                 {action.isRecommended && <div className="absolute inset-0 warm-shimmer pointer-events-none" />}
//                 <div className="relative flex items-center gap-2.5">
//                   <span className={action.isRecommended ? action.iconClass : 'text-text-muted'}>
//                     {action.icon}
//                   </span>
//                   <div className="flex-1">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[11px] font-bold text-text-primary">{action.label}</span>
//                       {action.isRecommended && (
//                         <span className="text-[8px] bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.15em] border border-accent-gold/20">
//                           Recommended
//                         </span>
//                       )}
//                     </div>
//                     <p className="text-[9px] text-text-muted mt-0.5">{action.desc}</p>
//                   </div>
//                 </div>
//               </motion.button>
//             ))}
//           </div>
//         </div>

//         {/* Substitute Parts */}
//         <div>
//           <div className="flex items-center gap-2 mb-2">
//             <div className="w-1 h-3 rounded-full bg-accent-amber" />
//             <p className="text-[9px] text-text-muted uppercase tracking-[0.2em] font-bold">Substitute Parts</p>
//           </div>
//           <div className="space-y-1.5">
//             {substitutes.map((part, i) => (
//               <motion.div
//                 key={part.sku}
//                 initial={{ opacity: 0, y: 8 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ delay: 0.2 + i * 0.06 }}
//                 whileHover={{ y: -1 }}
//                 className="cinema-panel cinema-panel-hover rounded-xl p-3 cursor-pointer"
//               >
//                 <div className="flex items-center justify-between mb-2">
//                   <div>
//                     <p className="text-[10px] font-semibold text-text-primary">{part.name}</p>
//                     <p className="text-[8px] text-text-muted font-mono tracking-wider">{part.sku}</p>
//                   </div>
//                   <span className="text-[9px] bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded-md font-mono font-bold border border-accent-gold/20">
//                     #{i + 1}
//                   </span>
//                 </div>
//                 <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
//                   {[
//                     { icon: <Package size={9} />, label: 'Avail.', value: `${part.availability}%`, color: part.availability >= 85 ? 'text-accent-green' : part.availability >= 70 ? 'text-accent-yellow' : 'text-accent-red' },
//                     { icon: <Clock size={9} />, label: 'Lead', value: `${part.leadTimeDays}d`, color: 'text-text-primary' },
//                     { icon: <Shield size={9} />, label: 'Reduction', value: `${part.riskReduction}%`, color: 'text-accent-blue' },
//                     { icon: <DollarSign size={9} />, label: 'Price', value: `$${part.price.toFixed(2)}`, color: 'text-text-primary' },
//                   ].map((field) => (
//                     <div key={field.label} className="flex items-center gap-1.5">
//                       <span className="text-text-muted">{field.icon}</span>
//                       <span className="text-[8px] text-text-muted uppercase tracking-wider">{field.label}</span>
//                       <span className={`text-[9px] font-mono font-bold ml-auto ${field.color}`}>{field.value}</span>
//                     </div>
//                   ))}
//                 </div>
//               </motion.div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  RefreshCw,
  Eye,
  AlertTriangle,
  Package,
  Clock,
  Shield,
  Crosshair,
} from 'lucide-react';

import type { Equipment } from '../types';
import { generateRiskCurve } from '../engine/riskEngine';
import SectionHeader from './SectionHeader';

type Props = {
  equipment: Equipment;
};

export default function PurchaseEngine({ equipment }: Props) {
  const curve = useMemo(() => generateRiskCurve(equipment.riskPercent), [equipment.riskPercent]);
  const risk48h = curve.find((p) => p.hour === 48)?.probability ?? 0;

  const decision = equipment.decision;

  const urgencyLevel =
    decision?.action === 'BUY_NOW'
      ? 'critical'
      : decision?.action === 'BUY_SUBSTITUTE'
      ? 'high'
      : 'monitor';

  const urgencyConfig = {
    critical: { border: 'spotlight-red', bg: 'rgba(199,80,80,0.06)', text: 'text-accent-red', icon: 'text-accent-red' },
    high: { border: 'spotlight-gold', bg: 'rgba(200,149,108,0.06)', text: 'text-accent-orange', icon: 'text-accent-orange' },
    monitor: { border: 'spotlight-green', bg: 'rgba(106,171,138,0.06)', text: 'text-accent-green', icon: 'text-accent-green' },
  }[urgencyLevel];

  const recommendedCategories =
    decision?.recommendedCategories?.length ? decision.recommendedCategories : ['General MRO Supplies'];

  const substitutes = decision?.substitutes ?? [];

  const actions = [
    {
      id: 'buy-now',
      title: 'Buy Now',
      subtitle: 'Order immediately',
      icon: <ShoppingCart size={14} />,
      isRecommended: decision?.action === 'BUY_NOW',
    },
    {
      id: 'buy-sub',
      title: 'Buy Substitute',
      subtitle: 'If lead time is long',
      icon: <RefreshCw size={14} />,
      isRecommended: decision?.action === 'BUY_SUBSTITUTE',
    },
    {
      id: 'monitor',
      title: 'Monitor',
      subtitle: 'Re-check soon',
      icon: <Eye size={14} />,
      isRecommended: decision?.action === 'MONITOR',
    },
  ];

  return (
    <div className="h-full flex flex-col min-h-0">
      <SectionHeader
        title="Purchase Decision"
        subtitle={equipment.name}
        icon={<Crosshair size={16} />}
      />

      <div className="p-3 flex-1 min-h-0 overflow-auto space-y-3">
        {/* Summary */}
        <div
          className={`rounded-2xl p-3 border ${urgencyConfig.border}`}
          style={{ background: urgencyConfig.bg }}
        >
          <div className="flex items-start gap-2">
            <div className={`mt-0.5 ${urgencyConfig.icon}`}>
              <AlertTriangle size={14} />
            </div>
            <div className="flex-1">
              <p className={`text-[11px] font-semibold ${urgencyConfig.text}`}>
                {decision ? decision.reason : 'Waiting for live decision…'}
              </p>
              <p className="text-[9px] text-text-muted mt-1 font-mono">
                CURRENT {equipment.riskPercent.toFixed(1)}% / 48H PROJECTION {risk48h.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-2 text-[9px] text-text-muted font-mono">
            <span className="uppercase tracking-wider">CATEGORY: </span>
            <span className="text-text-primary">{recommendedCategories.join(' • ')}</span>
          </div>
        </div>

        {/* Action choices */}
        <div className="space-y-2">
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">Recommended Action</p>
          {actions.map((a) => (
            <div
              key={a.id}
              className={`cinema-panel rounded-xl p-3 border ${
                a.isRecommended ? 'border-accent-gold/40' : 'border-white/5'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`${a.isRecommended ? 'text-accent-gold' : 'text-text-muted'}`}>
                  {a.icon}
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-text-primary">{a.title}</p>
                  <p className="text-[9px] text-text-muted">{a.subtitle}</p>
                </div>
                {a.isRecommended && (
                  <span className="text-[9px] bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded-md font-mono font-bold border border-accent-gold/20">
                    RECOMMENDED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Substitutes */}
        <div className="space-y-2">
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-mono">
            Substitute Options
          </p>

          {substitutes.length === 0 ? (
            <div className="cinema-panel rounded-xl p-3 text-[9px] text-text-muted">
              {decision?.action === 'BUY_SUBSTITUTE'
                ? 'No substitutes returned.'
                : 'Substitutes appear when “Buy Substitute” is recommended.'}
            </div>
          ) : (
            substitutes.map((part, i) => (
              <motion.div
                key={`${part.name}-${i}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                whileHover={{ y: -1 }}
                className="cinema-panel cinema-panel-hover rounded-xl p-3 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[10px] font-semibold text-text-primary">{part.name}</p>
                    <p className="text-[8px] text-text-muted font-mono tracking-wider">{part.category}</p>
                  </div>
                  <span className="text-[9px] bg-accent-gold/10 text-accent-gold px-2 py-0.5 rounded-md font-mono font-bold border border-accent-gold/20">
                    #{i + 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {[
                    { icon: <Package size={9} />, label: 'Avail.', value: part.availability, color: 'text-text-primary' },
                    { icon: <Clock size={9} />, label: 'Lead', value: `${part.lead_time_days}d`, color: 'text-text-primary' },
                    { icon: <Shield size={9} />, label: 'Reduction', value: `${Math.round(part.risk_reduction * 100)}%`, color: 'text-accent-blue' },
                  ].map((field) => (
                    <div key={field.label} className="flex items-center gap-1.5">
                      <span className="text-text-muted">{field.icon}</span>
                      <span className="text-[8px] text-text-muted uppercase tracking-wider">{field.label}</span>
                      <span className={`text-[9px] font-mono font-bold ml-auto ${field.color}`}>{field.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
