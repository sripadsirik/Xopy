import type { EquipmentType, RiskLevel, RiskCurvePoint, SubstitutePart } from '../types';

const BASE_FAILURE_RATES: Record<EquipmentType, number> = {
  motor: 0.020,
  pump: 0.025,
  hvac: 0.015,
  conveyor: 0.030,
};

const FAILURE_MODES: Record<EquipmentType, string[]> = {
  motor: ['bearing failure', 'winding insulation breakdown', 'shaft misalignment'],
  pump: ['seal leak', 'impeller cavitation', 'bearing wear'],
  hvac: ['compressor failure', 'refrigerant leak', 'fan motor burnout'],
  conveyor: ['belt wear', 'roller bearing failure', 'chain stretch'],
};

const PART_CATEGORIES: Record<EquipmentType, string> = {
  motor: 'Bearings & Motor Components',
  pump: 'Seals & Pump Repair Kits',
  hvac: 'Compressor & HVAC Parts',
  conveyor: 'Belts & Conveyor Components',
};

export function calculateRisk(
  type: EquipmentType,
  runtimeHours: number,
  heat: number,
  dust: number,
  moisture: number,
  pastFailures: number
): number {
  const baseRate = BASE_FAILURE_RATES[type];
  const runtimeMultiplier = 1 + (runtimeHours / 2000);
  const envMultiplier = 1 + (heat + dust + moisture) / 300;
  const historyPenalty = 1 + pastFailures * 0.18;

  const raw = baseRate * runtimeMultiplier * envMultiplier * historyPenalty;
  return Math.min(Math.max(raw * 100, 1), 99);
}

export function getRiskLevel(percent: number): RiskLevel {
  if (percent >= 75) return 'critical';
  if (percent >= 50) return 'high';
  if (percent >= 25) return 'medium';
  return 'low';
}

export function generateRiskCurve(currentRisk: number): RiskCurvePoint[] {
  const points: RiskCurvePoint[] = [];
  const growthRate = 0.008 + (currentRisk / 100) * 0.015;

  for (let hour = 0; hour <= 72; hour += 1) {
    const base = currentRisk + (100 - currentRisk) * (1 - Math.exp(-growthRate * hour));
    const probability = Math.min(base, 99);
    const spread = 3 + hour * 0.15;
    points.push({
      hour,
      probability: Math.round(probability * 10) / 10,
      upper: Math.min(Math.round((probability + spread) * 10) / 10, 99),
      lower: Math.max(Math.round((probability - spread) * 10) / 10, 0),
    });
  }
  return points;
}

export function getFailureMode(type: EquipmentType): string {
  const modes = FAILURE_MODES[type];
  return modes[Math.floor(Math.random() * modes.length)];
}

export function getPartCategory(type: EquipmentType): string {
  return PART_CATEGORIES[type];
}

export function generateSubstitutes(type: EquipmentType): SubstitutePart[] {
  const parts: Record<EquipmentType, SubstitutePart[]> = {
    motor: [
      { name: 'SKF Deep Groove Ball Bearing 6205', sku: 'GRG-6205-2RS', availability: 95, leadTimeDays: 1, riskReduction: 85, price: 18.50 },
      { name: 'NTN Bearing 6205LLU', sku: 'GRG-NTN-6205', availability: 88, leadTimeDays: 2, riskReduction: 80, price: 15.75 },
      { name: 'FAG Bearing 6205-2RSR', sku: 'GRG-FAG-6205', availability: 72, leadTimeDays: 3, riskReduction: 82, price: 22.00 },
    ],
    pump: [
      { name: 'Mechanical Seal Type 21 - 1.75"', sku: 'GRG-SEAL-175', availability: 90, leadTimeDays: 1, riskReduction: 90, price: 45.00 },
      { name: 'Pump Repair Kit - Centrifugal', sku: 'GRG-PRK-100', availability: 85, leadTimeDays: 2, riskReduction: 75, price: 120.00 },
      { name: 'Carbon/Ceramic Seal Assembly', sku: 'GRG-CCS-200', availability: 65, leadTimeDays: 4, riskReduction: 88, price: 65.00 },
    ],
    hvac: [
      { name: 'Scroll Compressor 3-Ton', sku: 'GRG-COMP-3T', availability: 78, leadTimeDays: 3, riskReduction: 92, price: 450.00 },
      { name: 'Compressor Start Capacitor Kit', sku: 'GRG-CAP-45', availability: 95, leadTimeDays: 1, riskReduction: 60, price: 25.00 },
      { name: 'Fan Motor Assembly 1/3 HP', sku: 'GRG-FMA-33', availability: 82, leadTimeDays: 2, riskReduction: 78, price: 185.00 },
    ],
    conveyor: [
      { name: 'Conveyor Belt 36" x 50ft PVC', sku: 'GRG-BELT-36', availability: 70, leadTimeDays: 5, riskReduction: 95, price: 320.00 },
      { name: 'Idler Roller Bearing Set (10pk)', sku: 'GRG-IDL-10', availability: 92, leadTimeDays: 1, riskReduction: 70, price: 85.00 },
      { name: 'Drive Chain #60 - 10ft', sku: 'GRG-CH60-10', availability: 88, leadTimeDays: 2, riskReduction: 80, price: 55.00 },
    ],
  };
  return parts[type];
}
