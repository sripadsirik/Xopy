// simulationEngine.ts
// Pure simulation logic — no React, no UI.
// Uses the sim-specific types (not the dashboard Equipment type).

import type { SimMachine, SimEquipmentType, SimMachineStatus } from '../data/simEquipment';

/* ── Speed ──────────────────────────────────────────── */

export type SimSpeed = 'slow' | 'medium' | 'fast';

export const DAYS_PER_TICK: Record<SimSpeed, number> = {
  slow: 1,
  medium: 7,
  fast: 30,
};

export const SPEED_LABELS: Record<SimSpeed, string> = {
  slow: 'Days',
  medium: 'Weeks',
  fast: 'Months',
};

/* ── Wear rates (% per day) ─────────────────────────── */

const WEAR_RATES: Record<SimEquipmentType, number> = {
  conveyor: 1.11,   // ~day 90
  motor: 0.95,      // ~day 105
  pump: 0.83,       // ~day 120
  hvac: 0.67,       // ~day 150
};

/* ── Dates ──────────────────────────────────────────── */

export const SIM_START = new Date(2025, 0, 1);
export const TOTAL_SIM_DAYS = 180;

export function getSimDate(dayOffset: number): Date {
  const d = new Date(SIM_START);
  d.setDate(d.getDate() + Math.min(dayOffset, TOTAL_SIM_DAYS));
  return d;
}

export function formatSimDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ── Status derivation ──────────────────────────────── */

export function getStatusFromUsage(usage: number): SimMachineStatus {
  if (usage >= 100) return 'NeedsFix';
  if (usage >= 50) return 'Warning';
  return 'Healthy';
}

/* ── Tick logic ─────────────────────────────────────── */

export function advanceMachine(machine: SimMachine, days: number, wearMultiplier = 1): SimMachine {
  if (machine.status === 'Failed') {
    return { ...machine, downtimeHours: machine.downtimeHours + days * 24 };
  }
  if (machine.status === 'NeedsFix') {
    return machine;
  }

  const rate = WEAR_RATES[machine.type];
  const jitter = 0.7 + Math.random() * 0.6;
  const wear = rate * days * jitter * Math.max(0, wearMultiplier);
  const newUsage = Math.min(machine.usagePercent + wear, 100);
  const newStatus = getStatusFromUsage(newUsage);

  return { ...machine, usagePercent: newUsage, lastStatus: machine.status, status: newStatus };
}

export function advanceAllMachines(machines: SimMachine[], days: number, wearMultiplier = 1): SimMachine[] {
  return machines.map((m) => advanceMachine(m, days, wearMultiplier));
}

/* ── User actions ───────────────────────────────────── */

export function repairMachine(machine: SimMachine): SimMachine {
  return { ...machine, usagePercent: 0, status: 'Healthy', lastStatus: machine.status, downtimeHours: 0 };
}

export function ignoreMachine(machine: SimMachine): SimMachine {
  return { ...machine, status: 'Failed', lastStatus: machine.status };
}
