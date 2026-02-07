import type { EquipmentType, RiskLevel } from '../types';

export function estimateHoursToFailure(riskPercent: number): number {
  if (riskPercent >= 90) return 6;
  if (riskPercent >= 80) return 12;
  if (riskPercent >= 70) return 24;
  if (riskPercent >= 60) return 36;
  if (riskPercent >= 50) return 48;
  if (riskPercent >= 40) return 60;
  if (riskPercent >= 30) return 72;
  return 120;
}

export function formatTimeWindow(hours: number): string {
  if (hours <= 12) return `${hours} hours`;
  if (hours <= 48) return `${Math.round(hours / 12) * 12} hours`;
  return `${Math.round(hours / 24)} days`;
}

export function estimateDowntimeCost(type: EquipmentType, riskPercent: number): number {
  const baseCostPerHour: Record<EquipmentType, number> = {
    motor: 1500,
    pump: 1000,
    hvac: 800,
    conveyor: 2000,
  };
  const estimatedDowntimeHours = riskPercent >= 75 ? 12 : riskPercent >= 50 ? 8 : 4;
  return Math.round(baseCostPerHour[type] * estimatedDowntimeHours);
}

export function formatCurrency(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`;
  return `$${amount.toLocaleString()}`;
}

export function getStatusLabel(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'critical': return 'Order Parts Now';
    case 'high': return 'Watch Closely';
    case 'medium': return 'Monitor';
    case 'low': return 'Healthy';
  }
}

export function getStatusDescription(riskLevel: RiskLevel, riskPercent: number, type: EquipmentType): string {
  const hours = estimateHoursToFailure(riskPercent);
  switch (riskLevel) {
    case 'critical':
      return `May fail within ${formatTimeWindow(hours)}. Order replacement parts immediately.`;
    case 'high':
      return `Elevated failure risk. Consider ordering parts within ${formatTimeWindow(hours)}.`;
    case 'medium':
      return `Some wear detected. Schedule inspection within ${formatTimeWindow(hours)}.`;
    case 'low':
      return 'Operating within normal parameters. No action needed.';
  }
}

export function getRiskTrendLabel(riskPercent: number): string {
  if (riskPercent >= 80) return 'Rising fast';
  if (riskPercent >= 60) return 'Rising steadily';
  if (riskPercent >= 40) return 'Slowly increasing';
  if (riskPercent >= 20) return 'Slight increase';
  return 'Stable';
}

export function getOrderWindowLabel(riskPercent: number): string {
  if (riskPercent >= 80) return 'Order immediately';
  if (riskPercent >= 65) return 'Within 6 hours';
  if (riskPercent >= 50) return 'Within 24 hours';
  if (riskPercent >= 35) return 'Within 3 days';
  return 'No rush';
}

export function getHeadline(name: string, riskPercent: number): string {
  const hours = estimateHoursToFailure(riskPercent);
  if (riskPercent >= 75) return `${name} may fail in ${formatTimeWindow(hours)}`;
  if (riskPercent >= 50) return `${name} needs attention soon`;
  if (riskPercent >= 25) return `${name} showing early signs of wear`;
  return `${name} is running smoothly`;
}

export function getArrivalDate(leadTimeDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + leadTimeDays);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
