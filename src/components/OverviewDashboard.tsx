import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Deposit, TaxYearSettings, AppSettings } from '../types';
import { calculateIncomeByYears, calculateTax } from '../lib/depositCalculations';
import { useAppState } from '../hooks/useAppState';
import { calculateProgressiveTaxDetailed } from '../lib/taxCalculator';
import { formatCurrency, cn } from '../lib/utils';
import { Wallet, Landmark, Receipt, TrendingUp, ChevronDown, Download, FileText, Image as ImageIcon, FileSpreadsheet, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { exportToPDF, exportToImage, exportOverviewToXLSX } from '../services/ExportService';

interface OverviewDashboardProps {
  deposits: Deposit[];
  taxSettings: TaxYearSettings[];
  appSettings: AppSettings;
}

export function OverviewDashboard({ deposits, taxSettings, appSettings }: OverviewDashboardProps) {
  const { state } = useAppState();
  const [selectedYear, setSelectedYear] = useState<number>(state.activeYear);

  const availableYears = useMemo(() => {
    const yearsSet = new Set([new Date().getFullYear(), ...Object.keys(state.years).map(Number)]);
    deposits.forEach(d => {
      if (d.startDate) {
        const startDate = new Date(d.startDate);
        if (!isNaN(startDate.getTime())) {
          yearsSet.add(startDate.getFullYear());
        }
      }
      if (d.endDate) {
        const endDate = new Date(d.endDate);
        if (!isNaN(endDate.getTime())) {
          yearsSet.add(endDate.getFullYear());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [deposits, state.years]);

  const data = useMemo(() => {
    // 1. Deposits Data
    let depositsIncome = 0;
    deposits.forEach(d => {
      const yearIncomes = calculateIncomeByYears(d);
      const yearIncome = yearIncomes.find(yi => yi.year === selectedYear)?.income || 0;
      depositsIncome += yearIncome;
    });

    const currentYearSettings = taxSettings.find(s => s.year === selectedYear) || { year: selectedYear, limit: 210000, ndflRate: 13 };
    const taxableDepositIncome = Math.max(0, depositsIncome - currentYearSettings.limit);

    // 2. Salary Data
    let salaryGross = 0;
    const yearData = state.years[selectedYear];
    
    if (yearData) {
      const calcMonths = yearData.months.map((m, index) => {
        const base = m.factDays < m.normDays ? m.salary * (m.factDays / m.normDays) : m.salary;
        let bonus = 0;
        if (index % 3 === 2) {
          const qIndex = Math.floor(index / 3);
          bonus += yearData.quarters?.[qIndex]?.bonusAmount || 0;
        }
        return base + bonus;
      });
      salaryGross = calcMonths.reduce((sum, m) => sum + m, 0) + (yearData.annualBonusAmount || 0) + (yearData.extraBonusAmount || 0) + (yearData.additionalIncome || 0);
    }

    // 3. Combined Progressive Tax Calculation
    const totalTaxableIncome = salaryGross + taxableDepositIncome;
    const { tax: totalTax } = calculateProgressiveTaxDetailed(totalTaxableIncome, selectedYear, state.taxBrackets);
    
    // For visualization, we can estimate the split (proportional or sequential)
    // Sequential: Salary first, then deposits
    const { tax: salaryTax } = calculateProgressiveTaxDetailed(salaryGross, selectedYear, state.taxBrackets);
    const depositsTax = totalTax - salaryTax;

    const salaryNet = salaryGross - salaryTax;
    const depositsNet = depositsIncome - depositsTax;

    // 4. Consolidated Data
    const totalGross = salaryGross + depositsIncome;
    const totalNet = salaryNet + depositsNet;

    // 5. Tax Forecast (Paid vs To be paid)
    // Assume 13% of salary is already paid (withheld by employer)
    const taxPaid = salaryGross * 0.13;
    const taxToBePaid = Math.max(0, totalTax - taxPaid);

    return {
      depositsIncome,
      depositsTax,
      depositsNet,
      salaryGross,
      salaryTax,
      salaryNet,
      totalGross,
      totalTax,
      totalNet,
      taxPaid,
      taxToBePaid,
      limit: currentYearSettings.limit
    };
  }, [deposits, selectedYear, taxSettings, state]);

  const incomeChartData = [
    { name: 'Зарплата', value: data.salaryGross, color: '#6366f1' }, // indigo-500
    { name: 'Вклады', value: data.depositsIncome, color: '#10b981' }, // emerald-500
  ];

  const taxForecastData = [
    { name: 'Уплачено (13%)', value: data.taxPaid, color: '#3b82f6' }, // blue-500
    { name: 'К доплате', value: data.taxToBePaid, color: '#f43f5e' }, // rose-500
  ];

  const taxChartData = [
    { name: 'Налог с зарплаты', value: data.salaryTax, color: '#f43f5e' }, // rose-500
    { name: 'Налог со вкладов', value: data.depositsTax, color: '#f97316' }, // orange-500
  ];

  const barChartData = [
    {
      name: 'Зарплата',
      'Доход': data.salaryGross,
      'Налог': data.salaryTax,
    },
    {
      name: 'Вклады',
      'Доход': data.depositsIncome,
      'Налог': data.depositsTax,
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 relative max-w-7xl mx-auto pb-12">
      {/* Header & Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-light-text-primary dark:text-dark-text-primary">Сводный Дашборд</h1>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary font-medium">Общая картина доходов и налогов</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mr-2">
            <button 
              onClick={() => exportToPDF('overview-content')}
              className="apple-button p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Экспорт в PDF"
            >
              <FileText size={18} />
            </button>
            <button 
              onClick={() => exportToImage('overview-content')}
              className="apple-button p-2 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Экспорт в PNG"
            >
              <ImageIcon size={18} />
            </button>
            <button 
              onClick={() => exportOverviewToXLSX(data, selectedYear)}
              className="apple-button p-2 text-slate-500 hover:text-green-600 dark:text-slate-400 dark:hover:text-green-400 hover:bg-slate-50 dark:hover:bg-slate-700"
              title="Экспорт в Excel"
            >
              <FileSpreadsheet size={18} />
            </button>
          </div>

          <div className="relative group">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="apple-button appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-bold pl-4 pr-10 py-2.5 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year} год</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-transform group-hover:translate-y-0.5" />
          </div>
        </div>
      </div>

      <div id="overview-content" className="space-y-6">
        {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="apple-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary">Общий Доход (Gross)</h3>
          </div>
          <p className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary font-mono">
            {formatCurrency(data.totalGross)}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="apple-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary">Чистый Доход (Net)</h3>
          </div>
          <p className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary font-mono">
            {formatCurrency(data.totalNet)}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="apple-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <Receipt className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary">Всего Налогов</h3>
          </div>
          <p className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary font-mono">
            {formatCurrency(data.totalTax)}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="apple-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-sm font-bold text-light-text-secondary dark:text-dark-text-secondary">Необлагаемый Лимит</h3>
          </div>
          <p className="text-2xl font-black text-light-text-primary dark:text-dark-text-primary font-mono">
            {formatCurrency(data.limit)}
          </p>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="apple-card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Быстрые действия</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'deposits' }))}
              className="apple-button flex flex-col items-center gap-3 p-6 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
            >
              <Landmark size={24} />
              <span className="text-sm font-bold">Добавить вклад</span>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'ndfl' }))}
              className="apple-button flex flex-col items-center gap-3 p-6 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
            >
              <Wallet size={24} />
              <span className="text-sm font-bold">Обновить доходы</span>
            </button>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('app:change-tab', { detail: 'settings' }))}
              className="apple-button flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-500/20 hover:bg-slate-100 dark:hover:bg-slate-500/20 transition-all"
            >
              <SettingsIcon size={24} />
              <span className="text-sm font-bold">Настройки</span>
            </button>
            <button 
              onClick={() => exportToPDF('overview-content')}
              className="apple-button flex flex-col items-center gap-3 p-6 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all"
            >
              <Download size={24} />
              <span className="text-sm font-bold">Экспорт отчета</span>
            </button>
          </div>
        </div>

        {/* Income Breakdown */}
        <div className="apple-card p-6">
          <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Структура Доходов</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {incomeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tax Forecast */}
        <div className="apple-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Налоговый прогноз</h3>
            <div className="text-right">
              <p className="text-[10px] text-light-text-secondary dark:text-dark-text-secondary uppercase font-bold tracking-wider">Всего к уплате</p>
              <p className="text-sm font-black text-rose-500">{formatCurrency(data.totalTax)}</p>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taxForecastData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {taxForecastData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart Comparison */}
        <div className="apple-card p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Сравнение: Доход и Налог</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                <Bar dataKey="Доход" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Налог" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
