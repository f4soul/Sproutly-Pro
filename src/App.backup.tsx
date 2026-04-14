import React, { useState, useEffect, useMemo, useRef, Component } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Moon, Sun, Download, Upload, Copy, Plus, Info, Calculator, TrendingUp, ChevronDown, ChevronRight, Trash2, X, Settings, LogIn, LogOut, Cloud, CloudOff, RefreshCw, Check, Coins, ReceiptRussianRuble } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db, signInWithGoogle, logout, onAuthStateChanged, doc, getDoc, setDoc, onSnapshot, User } from './firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Firebase Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't throw here to avoid crashing the app, but we log it for debugging
}

// --- Constants & Types ---

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const QUARTERS = [
  { name: 'I Квартал', months: [0, 1, 2] },
  { name: 'II Квартал', months: [3, 4, 5] },
  { name: 'III Квартал', months: [6, 7, 8] },
  { name: 'IV Квартал', months: [9, 10, 11] }
];

const DEFAULT_NORMS: Record<number, number[]> = {
  2024: [17, 20, 20, 21, 20, 19, 23, 22, 21, 23, 21, 21],
  2025: [17, 20, 21, 22, 18, 20, 23, 21, 22, 23, 19, 22],
  2026: [15, 19, 22, 22, 19, 20, 23, 21, 22, 22, 20, 22],
};

type MonthData = {
  normDays: number;
  factDays: number;
  salary: number;
};

type QuarterData = {
  bonusCoef: number;
  bonusAmount: number;
};

type YearData = {
  year: number;
  additionalIncome: number;
  bonusBase: number;
  months: MonthData[];
  quarters: QuarterData[];
  annualBonusCoef: number;
  annualBonusAmount: number;
  extraBonusAmount: number;
};

type AppState = {
  years: Record<number, YearData>;
  activeYear: number;
  taxBrackets: Record<number, { limit: number; rate: number; label: string }[]>;
};

// --- Helper Functions ---

const DEFAULT_TAX_BRACKETS: Record<number, { limit: number; rate: number; label: string }[]> = {
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

const calculateProgressiveTaxDetailed = (gross: number, year: number, taxBrackets: Record<number, { limit: number; rate: number; label: string }[]>) => {
  let remaining = gross;
  let tax = 0;
  const brackets = [];
  const scale = taxBrackets[year] || taxBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  let previousLimit = 0;

  for (const bracket of scale) {
    if (remaining > 0) {
      const bracketSize = bracket.limit - previousLimit;
      const amountInBracket = Math.min(remaining, bracketSize);
      const t = amountInBracket * bracket.rate;
      tax += t;
      brackets.push({ rate: bracket.rate * 100, amount: amountInBracket, tax: t, label: bracket.label });
      remaining -= amountInBracket;
    }
    previousLimit = bracket.limit;
  }

  return { tax, brackets };
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('ru-RU', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(value);
};

const generateDefaultYear = (year: number): YearData => {
  const norms = DEFAULT_NORMS[year] || DEFAULT_NORMS[2026];
  
  const defaultQuarters = Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

  if (year === 2024) {
    const salary2024 = [
      86233.66, 126195.58, 142025.00, 153059.52, 210248.82, 89700.00,
      142315.79, 152750.00, 145940.48, 179666.67, 195000.00, 145211.62
    ];
    return {
      year,
      additionalIncome: 0,
      bonusBase: 169500,
      months: Array.from({ length: 12 }, (_, i) => ({
        normDays: norms[i] || 21,
        factDays: norms[i] || 21,
        salary: salary2024[i],
      })),
      quarters: [
        { bonusCoef: 0, bonusAmount: 39418.50 },
        { bonusCoef: 0, bonusAmount: 59012.88 },
        { bonusCoef: 0, bonusAmount: 149500.01 },
        { bonusCoef: 0, bonusAmount: 149500.00 }
      ],
      annualBonusCoef: 0,
      annualBonusAmount: 371765.70,
      extraBonusAmount: 0,
    };
  }

  if (year === 2025) {
    const salary2025 = [
      43970.58, 180279.42, 193815.69, 143389.74, 122416.67, 174951.76,
      164457.66, 155111.79, 165464.29, 143706.52, 124315.67, 243301.43
    ];

    return {
      year,
      additionalIncome: 0,
      bonusBase: 169500,
      months: Array.from({ length: 12 }, (_, i) => ({
        normDays: norms[i] || 21,
        factDays: norms[i] || 21,
        salary: salary2025[i],
      })),
      quarters: [
        { bonusCoef: 0, bonusAmount: 0 },
        { bonusCoef: 0, bonusAmount: 139882.13 },
        { bonusCoef: 0, bonusAmount: 164169.10 },
        { bonusCoef: 0, bonusAmount: 274157.00 }
      ],
      annualBonusCoef: 0,
      annualBonusAmount: 414765.52,
      extraBonusAmount: 0,
    };
  }

  return {
    year,
    additionalIncome: 0,
    bonusBase: 169500,
    months: Array.from({ length: 12 }, (_, i) => ({
      normDays: norms[i] || 21,
      factDays: norms[i] || 21,
      salary: 0,
    })),
    quarters: defaultQuarters,
    annualBonusCoef: 0,
    annualBonusAmount: 0,
    extraBonusAmount: 0,
  };
};

const getInitialState = (): AppState => {
  const saved = localStorage.getItem('incomeCalculatorState_v4');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.taxBrackets) {
        parsed.taxBrackets = DEFAULT_TAX_BRACKETS;
      }
      // Migrate old years to new structure
      if (parsed.years) {
        Object.keys(parsed.years).forEach(yearKey => {
          const yearData = parsed.years[yearKey];
          if (!yearData.quarters) {
            yearData.quarters = Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));
          }
          if (yearData.bonusBase === undefined) {
            yearData.bonusBase = 169500;
          }
          if (yearData.annualBonusCoef === undefined) {
            yearData.annualBonusCoef = 0;
          }
          if (yearData.annualBonusAmount === undefined) {
            yearData.annualBonusAmount = 0;
          }
          if (yearData.extraBonusAmount === undefined) {
            yearData.extraBonusAmount = 0;
          }
        });
      }
      // Fix Infinity serialization in taxBrackets
      if (parsed.taxBrackets) {
        Object.keys(parsed.taxBrackets).forEach(year => {
          parsed.taxBrackets[year].forEach((bracket: any) => {
            if (bracket.limit === null) {
              bracket.limit = Infinity;
            }
          });
        });
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return {
    years: {
      2024: generateDefaultYear(2024),
      2025: generateDefaultYear(2025),
      2026: generateDefaultYear(2026),
    },
    activeYear: 2026,
    taxBrackets: DEFAULT_TAX_BRACKETS,
  };
};

