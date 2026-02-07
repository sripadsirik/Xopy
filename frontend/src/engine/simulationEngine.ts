// simulationEngine.ts
// Pure simulation logic — no React, no UI. Imported by the SimulationView.

import type { Equipment, EquipmentType, MachineStatus } from '../data/equipment';

/* ── Speed ──────────────────────────────────────────── */

export type SimSpeed = 'slow' | 'medium' | 'fast';

/** How many simulated days pass per tick at each speed */
export const DAYS_PER_TICK: Record<SimSpeed, number> = {
  slow: 1,
  medium: 7,
  fast: 30,
};

/** Human label for the current speed */
export const SPEED_LABELS: Record<SimSpeed, string> = {
  slow: 'Days',
  medium: 'Weeks',
  fast: 'Months',
};

/* ── Wear rates ─────────────────────────────────────── */

/**
 * Average usage-% a machine gains per simulated day.
 * Tuned so that within a 6-month window every type can
 * reach 100 % if left unrepaired, but at different times.
 *
 *   conveyor  → ~day 90   (fastest to wear)
 *   motor     → ~day 105
 *   pump      → ~day 120
 *   hvac      → ~day 150  (slowest)
 */
const WEAR_RATES: Record<EquipmentType, number> = {
  conveyor: 1.11,
  motor: 0.95,
  pump: 0.83,
  hvac: 0.67,
};

/* ── Dates ──────────────────────────────────────────── */

export const SIM_START = new Date(2025, 0, 1);   // Jan 1 2025
export const TOTAL_SIM_DAYS = 180;               // 6 months

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

export function getStatusFromUsage(usage: number): MachineStatus {
  if (usage >= 100) return 'NeedsFix';
  if (usage >= 50) return 'Warning';
  return 'Healthy';
}

/* ── Tick: advance one machine ──────────────────────── */

export function advanceMachine(machine: Equipment, days: number): Equipment {
  // Failed machines accumulate downtime but nothing else changes
  if (machine.status === 'Failed') {
    return {
      ...machine,
      downtimeHours: machine.downtimeHours + days * 24,
    };
  }

  // NeedsFix machines are frozen — waiting for user to Fix or Ignore
  if (machine.status === 'NeedsFix') {
    return machine;
  }

  // Normal wear: base rate * days * random jitter (0.7 – 1.3)
  const rate = WEAR_RATES[machine.type];
  const jitter = 0.7 + Math.random() * 0.6;
  const wear = rate * days * jitter;
  const newUsage = Math.min(machine.usagePercent + wear, 100);
  const newStatus = getStatusFromUsage(newUsage);

  return {
    ...machine,
    usagePercent: newUsage,
    lastStatus: machine.status,
    status: newStatus,
  };
}

/** Advance every machine in the fleet */
export function advanceAllMachines(machines: Equipment[], days: number): Equipment[] {
  return machines.map((m) => advanceMachine(m, days));
}

/* ── User actions ───────────────────────────────────── */

/** Fix Now — resets usage to 0 %, status to Healthy */
export function repairMachine(machine: Equipment): Equipment {
  return {
    ...machine,
    usagePercent: 0,
    status: 'Healthy',
    lastStatus: machine.status,
    downtimeHours: 0,
  };
}

/** Ignore — machine becomes Failed and starts accumulating downtime */
export function ignoreMachine(machine: Equipment): Equipment {
  return {
    ...machine,
    status: 'Failed',
    lastStatus: machine.status,
  };
}
