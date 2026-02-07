export type EquipmentType = 'motor' | 'pump' | 'hvac' | 'conveyor';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface SensorReading {
  timestamp: number;
  temperature: number;
  vibration: number;
  pressure: number;
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  equipmentId: string;
  equipmentName: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
}

export interface SimulationControls {
  runtimeHours: number;
  heat: number;
  dust: number;
  moisture: number;
  pastFailures: number;
}

export interface RiskCurvePoint {
  hour: number;
  probability: number;
  upper: number;
  lower: number;
}

export type PurchaseAction = 'BUY_NOW' | 'BUY_SUBSTITUTE' | 'MONITOR';

export interface BackendSubstitute {
  name: string;
  category: string;
  availability: string;     // "In Stock" | "Limited" | "Backorder"
  lead_time_days: number;
  risk_reduction: number;   // 0..1
}

export interface PurchaseDecision {
  action: PurchaseAction;
  reason: string;
  recommendedCategories: string[];
  substitutes: BackendSubstitute[];
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  riskPercent: number;
  riskLevel: RiskLevel;
  runtimeHours: number;
  environmentSeverity: { heat: number; dust: number; moisture: number };
  pastFailures: number;
  sensorData: SensorReading[];
  failureMode: string;
  lastMaintenance: string;
  decision?: PurchaseDecision;
}

export interface SubstitutePart {
  name: string;
  sku: string;
  availability: number;
  leadTimeDays: number;
  riskReduction: number;
  price: number;
}
