import { Deposit, HeatmapData } from '../../../types';

export interface HeatmapState {
  displayYear: number;
  setDisplayYear: (year: number) => void;
  expandedMonth: Date | null;
  setExpandedMonth: (date: Date | null) => void;
  selectedDay: Date | null;
  setSelectedDay: (date: Date | null) => void;
  selectedBank: string;
  setSelectedBank: (bank: string) => void;
}
