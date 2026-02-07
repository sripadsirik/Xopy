import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Eye,
  AlertTriangle,
  Package,
  Clock,
  Shield,
  CheckCircle,
  Truck,
} from 'lucide-react';

import type { Equipment } from '../types';
import { generateRiskCurve } from '../engine/riskEngine';
import {
  estimateHoursToFailure,
  formatTimeWindow,
  getArrivalDate,
  getOrderWindowLabel,
} from '../engine/humanReadable';
import SectionHeader from './SectionHeader';

type Props = {
  equipment: Equipment;
};

export default function PurchaseEngine({ equipment }: Props) {
  const curve = useMemo(() => generateRiskCurve(equipment.riskPercent), [equipment.riskPercent]);
  const risk48h = curve.find((p) => p.hour === 48)?.probability ?? 0;

  const decision = equipment.decision;
  const hoursToFailure = estimateHoursToFailure(equipment.riskPercent);
  const orderWindow = getOrderWindowLabel(equipment.riskPercent);

  const urgencyLevel =
    decision?.action === 'BUY_NOW'
      ? 'critical'
      : decision?.action === 'BUY_SUBSTITUTE'
      ? 'high'
      : 'monitor';

  const actionLabel =
    urgencyLevel === 'critical' ? 'Buy Now' :
    urgencyLevel === 'high' ? 'Buy Substitute' : 'Monitor Only';

  const actionIcon =
    urgencyLevel === 'critical' ? <ShoppingCart size={18} /> :
    urgencyLevel === 'high' ? <Truck size={18} /> : <Eye size={18} />;

  const actionColor =
    urgencyLevel === 'critical' ? 'text-accent-red' :
    urgencyLevel === 'high' ? 'text-accent-orange' : 'text-accent-green';

  const actionBg =
    urgencyLevel === 'critical' ? 'cta-button-danger' :
    urgencyLevel === 'high' ? 'cta-button' : '';

  const substitutes = decision?.substitutes ?? [];
  const categories = decision?.recommendedCategories ?? [];

  const whyReasons = useMemo(() => {
    const reasons: string[] = [];
    if (equipment.riskPercent >= 65) {
      reasons.push(`Failure chance is ${equipment.riskPercent.toFixed(0)}% — above safe threshold`);
    }
    if (risk48h >= 70) {
      reasons.push(`48-hour forecast shows ${risk48h.toFixed(0)}% failure probability`);
    }
    if (hoursToFailure <= 36) {
      reasons.push(`Equipment may fail within ${formatTimeWindow(hoursToFailure)}`);
    }
    if (equipment.failureMode) {
      reasons.push(`Detected failure pattern: ${equipment.failureMode}`);
    }
    if (substitutes.length > 0) {
      const fastest = Math.min(...substitutes.map(s => s.lead_time_days));
      reasons.push(`Fastest replacement arrives in ${fastest} day${fastest > 1 ? 's' : ''}`);
    }
    if (reasons.length === 0) {
      reasons.push('Equipment is operating within normal parameters');
      reasons.push('No immediate action required — continue monitoring');
    }
    return reasons;
  }, [equipment.riskPercent, risk48h, hoursToFailure, equipment.failureMode, substitutes]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <SectionHeader
        title="Buying Decision"
        subtitle={equipment.name}
        icon={<ShoppingCart size={16} />}
      />

      <div className="p-4 flex-1 min-h-0 overflow-auto space-y-4">
        {/* Recommended Action — Hero */}
        <div className={`rounded-2xl p-4 border ${
          urgencyLevel === 'critical' ? 'spotlight-red' :
          urgencyLevel === 'high' ? 'spotlight-gold' : 'spotlight-green'
        }`}
          style={{
            background: urgencyLevel === 'critical' ? 'rgba(199,80,80,0.06)' :
              urgencyLevel === 'high' ? 'rgba(200,149,108,0.06)' : 'rgba(106,171,138,0.06)',
          }}
          role="alert"
        >
          <p className="text-[10px] text-text-muted uppercase tracking-[0.15em] mb-2">Recommended Action</p>
          <div className="flex items-center gap-3 mb-3">
            <span className={actionColor}>{actionIcon}</span>
            <h3 className={`text-[20px] font-bold ${actionColor}`}>{actionLabel}</h3>
          </div>

          {decision?.reason && (
            <p className="text-[12px] text-text-secondary leading-relaxed">
              {decision.reason}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-[11px] text-text-muted">
            <span>Risk window: <strong className="text-text-primary">{orderWindow}</strong></span>
            {categories.length > 0 && (
              <span>Category: <strong className="text-text-primary">{categories[0]}</strong></span>
            )}
          </div>
        </div>

        {/* Why Box — Bullet List of Reasons */}
        <div className="why-box rounded-lg p-4">
          <p className="text-[11px] font-semibold text-accent-gold uppercase tracking-[0.12em] mb-2.5">
            Why this recommendation?
          </p>
          <ul className="space-y-2">
            {whyReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-text-secondary leading-relaxed">
                <CheckCircle size={14} className="text-accent-gold shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Parts Table */}
        {substitutes.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.12em] mb-2.5">
              Available Parts
            </p>
            <div className="space-y-2">
              {substitutes.map((part, i) => (
                <motion.div
                  key={`${part.name}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06 }}
                  className="cinema-panel cinema-panel-hover rounded-xl p-3.5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <p className="text-[12px] font-semibold text-text-primary">{part.name}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">{part.category}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <Package size={12} className="text-text-muted" />
                      <div>
                        <p className="text-[9px] text-text-muted uppercase">Availability</p>
                        <p className={`text-[12px] font-semibold ${
                          part.availability === 'In Stock' ? 'text-accent-green' :
                          part.availability === 'Limited' ? 'text-accent-yellow' : 'text-accent-red'
                        }`}>{part.availability}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-text-muted" />
                      <div>
                        <p className="text-[9px] text-text-muted uppercase">Arrives</p>
                        <p className="text-[12px] font-semibold text-text-primary">
                          {getArrivalDate(part.lead_time_days)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield size={12} className="text-text-muted" />
                      <div>
                        <p className="text-[9px] text-text-muted uppercase">Risk reduced</p>
                        <p className="text-[12px] font-semibold text-accent-blue">
                          {Math.round(part.risk_reduction * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* CTA Button */}
        {urgencyLevel !== 'monitor' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-3.5 rounded-xl text-[13px] font-bold uppercase tracking-[0.1em] cursor-pointer flex items-center justify-center gap-2.5 ${actionBg}`}
            aria-label={`${actionLabel} for ${equipment.name}`}
          >
            {actionIcon}
            {actionLabel} — {equipment.name}
          </motion.button>
        )}

        {urgencyLevel === 'monitor' && (
          <div className="cinema-panel rounded-xl p-4 text-center">
            <Eye size={20} className="text-accent-green mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-accent-green">No Action Needed</p>
            <p className="text-[11px] text-text-muted mt-1">
              This equipment is running within safe parameters. We'll alert you if that changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
