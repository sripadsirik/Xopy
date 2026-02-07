// simEquipment.ts
// Self-contained equipment model for the Simulation view.
// Completely separate from the dashboard's Equipment type in ../types.

export type SimEquipmentType = 'motor' | 'pump' | 'hvac' | 'conveyor';

export type SimMachineStatus = 'Healthy' | 'Warning' | 'NeedsFix' | 'Failed';

export interface SimMachine {
  id: string;
  name: string;
  type: SimEquipmentType;
  usagePercent: number;
  status: SimMachineStatus;
  downtimeHours: number;
  lastStatus: SimMachineStatus;
}

export function createSimMachines(): SimMachine[] {
  const SEEDS: Array<Pick<SimMachine, 'id' | 'name' | 'type'>> = [
    { id: 'S-01', name: 'Main Motor',    type: 'motor' },
    { id: 'S-02', name: 'Water Pump',    type: 'pump' },
    { id: 'S-03', name: 'Air Cooler',    type: 'hvac' },
    { id: 'S-04', name: 'Conveyor Belt', type: 'conveyor' },
    { id: 'S-05', name: 'Backup Motor',  type: 'motor' },
    { id: 'S-06', name: 'Oil Pump',      type: 'pump' },
    { id: 'S-07', name: 'Roof Cooler',   type: 'hvac' },
    { id: 'S-08', name: 'Package Mover', type: 'conveyor' },
  ];

  return SEEDS.map((s) => ({
    ...s,
    usagePercent: 0,
    status: 'Healthy' as SimMachineStatus,
    lastStatus: 'Healthy' as SimMachineStatus,
    downtimeHours: 0,
  }));
}