const calculateYearTotals = (yearData: YearData, taxBrackets: Record<number, { limit: number; rate: number; label: string }[]>) => {
  const calcMonths = yearData.months.map((m, index) => {
    const base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
    let bonus = 0;
    if (index % 3 === 2) {
      const qIndex = Math.floor(index / 3);
      bonus += yearData.quarters?.[qIndex]?.bonusAmount || 0;
    }
    if (index === 11) {
      bonus += yearData.annualBonusAmount || 0;
      bonus += yearData.extraBonusAmount || 0;
    }
    return base + bonus;
  });
  const totalGross = calcMonths.reduce((a, b) => a + b, 0) + yearData.additionalIncome;
  const { tax: progressiveTax } = calculateProgressiveTaxDetailed(totalGross, yearData.year, taxBrackets);
  const finalNet = totalGross - progressiveTax;
  return { totalGross, finalNet };
};

const getDefaultExpandedQuarters = (year: number) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3);

  if (year < currentYear) {
    return { 0: true, 1: true, 2: true, 3: true };
  } else if (year === currentYear) {
    return {
      0: currentQuarter >= 0,
      1: currentQuarter >= 1,
      2: currentQuarter >= 2,
      3: currentQuarter >= 3,
    };
  } else {
    return { 0: true, 1: false, 2: false, 3: false };
  }
};

