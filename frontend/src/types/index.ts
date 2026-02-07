export type EquipmentType = 'motor' | 'pump' | 'hvac' | 'conveyor';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

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
}

export interface SensorReading {
  timestamp: number;
  temperature: number;
  vibration: number;
  pressure: number;
}

export interface RiskCurvePoint {
  hour: number;
  probability: number;
  upper: number;
  lower: number;
}

export interface SubstitutePart {
  name: string;
  sku: string;
  availability: number;
  leadTimeDays: number;
  riskReduction: number;
  price: number;
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  equipmentId: string;
  equipmentName: string;
  message: string;
  severity: 'warning' | 'critical';
}

export interface SimulationControls {
  runtimeHours: number;
  heat: number;
  dust: number;
  moisture: number;
  pastFailures: number;
}
