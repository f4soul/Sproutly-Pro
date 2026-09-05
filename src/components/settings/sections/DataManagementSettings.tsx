import React, { useRef, useState, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dialog } from '@headlessui/react';
import { CloudSync, Download, Upload, AlertTriangle, FileSpreadsheet, Database, RefreshCw } from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { useDeposits } from '../../../context/DepositsContext';
import { useAssets } from '../../../context/AssetsContext';
import { useIncome } from '../../../context/IncomeContext';
import { showToast } from '../../../lib/toast';
import { db, syncWithFirebase } from '../../../config/db';
import { logger } from '../../../lib/logger';

export function DataManagementSettings() {
  const { deposits } = useDeposits();
  const { cashAssets, investmentAssets, cryptoAssets } = useAssets();
  const { state, setState } = useIncome();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

  const exportFullBackupXLSX = async () => {
    try {
      const { exportFullBackup } = await import('../../../services/ExportService');
      exportFullBackup({
        deposits: deposits || [],
        cashAssets: cashAssets || [],
        investmentAssets: investmentAssets || [],
        cryptoAssets: cryptoAssets || [],
        years: state.years || {}
      });
    } catch (error) {
      logger.error('Error exporting to XLSX:', error);
    }
  };

  const exportData = async () => {
    try {
      const allDeposits = await db.deposits.toArray();
      const settings = await db.taxYearSettings.toArray();
      const appSettingsData = await db.appSettings.toArray();
      const banks = await db.banks.toArray();

      const data = {
        deposits: allDeposits,
        settings,
        appSettings: appSettingsData,
        banks,
        incomeTracker: state,
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Данные экспортированы');
    } catch (error) {
      logger.error('Error exporting JSON:', error);
      showToast('Ошибка при экспорте данных', 'error');
    }
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImportFile(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    if (!pendingImportFile) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const now = Date.now();

        if (data.deposits) {
          const mappedDeposits = data.deposits.map((d: any) => ({
            ...d,
            startDate: new Date(d.startDate),
            endDate: d.endDate ? new Date(d.endDate) : undefined,
            updatedAt: now
          }));
          await db.deposits.clear();
          await db.deposits.bulkPut(mappedDeposits);
        }
        if (data.settings) {
          const mappedSettings = data.settings.map((s: any) => ({ ...s, updatedAt: now }));
          await db.taxYearSettings.clear();
          await db.taxYearSettings.bulkPut(mappedSettings);
        }
        if (data.appSettings) {
          const mappedApp = data.appSettings.map((s: any) => ({ ...s, updatedAt: now }));
          await db.appSettings.clear();
          await db.appSettings.bulkPut(mappedApp);
        }
        if (data.banks) {
          const mappedBanks = data.banks.map((b: any) => ({ ...b, updatedAt: now }));
          await db.banks.clear();
          await db.banks.bulkPut(mappedBanks);
        }
        if (data.incomeTracker && data.incomeTracker.years && data.incomeTracker.activeYear) {
          // setState handles setting updatedAt inside
          setState(data.incomeTracker);
        }
        showToast('Данные успешно импортированы');
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        logger.error('Import error:', err);
        showToast('Ошибка при импорте данных', 'error');
      }
    };
    reader.readAsText(pendingImportFile);
    setPendingImportFile(null);
  };

  return (
    <>
      <section className="apple-card p-4 sm:p-5 xl:p-6 space-y-6 flex flex-col">
        <div className="flex items-center justify-between h-12 mb-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary-500/10 dark:bg-primary-500/10 flex items-center justify-center shrink-0">
              <CloudSync className="w-6 h-6 text-primary-500 stroke-[1.5px]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Резервная копия</h3>
              <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Экспорт и импорт данных</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-white/[0.05] overflow-hidden p-1 space-y-1">
          {/* EXCEL экспорт */}
          <button
            type="button"
            onClick={exportFullBackupXLSX}
            className="w-full min-h-[65.5px] flex items-center justify-between px-4 py-3 sm:py-3.5 bg-white/60 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.05] rounded-xl transition-all outline-none group select-none active:scale-[0.98]"
            title="Скачать таблицу Excel"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                <FileSpreadsheet size={16} className="stroke-[2px]" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Excel</span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Для аналитики в таблицах</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-colors shrink-0">
              <Upload size={16} className="stroke-[2.5px]" />
            </div>
          </button>

          {/* JSON экспорт */}
          <button
            type="button"
            onClick={exportData}
            className="w-full min-h-[65.5px] flex items-center justify-between px-4 py-3 sm:py-3.5 bg-white/60 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.05] rounded-xl transition-all outline-none group select-none active:scale-[0.98]"
            title="Скачать резервную копию"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0">
                <Database size={16} className="stroke-[2px]" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Экспорт данных</span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Сохранить в формате JSON</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary-500 group-hover:bg-primary-500/10 transition-colors shrink-0">
              <Upload size={16} className="stroke-[2.5px]" />
            </div>
          </button>

          {/* JSON импорт */}
          <label
            className="w-full min-h-[65.5px] flex items-center justify-between px-4 py-3 sm:py-3.5 bg-white/60 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.05] rounded-xl transition-all cursor-pointer outline-none group select-none active:scale-[0.98]"
            title="Восстановить из файла"
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                <RefreshCw size={16} className="stroke-[2px]" />
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Импорт данных</span>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight pr-2">Восстановить данные из JSON</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-amber-500 group-hover:bg-amber-500/10 transition-colors shrink-0">
              <Download size={16} className="stroke-[2.5px]" />
            </div>
            <input type="file" className="sr-only" accept=".json" onChange={importData} />
          </label>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {pendingImportFile !== null && (
          <Dialog as="div" className="relative z-[150]" open={true} onClose={() => setPendingImportFile(null)} static>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/10 dark:bg-slate-950/80 backdrop-blur-sm"
              aria-hidden="true"
            />
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
              <Dialog.Panel as={Fragment}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 100 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 100 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800/50 flex flex-col pointer-events-auto px-6 pt-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:p-8 text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                      <AlertTriangle className="w-6 h-6 stroke-[1.5px]" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white mb-2">Подтвердите действие</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Вы собираетесь восстановить данные из резервной копии.<br/><br/>
                    <strong className="text-amber-600 dark:text-amber-500 font-bold">Внимание:</strong> Это полностью перезапишет все ваши текущие данные, вклады, активы и настройки. Отменить эту операцию будет невозможно.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setPendingImportFile(null)}
                      className="flex-1 apple-button bg-slate-50 dark:bg-slate-800/50 text-slate-950 dark:text-white hover:bg-[#E5E5E7] dark:hover:bg-white/10 text-sm sm:text-base cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={confirmImport}
                      className="flex-1 apple-button bg-amber-500 text-white shadow-lg shadow-amber-500/20 text-sm sm:text-base cursor-pointer"
                    >
                      Восстановить
                    </button>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