const TaxSettingsModal = ({ 
  isOpen, 
  onClose, 
  taxBrackets, 
  onSave,
  onExport,
  onImport
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  taxBrackets: Record<number, { limit: number; rate: number; label: string }[]>;
  onSave: (newBrackets: Record<number, { limit: number; rate: number; label: string }[]>) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const [localBrackets, setLocalBrackets] = useState(taxBrackets);
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalBrackets(taxBrackets);
  }, [taxBrackets, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBrackets = localBrackets[selectedYear] || localBrackets[2025] || DEFAULT_TAX_BRACKETS[2025];

  const handleBracketChange = (index: number, field: 'limit' | 'rate' | 'label', value: any) => {
    const newBrackets = [...currentBrackets];
    newBrackets[index] = { ...newBrackets[index], [field]: value };
    setLocalBrackets({ ...localBrackets, [selectedYear]: newBrackets });
  };

  const addBracket = () => {
    const newBrackets = [...currentBrackets, { limit: Infinity, rate: 0.13, label: 'Новая ступень' }];
    // Ensure only the last one has Infinity
    if (newBrackets.length > 1 && newBrackets[newBrackets.length - 2].limit === Infinity) {
      newBrackets[newBrackets.length - 2].limit = 5000000;
    }
    setLocalBrackets({ ...localBrackets, [selectedYear]: newBrackets });
  };

  const removeBracket = (index: number) => {
    if (currentBrackets.length <= 1) return;
    const newBrackets = currentBrackets.filter((_, i) => i !== index);
    if (index === currentBrackets.length - 1) {
      newBrackets[newBrackets.length - 1].limit = Infinity;
    }
    setLocalBrackets({ ...localBrackets, [selectedYear]: newBrackets });
  };

  const availableYears = Array.from(new Set([...Object.keys(localBrackets).map(Number), 2024, 2025, 2026, 2027])).sort((a, b) => a - b);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Settings size={24} />
            </div>
            <h3 className="text-xl font-bold">Настройки и Данные</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
          <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Настройки ставок НДФЛ</h4>
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Выберите год:</label>
            <div className="flex flex-wrap gap-2">
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer",
                    selectedYear === year 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-2">
              <div className="col-span-4">Название</div>
              <div className="col-span-4">Лимит (₽)</div>
              <div className="col-span-3">Ставка (%)</div>
              <div className="col-span-1"></div>
            </div>
            
            {currentBrackets.map((bracket, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="col-span-4">
                  <input 
                    type="text" 
                    value={bracket.label ?? ''} 
                    onChange={(e) => handleBracketChange(index, 'label', e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-4">
                  {bracket.limit === Infinity ? (
                    <div className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent rounded-xl px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400 text-center">
                      ∞
                    </div>
                  ) : (
                    <TableInput 
                      value={bracket.limit ?? 0} 
                      onChange={(val) => handleBracketChange(index, 'limit', val)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono text-left"
                    />
                  )}
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <input 
                      type="number" 
                      value={bracket.rate != null ? Math.round(bracket.rate * 100) : ''} 
                      onChange={(e) => handleBracketChange(index, 'rate', (parseFloat(e.target.value) || 0) / 100)}
                      className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none font-mono pr-6"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
                  </div>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button 
                    onClick={() => removeBracket(index)}
                    disabled={currentBrackets.length <= 1}
                    className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
            
            <button 
              onClick={addBracket}
              className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 cursor-pointer uppercase tracking-wider"
            >
              <Plus size={14} /> Добавить ступень
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Download size={14} /> Экспорт
              </h4>
              <p className="text-[10px] text-gray-500">Сохранить в JSON</p>
            </div>
            <button 
              onClick={onExport}
              className="py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Скачать
            </button>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Upload size={14} /> Импорт
              </h4>
              <p className="text-[10px] text-gray-500">Загрузить JSON</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="py-1.5 px-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Выбрать
            </button>
            <input type="file" ref={fileInputRef} onChange={onImport} accept=".json" className="hidden" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer text-sm"
          >
            Закрыть
          </button>
          <button 
            onClick={() => {
              onSave(localBrackets);
              onClose();
            }}
            className="px-6 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-colors cursor-pointer text-sm"
          >
            Сохранить ставки
          </button>
        </div>
        </div>
      </motion.div>
    </div>
  );
};

const TaxReferenceModal = ({ 
  isOpen, 
  onClose, 
  year,
  brackets 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  year: number;
  brackets: { limit: number; rate: number; label: string }[];
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <Info size={24} />
            </div>
            <h3 className="text-xl font-bold">Справка: НДФЛ {year}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Налог считается маржинально (кумулятивно) один раз за весь год по всей сумме годового дохода. В таблице по месяцам отображается предварительный расчет по ставке 13% для удобства планирования текущих поступлений.
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 dark:bg-gray-800 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2">Диапазон дохода</th>
                  <th className="px-4 py-2 text-right">Ставка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {brackets.map((bracket, i, arr) => {
                  const prevLimit = i === 0 ? 0 : arr[i - 1].limit;
                  const rateStr = Math.round(bracket.rate * 100) + '%';
                  
                  const formatLimit = (num: number) => {
                    if (num >= 1000000) {
                      const millions = num / 1000000;
                      return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace('.', ',')} млн ₽`;
                    }
                    return `${formatNumber(num)} ₽`;
                  };

                  let rangeText = '';
                  if (i === 0) {
                    rangeText = `До ${formatLimit(bracket.limit)}`;
                  } else if (bracket.limit === Infinity) {
                    rangeText = `Свыше ${formatLimit(prevLimit)}`;
                  } else {
                    rangeText = `${formatLimit(prevLimit)} – ${formatLimit(bracket.limit)}`;
                  }
                  
                  return (
                    <tr key={i} className="text-gray-700 dark:text-gray-300">
                      <td className="px-4 py-3">{rangeText}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">{rateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 transition-colors cursor-pointer"
        >
          Понятно
        </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const CoefInput = ({ value, onChange, className }: { value: number, onChange: (v: number) => void, className?: string }) => {
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? value : (value ? parseFloat(value.toFixed(3)) : '');
  
  return (
    <input
      type="number"
      step="0.001"
      value={displayValue}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={cn(
        "w-full bg-transparent border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 outline-none px-1 py-1 text-center transition-all font-mono tabular-nums rounded-md",
        className
      )}
    />
  );
};

const AnimatedCurrency = ({ value }: { value: number }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatCurrency(current));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
};

const TableInput = ({ 
  value, 
  onChange, 
  className, 
  step = "any",
  isCurrency = true,
  hideDecimals = false,
  isInteger = false
}: { 
  value: number, 
  onChange: (val: number) => void, 
  className?: string, 
  step?: string,
  isCurrency?: boolean,
  hideDecimals?: boolean,
  isInteger?: boolean
}) => {
  const [focused, setFocused] = useState(false);
  
  const displayValue = focused 
    ? (value === 0 ? '' : value) 
    : (isInteger 
        ? Math.round(value).toString() 
        : (hideDecimals 
            ? Math.round(value).toLocaleString('ru-RU') 
            : formatNumber(value)));

  return (
    <input
      type={focused ? "number" : "text"}
      value={displayValue}
      onFocus={(e) => { setFocused(true); e.target.select(); }}
      onBlur={() => setFocused(false)}
      onChange={(e) => onChange(isInteger ? Math.round(parseFloat(e.target.value) || 0) : (parseFloat(e.target.value) || 0))}
      step={isInteger ? "1" : step}
      className={cn(
        "w-full bg-transparent border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 outline-none px-1 md:px-2 py-1.5 text-right transition-all font-mono tabular-nums rounded-md text-xs md:text-sm",
        className
      )}
    />
  );
};

// --- Error Boundary ---

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorInfo: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      let displayMessage = "Что-то пошло не так. Пожалуйста, перезагрузите страницу.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          displayMessage = "Ошибка доступа к данным. Пожалуйста, убедитесь, что вы авторизованы.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full text-center space-y-4">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 mx-auto flex items-center justify-center text-red-600 dark:text-red-400">
              <X size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Ой! Произошла ошибка</h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Main Component ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info';
}

function AppContent() {
  const [state, setState] = useState<AppState>(getInitialState);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline'>('offline');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copiedCard, setCopiedCard] = useState<'net' | 'gross' | 'tax' | null>(null);
  
  const addToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const handleCopy = (value: number, type: 'net' | 'gross' | 'tax') => {
    navigator.clipboard.writeText(value.toString());
    setCopiedCard(type);
    addToast(`Сумма скопирована в буфер обмена`);
    setTimeout(() => setCopiedCard(null), 2000);
  };

  const lastSyncedStateRef = useRef<string>('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setSyncStatus('syncing');
      } else {
        setSyncStatus('offline');
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync (Read)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const docRef = doc(db, 'users', user.uid, 'data', 'income');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as AppState;
        const remoteString = JSON.stringify(remoteData);
        
        if (remoteString !== lastSyncedStateRef.current) {
          setState(prev => ({
            ...prev,
            ...remoteData,
          }));
          lastSyncedStateRef.current = remoteString;
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('synced');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data/income`);
      setSyncStatus('error');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Firestore Sync (Write)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const currentStateString = JSON.stringify(state);
    if (currentStateString === lastSyncedStateRef.current) return;

    // Сразу показываем статус синхронизации при любом изменении
    setSyncStatus('syncing');

    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'data', 'income');
        await setDoc(docRef, {
          ...state,
          updatedAt: new Date().toISOString()
        });
        lastSyncedStateRef.current = currentStateString;
        setSyncStatus('synced');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/income`);
        setSyncStatus('error');
      }
    }, 1000); // Debounce saves

    return () => clearTimeout(timer);
  }, [state, user, isAuthReady]);

  // Hide sync status after success
  useEffect(() => {
    if (syncStatus === 'synced') {
      const timer = setTimeout(() => setSyncStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const [expandedQuarters, setExpandedQuarters] = useState<Record<number, boolean>>(() => getDefaultExpandedQuarters(state.activeYear));
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);
  const [isTaxInfoModalOpen, setIsTaxInfoModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isDeleteYearModalOpen, setIsDeleteYearModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setExpandedQuarters(getDefaultExpandedQuarters(state.activeYear));
  }, [state.activeYear]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('incomeCalculatorState_v4', JSON.stringify(state));
  }, [state]);

  // Apply dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const activeYearData = state.years[state.activeYear];

  // --- Handlers ---

  const handleMonthChange = (monthIndex: number, field: keyof MonthData, value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const newMonths = [...newYears[prev.activeYear].months];
      newMonths[monthIndex] = { ...newMonths[monthIndex], [field]: value };
      newYears[prev.activeYear] = { ...newYears[prev.activeYear], months: newMonths };
      return { ...prev, years: newYears };
    });
  };

  const handleAdditionalIncomeChange = (value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      newYears[prev.activeYear] = { ...newYears[prev.activeYear], additionalIncome: value };
      return { ...prev, years: newYears };
    });
  };

  const addNewYear = () => {
    const newYear = Math.max(...Object.keys(state.years).map(Number)) + 1;
    setState(prev => ({
      ...prev,
      years: { ...prev.years, [newYear]: generateDefaultYear(newYear) },
      activeYear: newYear,
    }));
    addToast(`Добавлен ${newYear} год`);
  };

  const handleQuarterChange = (qIndex: number, field: 'bonusCoef' | 'bonusAmount', value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      const newQuarters = [...(currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 })))];
      
      const qMonths = QUARTERS[qIndex].months.map(mi => currentYearData.months[mi]);
      const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
      const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
      const krd = qNorm > 0 ? qFact / qNorm : 0;
      const base = currentYearData.bonusBase || 169500;

      if (field === 'bonusCoef') {
        newQuarters[qIndex] = {
          bonusCoef: value,
          bonusAmount: Math.round((base * value * krd) * 100) / 100
        };
      } else {
        newQuarters[qIndex] = {
          bonusCoef: (base * krd) > 0 ? value / (base * krd) : 0,
          bonusAmount: Math.round(value * 100) / 100
        };
      }

      newYears[prev.activeYear] = { ...currentYearData, quarters: newQuarters };
      return { ...prev, years: newYears };
    });
  };

  const handleAnnualBonusChange = (field: 'annualBonusCoef' | 'annualBonusAmount' | 'extraBonusAmount' | 'bonusBase', value: number) => {
    setState(prev => {
      const newYears = { ...prev.years };
      const currentYearData = newYears[prev.activeYear];
      
      if (field === 'extraBonusAmount') {
        newYears[prev.activeYear] = { ...currentYearData, extraBonusAmount: value };
        return { ...prev, years: newYears };
      }

      const yNorm = currentYearData.months.reduce((sum, m) => sum + m.normDays, 0);
      const yFact = currentYearData.months.reduce((sum, m) => sum + m.factDays, 0);
      const krdg = yNorm > 0 ? yFact / yNorm : 0;
      
      if (field === 'bonusBase') {
        const base = value;
        // Recalculate quarters
        const newQuarters = (currentYearData.quarters || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }))).map((q, qIndex) => {
          const qMonths = QUARTERS[qIndex].months.map(mi => currentYearData.months[mi]);
          const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
          const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
          const krd = qNorm > 0 ? qFact / qNorm : 0;
          return {
            ...q,
            bonusAmount: q.bonusCoef ? Math.round((base * q.bonusCoef * krd) * 100) / 100 : q.bonusAmount
          };
        });
        
        // Recalculate annual
        const newAnnualAmount = currentYearData.annualBonusCoef ? Math.round((base * currentYearData.annualBonusCoef * krdg) * 100) / 100 : currentYearData.annualBonusAmount;
        
        newYears[prev.activeYear] = { 
          ...currentYearData, 
          bonusBase: base,
          quarters: newQuarters,
          annualBonusAmount: newAnnualAmount
        };
        return { ...prev, years: newYears };
      }

      const base = currentYearData.bonusBase || 169500;
      let newCoef = currentYearData.annualBonusCoef || 0;
      let newAmount = currentYearData.annualBonusAmount || 0;

      if (field === 'annualBonusCoef') {
        newCoef = value;
        newAmount = Math.round((base * value * krdg) * 100) / 100;
      } else {
        newAmount = Math.round(value * 100) / 100;
        newCoef = (base * krdg) > 0 ? value / (base * krdg) : 0;
      }

      newYears[prev.activeYear] = { 
        ...currentYearData, 
        annualBonusCoef: newCoef,
        annualBonusAmount: newAmount
      };
      return { ...prev, years: newYears };
    });
  };

  const availableYears = Object.keys(state.years).map(Number).sort((a, b) => a - b);
  const currentIndex = availableYears.indexOf(state.activeYear);
  const prevYear = currentIndex > 0 ? availableYears[currentIndex - 1] : null;

  const copyFromPreviousYear = () => {
    if (prevYear === null || !state.years[prevYear]) {
      console.warn(`Нет данных за предыдущий год для копирования.`);
      return;
    }
    setState(prev => {
      const prevData = prev.years[prevYear];
      const currentData = prev.years[prev.activeYear];
      const newMonths = currentData.months.map((m, i) => ({
        ...m,
        salary: prevData.months[i].salary,
      }));
      const newQuarters = currentData.quarters?.map((q, i) => ({
        ...q,
        bonusCoef: prevData.quarters?.[i]?.bonusCoef || 0,
        bonusAmount: prevData.quarters?.[i]?.bonusAmount || 0,
      })) || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

      return {
        ...prev,
        years: {
          ...prev.years,
          [prev.activeYear]: { 
            ...currentData, 
            months: newMonths, 
            quarters: newQuarters,
            additionalIncome: prevData.additionalIncome,
            bonusBase: prevData.bonusBase || 169500,
            annualBonusCoef: prevData.annualBonusCoef || 0,
            annualBonusAmount: prevData.annualBonusAmount || 0,
            extraBonusAmount: prevData.extraBonusAmount || 0
          }
        }
      };
    });
  };

  const deleteActiveYear = () => {
    if (availableYears.length <= 1) return;
    setState(prev => {
      const newYears = { ...prev.years };
      delete newYears[prev.activeYear];
      const remainingYears = Object.keys(newYears).map(Number).sort((a, b) => a - b);
      const newActiveYear = remainingYears[remainingYears.length - 1];
      return { ...prev, years: newYears, activeYear: newActiveYear };
    });
    setIsDeleteYearModalOpen(false);
    addToast(`Данные за год удалены`);
  };

  const clearActiveYearData = () => {
    setState(prev => {
      const currentData = prev.years[prev.activeYear];
      const newMonths = currentData.months.map(m => ({
        ...m,
        factDays: m.normDays,
        salary: 0,
      }));
      const newQuarters = currentData.quarters?.map(q => ({
        ...q,
        bonusCoef: 0,
        bonusAmount: 0,
      })) || Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));

      return {
        ...prev,
        years: {
          ...prev.years,
          [prev.activeYear]: { 
            ...currentData, 
            months: newMonths, 
            quarters: newQuarters,
            additionalIncome: 0,
            annualBonusCoef: 0,
            annualBonusAmount: 0,
            extraBonusAmount: 0
          }
        }
      };
    });
    setIsClearModalOpen(false);
    addToast(`Данные за год очищены`);
  };

  const exportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "income_calculator_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToast("Данные успешно экспортированы");
  };

  const importJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedState = JSON.parse(e.target?.result as string);
        if (importedState && importedState.years && importedState.activeYear) {
          setState(importedState);
          addToast("Данные успешно импортированы");
        } else {
          console.error("Неверный формат файла.");
          addToast("Неверный формат файла", "info");
        }
      } catch (err) {
        console.error("Ошибка при чтении файла.");
        addToast("Ошибка при чтении файла", "info");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Calculations ---

  const calculatedMonths = useMemo(() => {
    return activeYearData.months.map((m, index) => {
      const base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
      
      let bonus = 0;
      if (index % 3 === 2) {
        const qIndex = Math.floor(index / 3);
        bonus += activeYearData.quarters?.[qIndex]?.bonusAmount || 0;
      }

      const gross = base + bonus;
      const tax13 = gross * 0.13;
      const net13 = gross - tax13;
      return { ...m, base, bonus, gross, tax13, net13 };
    });
  }, [activeYearData]);

  const yearlyTotals = useMemo(() => {
    const totalGrossMonths = calculatedMonths.reduce((sum, m) => sum + m.gross, 0);
    const totalGross = totalGrossMonths + (activeYearData.annualBonusAmount || 0) + (activeYearData.extraBonusAmount || 0);
    
    const { tax: progressiveTax, brackets } = calculateProgressiveTaxDetailed(totalGross, state.activeYear, state.taxBrackets);
    const flatTax = totalGross * 0.13;
    
    const finalNet = totalGross - progressiveTax;
    const flatNet = totalGross - flatTax;
    
    const effectiveRate = totalGross > 0 ? (progressiveTax / totalGross) * 100 : 0;
    const taxDifference = progressiveTax - flatTax;

    return {
      totalGross,
      progressiveTax,
      flatTax,
      finalNet,
      flatNet,
      effectiveRate,
      taxDifference,
      brackets
    };
  }, [calculatedMonths, activeYearData.annualBonusAmount, activeYearData.extraBonusAmount, state.activeYear, state.taxBrackets]);

  const prevYearData = state.years[state.activeYear - 1];
  const prevYearTotals = useMemo(() => {
    return prevYearData ? calculateYearTotals(prevYearData, state.taxBrackets) : null;
  }, [prevYearData, state.taxBrackets]);

  const grossDiff = prevYearTotals ? yearlyTotals.totalGross - prevYearTotals.totalGross : null;
  const netDiff = prevYearTotals ? yearlyTotals.finalNet - prevYearTotals.finalNet : null;

  // --- Render Helpers ---

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] p-4 md:p-6 space-y-6 flex flex-col">
        <div className="max-w-[1600px] w-full mx-auto space-y-6 animate-pulse flex-1">
          {/* Header Skeleton */}
          <div className="h-20 bg-slate-200/50 dark:bg-slate-800/30 rounded-2xl w-full"></div>
          
          <div className="flex flex-col xl:flex-row gap-6">
            {/* Table Skeleton */}
            <div className="flex-1 h-[600px] bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
            
            {/* Sidebar Skeleton */}
            <div className="w-full xl:w-[28%] grid grid-cols-2 gap-4 h-fit">
              <div className="col-span-2 h-40 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
              <div className="col-span-1 h-32 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
              <div className="col-span-1 h-32 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
              <div className="col-span-2 h-64 bg-slate-200/50 dark:bg-slate-800/30 rounded-3xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300 selection:bg-indigo-500/30">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 dark:bg-blue-500 rounded-xl text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="flex items-baseline gap-1">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 dark:text-white font-mono">
                  INCOME<span className="inline-block w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse mx-1" />PRO
                </h1>
              </div>
              <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Progressive Made Simple</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Auth & Sync Unified Block */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="relative" ref={profileMenuRef}>
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="relative w-10 h-10 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer shadow-sm flex items-center justify-center group"
                    title={`Аккаунт: ${user.displayName?.split(' ')[0]}`}
                  >
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                        {user.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </button>
                  
                  {/* Sync Status Dot Overlay */}
                  <div className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center pointer-events-none z-10">
                    {syncStatus === 'syncing' && (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" style={{ animationDuration: '2s' }}></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border-2 border-white dark:border-slate-900"></span>
                      </>
                    )}
                    {syncStatus === 'synced' && (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                    )}
                    {syncStatus === 'error' && (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" style={{ animationDuration: '0.8s' }}></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white dark:border-slate-900"></span>
                      </>
                    )}
                    {syncStatus === 'offline' && (
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 border-2 border-white dark:border-slate-900"></span>
                    )}
                  </div>

                  <AnimatePresence>
                    {isProfileMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 mb-1">
                          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Аккаунт</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{user.displayName}</p>
                        </div>
                        <button 
                          onClick={() => {
                            logout();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                          <LogOut size={16} />
                          <span className="font-bold">Выйти из профиля</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
              >
                <LogIn size={18} />
                <span>Войти</span>
              </button>
            )}

            <button 
              onClick={() => setIsSettingsModalOpen(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer text-gray-500 dark:text-gray-400 shadow-sm" 
              title="Настройки и Данные"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer text-gray-500 dark:text-gray-400 shadow-sm" 
              title="Сменить тему"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <div className="flex flex-col xl:flex-row gap-6 items-start">
          
          {/* Left Column: Tabs + Table */}
          <div className="w-full xl:w-[72%] space-y-6 min-w-0">
            {/* Tabs & Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              {availableYears.map(year => {
                return (
                  <button
                    key={year}
                    onClick={() => setState(prev => ({ ...prev, activeYear: year }))}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer outline-none select-none relative",
                      state.activeYear === year 
                        ? "text-blue-600 dark:text-blue-400" 
                        : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    )}
                  >
                    {state.activeYear === year && (
                      <motion.div 
                        layoutId="activeYear"
                        className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-xl -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {year}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={addNewYear}
              className="w-[60px] h-10 rounded-xl font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center cursor-pointer transition-all active:scale-95"
              title="Добавить новый год"
            >
              <Plus size={20} />
            </button>
            <button 
              onClick={() => setIsDeleteYearModalOpen(true)}
              disabled={availableYears.length <= 1}
              className="w-[40px] h-10 rounded-xl font-medium bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
              title="Удалить текущий год"
            >
              <Trash2 size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsClearModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800/50 cursor-pointer"
              title="Очистить данные за год"
            >
              <Trash2 size={16} /> <span className="hidden sm:inline">Очистить</span>
            </button>
            {prevYear !== null && (
              <button 
                onClick={copyFromPreviousYear}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
              >
                <Copy size={16} /> Скопировать из {prevYear}
              </button>
            )}
          </div>
        </div>

        {/* Main Table */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={state.activeYear}
            initial={{ opacity: 0, filter: 'blur(4px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(4px)' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-white dark:bg-slate-900/50 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 p-2"
          >
            <div className="overflow-x-auto custom-scrollbar relative rounded-2xl">
              <table className="w-full text-sm text-left border-separate border-spacing-0 table-fixed min-w-full">
              <thead className="bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-md sticky top-0 z-20">
                <tr>
                  <th colSpan={4} className="px-4 py-4 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b]">
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">База:</span>
                      <div className="relative w-25">
                        <TableInput
                          value={activeYearData.bonusBase ?? 0}
                          onChange={(v) => handleAnnualBonusChange('bonusBase', v)}
                          hideDecimals={true}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 pr-6 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-mono text-right text-sm transition-all shadow-sm"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span>
                      </div>
                    </div>
                  </th>
                  <th colSpan={4} className="px-4 py-4 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b]">
                    <div className="flex items-center justify-end gap-6">
                      <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Премии (КФ):</span>
                      <div className="flex gap-3">
                        {[0, 1, 2, 3].map(qIndex => (
                          <div key={qIndex} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">{qIndex + 1} КВ</span>
                            <div className="flex items-center bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                              <CoefInput
                                value={activeYearData.quarters?.[qIndex]?.bonusCoef ?? 0}
                                onChange={(v) => handleQuarterChange(qIndex, 'bonusCoef', v)}
                                className="w-10 bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-xs p-0"
                              />
                            </div>
                          </div>
                        ))}
                        <div className="flex flex-col items-center gap-1 ml-2">
                          <span className="text-[9px] text-indigo-500 uppercase font-black tracking-tighter">Год</span>
                          <div className="flex items-center bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all shadow-sm">
                            <CoefInput
                              value={activeYearData.annualBonusCoef ?? 0}
                              onChange={(v) => handleAnnualBonusChange('annualBonusCoef', v)}
                              className="w-10 bg-transparent border-none focus:ring-0 outline-none font-mono text-center text-xs p-0"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </th>
                </tr>
                <tr>
                  <th className="px-1 md:px-2 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold w-16 md:w-20 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Квартал</th>
                  <th className="px-1 md:px-2 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold w-20 md:w-24 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Месяц</th>
                  <th className="px-1 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold w-12 md:w-16 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap" title="Норма по производственному календарю">Норма дн.</th>
                  <th className="px-1 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold w-12 md:w-16 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap" title="Фактически отработано дней">Факт дн.</th>
                  <th className="px-1 md:px-2 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold w-24 md:w-28 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Оклад (₽)</th>
                  <th className="px-1 md:px-2 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-slate-400 dark:text-slate-500 font-semibold w-24 md:w-28 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Премия (₽)</th>
                  <th className="px-1 md:px-2 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-indigo-500 font-semibold w-24 md:w-28 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap">Gross (₽)</th>
                  <th className="px-1 md:px-2 py-4 text-[8px] md:text-[10px] tracking-widest uppercase text-emerald-500 font-semibold w-24 md:w-28 text-center shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#1e293b] whitespace-nowrap" title="Предварительный Net (Оклад - 13%)">Net 13% (₽)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {QUARTERS.map((q, qIndex) => {
                  const qMonths = q.months.map(mi => calculatedMonths[mi]);
                  const qNorm = qMonths.reduce((sum, m) => sum + m.normDays, 0);
                  const qFact = qMonths.reduce((sum, m) => sum + m.factDays, 0);
                  const qGross = qMonths.reduce((sum, m) => sum + m.gross, 0);
                  const qNet13 = qMonths.reduce((sum, m) => sum + m.net13, 0);
                  const isExpanded = expandedQuarters[qIndex];

                  return (
                    <React.Fragment key={qIndex}>
                      {/* Quarter Header / Summary Row */}
                      <tr 
                        className="font-semibold text-slate-900 dark:text-slate-100 border-t border-slate-100 dark:border-slate-800/60 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        onClick={() => setExpandedQuarters(prev => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                      >
                        <td className="px-1 md:px-4 py-3 whitespace-nowrap align-middle">
                          <div className="flex items-center gap-1 md:gap-2">
                            <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ type: "spring", stiffness: 350, damping: 30 }}>
                              <ChevronDown size={16} className="w-3 h-3 md:w-4 md:h-4" />
                            </motion.div>
                            <span className="text-xs md:text-sm">{q.name}</span>
                          </div>
                        </td>
                        <td className="px-1 md:px-4 py-3 text-gray-500 dark:text-gray-400 text-[10px] md:text-xs text-center align-middle whitespace-nowrap"></td>
                        <td className="px-1 md:px-2 py-3 text-center font-mono text-[10px] md:text-xs align-middle whitespace-nowrap">{qNorm}</td>
                        <td className="px-1 md:px-2 py-3 text-center font-mono text-[10px] md:text-xs align-middle whitespace-nowrap">{qFact}</td>
                        <td className="px-1 md:px-4 py-3 text-center align-middle whitespace-nowrap"></td>
                        <td className="px-1 md:px-4 py-3 text-center align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <TableInput value={activeYearData.quarters?.[qIndex]?.bonusAmount || 0} onChange={(v) => handleQuarterChange(qIndex, 'bonusAmount', v)} className="font-bold text-blue-700 dark:text-blue-400 text-center" />
                        </td>
                        <td className="px-1 md:px-4 py-3 text-center font-mono text-blue-700 dark:text-blue-400 align-middle whitespace-nowrap text-xs md:text-sm">{formatCurrency(qGross)}</td>
                        <td className="px-1 md:px-4 py-3 text-center font-mono text-green-700 dark:text-green-400 align-middle whitespace-nowrap text-xs md:text-sm">{formatCurrency(qNet13)}</td>
                      </tr>
                      
                      {/* Months */}
                      {isExpanded && q.months.map((monthIndex, idx) => {
                        const m = activeYearData.months[monthIndex];
                        const calcM = calculatedMonths[monthIndex];
                        return (
                          <tr 
                            key={monthIndex} 
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group border-t border-slate-50 dark:border-slate-800/30"
                          >
                            <td className="px-1 md:px-4 py-2 text-center align-middle whitespace-nowrap"></td>
                              <td className="px-1 md:px-4 py-2 font-medium text-slate-600 dark:text-slate-300 text-center align-middle whitespace-nowrap text-[10px] md:text-sm">
                                {MONTH_NAMES[monthIndex]}
                              </td>
                              <td className="px-1 md:px-2 py-2 text-center align-middle whitespace-nowrap">
                                <TableInput value={m.normDays} onChange={(v) => handleMonthChange(monthIndex, 'normDays', v)} className="font-mono text-center" isInteger={true} />
                              </td>
                              <td className="px-1 md:px-2 py-2 text-center align-middle whitespace-nowrap">
                                <TableInput value={m.factDays} onChange={(v) => handleMonthChange(monthIndex, 'factDays', v)} className="font-mono text-center" isInteger={true} />
                              </td>
                              <td className="px-1 md:px-4 py-2 text-center align-middle whitespace-nowrap">
                                <TableInput value={m.salary} onChange={(v) => handleMonthChange(monthIndex, 'salary', v)} className="font-mono font-medium text-center" />
                              </td>
                              <td className="px-1 md:px-4 py-2 text-center font-mono text-gray-400 dark:text-gray-500 align-middle whitespace-nowrap text-xs md:text-sm">
                                {monthIndex % 3 === 2 ? formatCurrency(calcM.bonus) : '-'}
                              </td>
                              <td className="px-1 md:px-4 py-2 text-center font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-900/10 align-middle whitespace-nowrap text-xs md:text-sm">
                                {formatCurrency(calcM.gross)}
                              </td>
                              <td className="px-1 md:px-4 py-2 text-center font-mono text-green-700 dark:text-green-300 align-middle whitespace-nowrap text-xs md:text-sm">
                                {formatCurrency(calcM.net13)}
                              </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* Annual Bonus Row */}
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t-2 border-gray-200 dark:border-gray-700">
                  <td colSpan={5} className="px-1 md:px-4 py-3 text-gray-700 dark:text-gray-300 text-left align-middle whitespace-nowrap text-[10px] md:text-sm">Годовая премия</td>
                  <td className="px-1 md:px-4 py-3 text-center align-middle whitespace-nowrap">
                    <TableInput value={activeYearData.annualBonusAmount || 0} onChange={(v) => handleAnnualBonusChange('annualBonusAmount', v)} className="font-bold text-blue-700 dark:text-blue-400 text-center" />
                  </td>
                  <td className="px-1 md:px-4 py-3 text-center font-mono text-blue-700 dark:text-blue-400 align-middle whitespace-nowrap text-xs md:text-sm">{formatCurrency(activeYearData.annualBonusAmount || 0)}</td>
                  <td className="px-1 md:px-4 py-3 text-center font-mono text-green-700 dark:text-green-400 align-middle whitespace-nowrap text-xs md:text-sm">{formatCurrency((activeYearData.annualBonusAmount || 0) * 0.87)}</td>
                </tr>

                {/* Extra Bonus Row */}
                <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold border-t border-gray-200 dark:border-gray-700">
                  <td colSpan={5} className="px-1 md:px-4 py-3 text-gray-700 dark:text-gray-300 text-left align-middle whitespace-nowrap text-[10px] md:text-sm">Доп. премия</td>
                  <td className="px-1 md:px-4 py-3 text-center align-middle whitespace-nowrap">
                    <TableInput value={activeYearData.extraBonusAmount || 0} onChange={(v) => handleAnnualBonusChange('extraBonusAmount', v)} className="font-bold text-blue-700 dark:text-blue-400 text-center" />
                  </td>
                  <td className="px-1 md:px-4 py-3 text-center font-mono text-blue-700 dark:text-blue-400 align-middle whitespace-nowrap text-xs md:text-sm">{formatCurrency(activeYearData.extraBonusAmount || 0)}</td>
                  <td className="px-1 md:px-4 py-3 text-center font-mono text-green-700 dark:text-green-400 align-middle whitespace-nowrap text-xs md:text-sm">{formatCurrency((activeYearData.extraBonusAmount || 0) * 0.87)}</td>
                </tr>

                {/* Total Year Row */}
                <tr className="bg-slate-100 dark:bg-slate-800/90 backdrop-blur-md font-bold text-slate-900 dark:text-white align-middle sticky bottom-0 z-10 shadow-[0_-1px_0_0_#e2e8f0] dark:shadow-[0_-1px_0_0_#1e293b]">
                  <td colSpan={2} className="px-1 md:px-4 py-4 uppercase tracking-wider text-center whitespace-nowrap text-[10px] md:text-sm">Итого за год</td>
                  <td className="px-1 md:px-2 py-4 text-center font-mono text-[10px] md:text-xs whitespace-nowrap">{calculatedMonths.reduce((sum, m) => sum + m.normDays, 0)}</td>
                  <td className="px-1 md:px-2 py-4 text-center font-mono text-[10px] md:text-xs whitespace-nowrap">{calculatedMonths.reduce((sum, m) => sum + m.factDays, 0)}</td>
                  <td className="px-1 md:px-4 py-4 text-center font-mono whitespace-nowrap text-xs md:text-sm">{formatCurrency(calculatedMonths.reduce((sum, m) => sum + m.salary, 0))}</td>
                  <td className="px-1 md:px-4 py-4 text-center font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap text-xs md:text-sm">
                    <AnimatedCurrency value={
                      calculatedMonths.reduce((sum, m) => sum + m.bonus, 0) + 
                      (activeYearData.annualBonusAmount || 0) + 
                      (activeYearData.extraBonusAmount || 0)
                    } />
                  </td>
                  <td className="px-1 md:px-4 py-4 text-center font-mono text-indigo-600 dark:text-indigo-400 whitespace-nowrap text-xs md:text-sm"><AnimatedCurrency value={yearlyTotals.totalGross} /></td>
                  <td className="px-1 md:px-4 py-4 text-center font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap text-xs md:text-sm">
                    <AnimatedCurrency value={
                      calculatedMonths.reduce((sum, m) => sum + m.net13, 0) + 
                      ((activeYearData.annualBonusAmount || 0) * 0.87) + 
                      ((activeYearData.extraBonusAmount || 0) * 0.87)
                    } />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
        </AnimatePresence>
          </div>

          {/* Right Column: Dashboard */}
          <div className="w-full xl:w-[28%] space-y-6 xl:sticky xl:top-6">
            
            {/* Summary Cards - Bento Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Net (Hero) */}
              <div className="col-span-2 bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-3xl shadow-[0_8px_30px_rgb(99,102,241,0.2)] text-white flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute -bottom-2 -right-2 p-4 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 group-hover:-translate-x-2 pointer-events-none">
                  <Calculator size={120} />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Финальный Net</p>
                </div>
                <div 
                  onClick={() => handleCopy(yearlyTotals.finalNet, 'net')}
                  className="relative z-10 cursor-pointer group/copy w-fit mt-1"
                  title="Нажмите, чтобы скопировать"
                >
                  <h3 className="text-3xl lg:text-4xl font-bold font-mono flex items-center gap-3 transition-opacity group-hover/copy:opacity-80">
                    <AnimatedCurrency value={yearlyTotals.finalNet} />
                  </h3>
                </div>
                {netDiff !== null && (
                  <div className="mt-2 text-xs font-medium text-indigo-200 flex items-center gap-1 relative z-10">
                    {netDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(netDiff))} к {prevYear} г.
                  </div>
                )}
              </div>

              {/* Gross */}
              <div className="col-span-1 bg-white dark:bg-slate-900/50 p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div className="absolute -bottom-2 -right-2 p-4 text-slate-400 dark:text-slate-500 opacity-20 dark:opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 group-hover:-translate-x-1 pointer-events-none">
                  <Coins size={80} />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Gross</p>
                </div>
                <div 
                  onClick={() => handleCopy(yearlyTotals.totalGross, 'gross')}
                  className="relative z-10 cursor-pointer group/copy w-fit mt-1"
                  title="Нажмите, чтобы скопировать"
                >
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2 transition-opacity group-hover/copy:opacity-70">
                    <AnimatedCurrency value={yearlyTotals.totalGross} />
                  </h3>
                </div>
                {grossDiff !== null && (
                  <div className={cn("mt-2 text-[10px] font-medium flex items-center gap-1 relative z-10", grossDiff >= 0 ? "text-emerald-500" : "text-rose-500")}>
                    {grossDiff >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(grossDiff))}
                  </div>
                )}
              </div>

              {/* Tax */}
              <div className="col-span-1 bg-white dark:bg-slate-900/50 p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                <div className="absolute -bottom-2 -right-2 p-4 text-rose-500 opacity-20 dark:opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-1 group-hover:-translate-x-1 pointer-events-none">
                  <ReceiptRussianRuble size={80} />
                </div>
                <div className="flex justify-between items-start relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">НДФЛ</p>
                </div>
                <div 
                  onClick={() => handleCopy(yearlyTotals.progressiveTax, 'tax')}
                  className="relative z-10 cursor-pointer group/copy w-fit mt-1"
                  title="Нажмите, чтобы скопировать"
                >
                  <h3 className="text-xl font-bold text-rose-500 dark:text-rose-400 font-mono flex items-center gap-2 transition-opacity group-hover/copy:opacity-70">
                    <AnimatedCurrency value={yearlyTotals.progressiveTax} />
                  </h3>
                </div>
                <div className="mt-2 flex items-center justify-between relative z-10">
                  <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-bold">
                    {yearlyTotals.effectiveRate.toFixed(1)}% эфф.
                  </span>
                </div>
              </div>

              {/* Tax Details */}
              <div className="col-span-2 bg-white dark:bg-slate-900/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Детализация НДФЛ</p>
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[160px] pr-2 custom-scrollbar">
                  {yearlyTotals.brackets.map((b, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 last:border-0 pb-2 last:pb-0">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{b.label}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 dark:text-slate-400">{b.rate}%</span>
                        </div>
                        <span className="font-mono opacity-50 text-[10px] text-slate-500 dark:text-slate-400">База: {formatCurrency(b.amount)}</span>
                      </div>
                      <span className="font-mono font-medium text-sm text-slate-900 dark:text-slate-100">{formatCurrency(b.tax)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white dark:bg-slate-900/50 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] border border-slate-200/60 dark:border-slate-800/60 flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6 text-center">Структура дохода</h3>
              
              <div className="space-y-6">
                {/* Stacked Bar */}
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full flex shadow-inner">
                  {(() => {
                    const total = yearlyTotals.totalGross;
                    const netPercent = total > 0 ? (yearlyTotals.finalNet / total) * 100 : 0;
                    const taxPercent = total > 0 ? (yearlyTotals.progressiveTax / total) * 100 : 0;
                    
                    return (
                      <>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${netPercent}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-indigo-500 relative group rounded-l-full"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10 pointer-events-none transform group-hover:-translate-y-1">
                            На руки: {Math.round(netPercent)}%
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                          </div>
                        </motion.div>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${taxPercent}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          className="h-full bg-rose-500 relative group rounded-r-full"
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 dark:bg-slate-700 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl whitespace-nowrap z-10 pointer-events-none transform group-hover:-translate-y-1">
                            Налог: {Math.round(taxPercent)}%
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                          </div>
                        </motion.div>
                      </>
                    );
                  })()}
                </div>

                {/* Legend List */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">На руки</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(yearlyTotals.finalNet)}</span>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-10 text-right">
                        {yearlyTotals.totalGross > 0 ? Math.round((yearlyTotals.finalNet / yearlyTotals.totalGross) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Налог</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono font-bold text-gray-800 dark:text-gray-200">{formatCurrency(yearlyTotals.progressiveTax)}</span>
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-10 text-right">
                        {yearlyTotals.totalGross > 0 ? Math.round((yearlyTotals.progressiveTax / yearlyTotals.totalGross) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Progressive Scale Info Button */}
            <button 
              onClick={() => setIsTaxInfoModalOpen(true)}
              className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2 font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all cursor-pointer shadow-sm"
            >
              <Info size={18} /> Справка по НДФЛ {state.activeYear}
            </button>
          </div>
        </div>

      </div>

      {/* Clear Data Modal */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsClearModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Очистить данные?</h3>
                </div>
                <button onClick={() => setIsClearModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Вы уверены, что хотите очистить все введенные данные (оклады, премии) за <strong>{state.activeYear} год</strong>? Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsClearModalOpen(false)}
                  className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  onClick={clearActiveYearData}
                  className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
                >
                  Да, очистить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Year Modal */}
      <AnimatePresence>
        {isDeleteYearModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsDeleteYearModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <Trash2 size={24} />
                  </div>
                  <h3 className="text-xl font-bold">Удалить год?</h3>
                </div>
                <button onClick={() => setIsDeleteYearModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Вы уверены, что хотите полностью удалить вкладку и данные за <strong>{state.activeYear} год</strong>? Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsDeleteYearModalOpen(false)}
                  className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  onClick={deleteActiveYear}
                  className="px-4 py-2 font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
                >
                  Да, удалить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <TaxSettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            taxBrackets={state.taxBrackets}
            onSave={(newBrackets) => {
              setState(prev => ({ ...prev, taxBrackets: newBrackets }));
              addToast("Настройки налогов сохранены");
            }}
            onExport={exportJSON}
            onImport={importJSON}
          />
        )}
      </AnimatePresence>

      {/* Tax Info Modal */}
      <AnimatePresence>
        {isTaxInfoModalOpen && (
          <TaxReferenceModal 
            isOpen={isTaxInfoModalOpen}
            onClose={() => setIsTaxInfoModalOpen(false)}
            year={state.activeYear}
            brackets={state.taxBrackets[state.activeYear] || DEFAULT_TAX_BRACKETS[2025] || []}
          />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={cn(
                "px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 pointer-events-auto",
                toast.type === 'success' 
                  ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                  : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
              )}
            >
              {toast.type === 'success' ? <Check size={18} className="text-emerald-500" /> : <Info size={18} className="text-blue-500" />}
              <span className="font-medium text-sm">{toast.message}</span>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
