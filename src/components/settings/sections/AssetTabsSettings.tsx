import React from 'react';
import { motion, Reorder, useDragControls } from 'motion/react';
import { LayoutList, GripVertical, Vault, ChartNoAxesCombined, Bitcoin } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useSettings } from '../../../context/SettingsContext';
import { useAssets } from '../../../context/AssetsContext';
import { db, syncWithFirebase } from '../../../config/db';
import { getAssetTabOrder, AssetTabId } from '../../../lib/constants';

const ASSET_TAB_META: Record<AssetTabId, {
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  toggleOn: string;
}> = {
  cash: { label: 'Сейф', Icon: Vault, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', toggleOn: 'bg-emerald-500' },
  investments: { label: 'Биржа', Icon: ChartNoAxesCombined, iconBg: 'bg-cyan-500/10', iconColor: 'text-cyan-500', toggleOn: 'bg-cyan-500' },
  crypto: { label: 'Крипта', Icon: Bitcoin, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500', toggleOn: 'bg-amber-500' },
};

interface AssetTabRowProps {
  tab: AssetTabId;
  hasAssets: boolean;
  isHidden: boolean;
  onToggle: (tab: AssetTabId) => void;
}

function AssetTabRow({ tab, hasAssets, isHidden, onToggle }: AssetTabRowProps) {
  const controls = useDragControls();
  const meta = ASSET_TAB_META[tab];
  const isLocked = hasAssets && !isHidden;

  return (
    <Reorder.Item
      value={tab}
      dragListener={false}
      dragControls={controls}
      className="w-full min-h-[65.5px] flex items-center justify-between px-4 py-3 sm:py-3.5 bg-white/60 dark:bg-white/[0.02] rounded-xl select-none relative"
      whileDrag={{ scale: 1, boxShadow: '0 12px 28px rgba(0,0,0,0.15)', zIndex: 20 }}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div
          onPointerDown={(e) => controls.start(e)}
          className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={20} />
        </div>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", meta.iconBg, meta.iconColor)}>
          <meta.Icon size={16} className="stroke-[2px]" />
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{meta.label}</span>
      </div>
      <button
        type="button"
        disabled={isLocked}
        onClick={() => onToggle(tab)}
        title={isLocked ? "Нельзя скрыть раздел, в котором есть активы" : ""}
        className={cn(
          "w-10 h-[22px] rounded-full transition-colors duration-200 relative flex items-center p-[2px] outline-none shrink-0",
          !isHidden ? meta.toggleOn : "bg-[#E9E9EA] dark:bg-[#39393D]",
          isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:scale-95"
        )}
      >
        {/* iOS On-indicator bar | */}
        <div
          className={cn(
            "absolute left-[8px] top-1/2 -translate-y-1/2 w-[1.5px] h-[7px] bg-white rounded-full transition-opacity duration-200 pointer-events-none",
            !isHidden ? "opacity-100" : "opacity-0"
          )}
        />
        {/* iOS Thumb / Knob */}
        <div
          className={cn(
            "w-[18px] h-[18px] bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-out z-10",
            !isHidden ? "translate-x-[18px]" : "translate-x-0"
          )}
        />
      </button>
    </Reorder.Item>
  );
}

export function AssetTabsSettings() {
  const { appSettings } = useSettings();
  const { cashAssets, investmentAssets, cryptoAssets } = useAssets();

  const hasCash = cashAssets.some(a => !a.isArchived);
  const hasInvestments = investmentAssets.some(a => !a.isArchived);
  const hasCrypto = cryptoAssets.some(a => !a.isArchived);

  const hiddenTabs = appSettings.hiddenAssetTabs || [];
  const assetTabOrder = getAssetTabOrder(appSettings.assetTabOrder);

  const handleReorderTabs = async (newOrder: AssetTabId[]) => {
    const newSettings = { ...appSettings, assetTabOrder: newOrder, updatedAt: Date.now() };
    await db.appSettings.put(newSettings);
    syncWithFirebase();
  };

  const handleToggleTab = async (tab: 'cash' | 'investments' | 'crypto') => {
    if (!hiddenTabs.includes(tab)) {
      if (tab === 'cash' && hasCash) return;
      if (tab === 'investments' && hasInvestments) return;
      if (tab === 'crypto' && hasCrypto) return;
    }

    let newHidden = [...hiddenTabs];
    if (newHidden.includes(tab)) {
      newHidden = newHidden.filter(t => t !== tab);
    } else {
      newHidden.push(tab);
    }

    const newSettings = { ...appSettings, hiddenAssetTabs: newHidden, updatedAt: Date.now() };
    await db.appSettings.put(newSettings);
    syncWithFirebase();
  };

  return (
    <section className="apple-card p-4 sm:p-5 xl:p-6 space-y-6 flex flex-col">
      <div className="flex items-center justify-between h-12 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center shrink-0">
            <LayoutList className="w-6 h-6 text-cyan-500 stroke-[1.5px]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-slate-950 dark:text-white truncate">Разделы Активов</h3>
            <p className="text-[11px] lg:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">Управление видимыми вкладками</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-white/[0.05] p-1">
        <Reorder.Group
          axis="y"
          values={assetTabOrder}
          onReorder={handleReorderTabs}
          className="space-y-1 relative"
        >
          {assetTabOrder.map((tab) => (
            <AssetTabRow
              key={tab}
              tab={tab}
              hasAssets={tab === 'cash' ? hasCash : tab === 'investments' ? hasInvestments : hasCrypto}
              isHidden={hiddenTabs.includes(tab)}
              onToggle={handleToggleTab}
            />
          ))}
        </Reorder.Group>
      </div>
    </section>
  );
}
