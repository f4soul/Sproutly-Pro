import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Archive as ArchiveIcon } from 'lucide-react';
import { Archive, ArchiveHeaderActions } from './Archive';
import { SecuritySettings } from './SecuritySettings';
import { NotificationsSettings } from './NotificationsSettings';
import { DataManagementSettings } from './sections/DataManagementSettings';
import { AssetTabsSettings } from './sections/AssetTabsSettings';
import { TaxBracketsSettings } from './sections/TaxBracketsSettings';
import { DepositsTaxSettings } from './sections/DepositsTaxSettings';
import { useSettings } from '../../context/SettingsContext';
import { useAssets } from '../../context/AssetsContext';
import { useDeposits } from '../../context/DepositsContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../config/db';

export function Settings() {
  const { appSettings: _appSettings } = useSettings();
  const { cashAssets, investmentAssets, cryptoAssets } = useAssets();
  const { deposits } = useDeposits();

  const archivedDeposits = useLiveQuery(async () => {
    const items = await db.deposits.where('isArchived').equals(1).toArray();
    return items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  });

  const prevArchivedRef = useRef<any[] | undefined>(undefined);
  useEffect(() => {
    if (archivedDeposits && archivedDeposits.length > 0) {
      prevArchivedRef.current = archivedDeposits;
    }
  }, [archivedDeposits]);

  const displayArchivedDeposits = archivedDeposits?.length ? archivedDeposits : (prevArchivedRef.current || []);
  const archivedCount = archivedDeposits?.length || 0;

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-300 relative w-full max-w-6xl mx-auto">
      {/* Backup + Asset Tabs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
        <DataManagementSettings />
        <AssetTabsSettings />
      </div>

      {/* Tax Brackets + Deposits Tax Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <TaxBracketsSettings />
        <DepositsTaxSettings />
      </div>

      {/* Security + Notifications Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch mb-6 lg:mb-8">
        <div className="w-full">
          <SecuritySettings appSettings={_appSettings} />
        </div>
        <div className="w-full">
          <NotificationsSettings />
        </div>
      </div>

      {/* Archive Section (Full Width) */}
      <AnimatePresence initial={false}>
        {archivedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="overflow-hidden transform-gpu origin-top"
          >
            <div className="grid grid-cols-1 gap-6 lg:gap-8 items-stretch mb-6 lg:mb-8 pt-1">
              <div className="w-full">
                <section className="apple-card p-4 sm:p-5 xl:p-6 flex flex-col max-h-[400px] lg:max-h-[450px]">
                  <div className="flex items-center gap-4 mb-4 sm:mb-6 justify-between shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                        <ArchiveIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 stroke-[1.5px]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Архив</h3>
                        <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate pr-2">Удаленные вклады</p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <ArchiveHeaderActions items={displayArchivedDeposits || []} />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 sm:pr-2 -mr-1 sm:-mr-2 pb-2">
                    <Archive items={displayArchivedDeposits || []} />
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
