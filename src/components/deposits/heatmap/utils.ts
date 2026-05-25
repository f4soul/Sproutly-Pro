import { HeatmapData } from '../../../types';

export const getIntensity = (amount: number, heatmapData: HeatmapData) => {
  if (amount === 0) return 0;
  if (heatmapData.maxAmount === heatmapData.minAmount) return 0.5;
  const ratio = (amount - heatmapData.minAmount) / (heatmapData.maxAmount - heatmapData.minAmount);
  return 0.2 + 0.8 * Math.pow(ratio, 0.4);
};

export const getColorClass = (intensity: number) => {
  if (intensity === 0) return 'bg-slate-100/50 dark:bg-white/[0.03] border-transparent';
  if (intensity < 0.3) return 'bg-deposit-100 dark:bg-deposit-950/60 text-deposit-800 dark:text-deposit-400 border-deposit-200/50';
  if (intensity < 0.5) return 'bg-deposit-200 dark:bg-deposit-900/60 text-deposit-900 dark:text-deposit-300 border-deposit-300/50';
  if (intensity < 0.75) return 'bg-deposit-400 dark:bg-deposit-800/80 text-white dark:text-deposit-50 border-deposit-400/50';
  return 'bg-deposit-500 dark:bg-deposit-500 text-white border-deposit-600/50';
};
