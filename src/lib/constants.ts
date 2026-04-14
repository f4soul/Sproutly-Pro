import { TaxBracket } from '../types';

export const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export const QUARTERS = [
  { name: 'I Квартал', months: [0, 1, 2] },
  { name: 'II Квартал', months: [3, 4, 5] },
  { name: 'III Квартал', months: [6, 7, 8] },
  { name: 'IV Квартал', months: [9, 10, 11] }
];

export const DEFAULT_NORMS: Record<number, number[]> = {
  2024: [17, 20, 20, 21, 20, 19, 23, 22, 21, 23, 21, 21],
  2025: [17, 20, 21, 22, 18, 20, 23, 21, 22, 23, 19, 22],
  2026: [15, 19, 22, 22, 19, 20, 23, 21, 22, 22, 20, 22],
};

export const DEFAULT_TAX_BRACKETS: Record<number, TaxBracket[]> = {
  2024: [
    { limit: 5000000, rate: 0.13, label: 'До 5 млн ₽' },
    { limit: Infinity, rate: 0.15, label: 'Свыше 5 млн ₽' }
  ],
  2025: [
    { limit: 2400000, rate: 0.13, label: 'До 2.4 млн ₽' },
    { limit: 5000000, rate: 0.15, label: '2.4 млн – 5 млн ₽' },
    { limit: 20000000, rate: 0.18, label: '5 млн – 20 млн ₽' },
    { limit: 50000000, rate: 0.20, label: '20 млн – 50 млн ₽' },
    { limit: Infinity, rate: 0.22, label: 'Свыше 50 млн ₽' }
  ]
};
