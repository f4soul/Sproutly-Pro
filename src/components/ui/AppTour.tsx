import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { db } from '../../config/db';
import { showToast } from '../../lib/toast';
import { useLiveQuery } from 'dexie-react-hooks';
import ReactDOMServer from 'react-dom/server';
import { Map, Zap, Landmark, Bolt, LayoutDashboard } from 'lucide-react';

interface AppTourProps {
  activeTab?: string;
  isLocked?: boolean;
}

export const AppTour: React.FC<AppTourProps> = ({ activeTab, isLocked = false }) => {
  const appSettings = useLiveQuery(() => db.appSettings.get('main'));
  const shownThisSession = useRef({ dashboard: false, deposits: false, ndfl: false });
  const driverInstance = useRef<any>(null);
  const cancelledDueToLockRef = useRef<boolean>(false);

  // Sync DB completion state with session state
  useEffect(() => {
    if (appSettings) {
      if (!appSettings.tourCompleted) {
        shownThisSession.current.dashboard = false;
      }
      if (!appSettings.tourCompletedAssets) {
        shownThisSession.current.deposits = false;
      }
      if (!appSettings.tourCompletedIncome) {
        shownThisSession.current.ndfl = false;
      }
    }
  }, [appSettings]);

  const generateHtmlContent = (icon: React.ReactNode, title: string, text: React.ReactNode) => {
    return ReactDOMServer.renderToString(
      <div className="flex flex-col text-left">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400">
          {text}
        </p>
      </div>
    );
  };

  const dashboardSteps = [
    {
      popover: {
        description: ReactDOMServer.renderToString(
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500">
                <Map className="w-5 h-5" />
              </div>
              <h3 className="text-[15px] font-black text-slate-900 dark:text-white uppercase tracking-wider">Добро пожаловать</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
              Давайте проведем небольшую экскурсию по ключевым функциям системы, чтобы вы могли использовать Sproutly.Pro на 100%.
            </p>
          </div>
        ),
        align: 'center',
        side: 'bottom'
      }
    },
    {
      element: '[data-tour="dashboard-tabs"]',
      popover: {
        description: generateHtmlContent(
          <LayoutDashboard className="w-4 h-4 text-primary-500" />,
          'Навигация по разделам',
          'Здесь находятся основные вкладки системы. Вы всегда можете быстро переключаться между Сводкой, Доходами и Активами. Не упускайте их из виду.'
        ),
        side: 'bottom',
      }
    },
    {
      element: '[data-tour="privacy-toggle"]',
      popover: {
        description: generateHtmlContent(
          null,
          'Режим Инкогнито',
          'Нажмите на эту кнопку, чтобы мгновенно скрыть все суммы и балансы. Удобно для использования в публичных местах.'
        ),
        side: 'bottom',
      }
    }
  ];

  const assetsSteps = [
    {
      element: '[data-tour="assets-tabs"]',
      popover: {
        description: generateHtmlContent(
          <Landmark className="w-4 h-4 text-primary-500" />,
          'Вклады и Сейф',
          <span>Активы разделены на две сущности. <b>Вклады</b> показывают расчёт сложных процентов банковских счетов, а <b>Сейф</b> — это наличные или валюта, не генерирующие доход.</span>
        ),
        side: 'bottom',
      }
    },
    {
      element: '[data-tour="assets-filters"]',
      popover: {
        description: generateHtmlContent(
          <Bolt className="w-4 h-4 text-primary-500" />,
          'Смарт-фильтрация',
          'Здесь находится крутой смарт-блок фильтрации! Сортируйте вклады по доходности, отфильтруйте только закрытые и смотрите детализированную аналитику по вашим банкам.'
        ),
        side: 'bottom',
      }
    }
  ];

  const incomeSteps = [
    {
      element: '[data-tour="income-navigator"]',
      popover: {
        description: generateHtmlContent(
          <Zap className="w-4 h-4 text-primary-500" />,
          'Раздел Доходов',
          'Переключайтесь между годами или используйте кнопки рядом, чтобы добавлять новые и удалять текущие таблицы. При добавлении нового года система автоматически загружает актуальный производственный календарь.'
        ),
        side: window.innerWidth >= 1280 ? 'bottom' : 'bottom',
      }
    },
    {
      element: '[data-tour="income-config"]',
      popover: {
        description: generateHtmlContent(
          <Bolt className="w-4 h-4 text-primary-500" />,
          'Настройка Формы',
          'Этот раздел - конструктор. Нажмите на шестеренку, чтобы добавить премиальные колонки, надбавки или настроить налоги. Вы сами собираете вашу расчетную таблицу.'
        ),
        side: 'bottom',
      }
    },
    {
      element: '[data-tour="income-tools"]',
      popover: {
        description: generateHtmlContent(
          <Zap className="w-4 h-4 text-primary-500" />,
          'Инструменты и симулятор',
          <span>В выпадающем меню спрятан симулятор <b>What-If</b> (прогноз доходов), инструменты копирования данных, и красивый экспорт в Excel/PDF!</span>
        ),
        side: 'bottom',
      }
    },
    {
      element: window.innerWidth >= 1024 ? '[data-tour="working-days-desktop"]' : '[data-tour="working-days-mobile"]',
      popover: {
        description: generateHtmlContent(
          null,
          'Рабочие дни',
          'Если в вашем графике произошли изменения или вы взяли отпуск (БС), просто кликайте на цифры количества дней в конкретном месяце, чтобы скорректировать их.'
        ),
        side: 'top',
      }
    }
  ];

  // Cancel tour if app locks
  useEffect(() => {
    if (isLocked) {
      if (driverInstance.current) {
        cancelledDueToLockRef.current = true;
        driverInstance.current.destroy();
        driverInstance.current = null;
      }
    } else {
      cancelledDueToLockRef.current = false;
    }
  }, [isLocked]);

  useEffect(() => {
    if (!appSettings || isLocked) return;

    let timerId: any = null;

    let skippedTour = false;

    const finalizeTour = async (tab: string) => {
      try {
        const settings = await db.appSettings.get('main');
        if (settings) {
          const updated = { ...settings, updatedAt: Date.now() };
          if (skippedTour) {
            updated.tourCompleted = true;
            updated.tourCompletedAssets = true;
            updated.tourCompletedIncome = true;
            showToast('Подсказки полностью отключены', 'success');
          } else {
            if (tab === 'dashboard') {
              updated.tourCompleted = true;
              showToast('Обучение по Дашборду завершено', 'success');
            } else if (tab === 'deposits') {
              updated.tourCompletedAssets = true;
              showToast('Обучение по Активам завершено', 'success');
            } else if (tab === 'ndfl') {
              updated.tourCompletedIncome = true;
              showToast('Обучение по Доходам завершено', 'success');
            }
          }
          await db.appSettings.put(updated);
        }
      } catch (e) {
        console.error('Failed to update final tour progress', e);
      }
    };

    const runDriver = (steps: any[], tab: string) => {
      skippedTour = false;
      driverInstance.current = driver({
        showProgress: false,
        showButtons: [], // We handle buttons via Custom HTML
        allowClose: false,
        overlayColor: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'rgba(0, 0, 0, 0.7)' : 'rgba(5, 10, 20, 0.4)',
        popoverClass: 'sproutly-tour-theme',
        padding: typeof window !== 'undefined' && window.innerWidth < 1024 ? 4 : 8,
        stageRadius: 16,
        popoverOffset: 16,
        smoothScroll: true,
        steps: steps as any,
        onHighlightStarted: () => {
          document.body.classList.remove('overflow-hidden');
        },
        onHighlighted: () => {
          document.body.classList.add('overflow-hidden');
        },
        onDestroyed: () => {
          document.body.classList.remove('overflow-hidden');
          if (!cancelledDueToLockRef.current) {
            finalizeTour(tab);
          } else {
             // Reset shown flags so it can show again later when unlocked
             if (tab === 'dashboard') shownThisSession.current.dashboard = false;
             if (tab === 'deposits') shownThisSession.current.deposits = false;
             if (tab === 'ndfl') shownThisSession.current.ndfl = false;
          }
        },
        onPopoverRender: (popover, { state }: any) => {
          const isLastStep = state.isLastStep;
          const isFirstStep = state.activeIndex === 0;

          popover.wrapper.innerHTML = `
            <div class="flex flex-col h-full outline-none">
               <div class="mb-6 text-[13px] leading-relaxed">
                  ${state.activeStep?.popover?.description || ''}
               </div>
               
               <div class="flex items-center justify-between mt-auto">
                 <button class="tour-skip-btn text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors h-9 px-2 focus:outline-none cursor-pointer">
                   Пропустить
                 </button>
                 <div class="flex gap-2">
                   ${!isFirstStep ? `
                   <button class="tour-prev-btn text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 h-9 px-3 transition-colors focus:outline-none cursor-pointer">
                     Назад
                   </button>
                   ` : ''}
                   <button class="tour-next-btn text-[10px] font-black uppercase tracking-widest bg-slate-900 dark:bg-primary-500 text-white dark:text-slate-950 px-5 h-9 rounded-xl hover:scale-95 transition-all shadow-lg shadow-slate-900/10 dark:shadow-primary-500/20 focus:outline-none cursor-pointer">
                     ${isLastStep ? 'Понятно' : 'Далее'}
                   </button>
                 </div>
               </div>
            </div>
          `;

          const skipBtn = popover.wrapper.querySelector('.tour-skip-btn');
          if (skipBtn) skipBtn.addEventListener('click', () => {
            skippedTour = true;
            driverInstance.current?.destroy();
          });

          const prevBtn = popover.wrapper.querySelector('.tour-prev-btn');
          if (prevBtn) prevBtn.addEventListener('click', () => driverInstance.current?.movePrevious());

          const nextBtn = popover.wrapper.querySelector('.tour-next-btn');
          if (nextBtn) nextBtn.addEventListener('click', () => {
            if (isLastStep) {
              driverInstance.current?.destroy();
            } else {
              driverInstance.current?.moveNext();
            }
          });
        }
      } as any);

      document.body.classList.add('overflow-hidden');
      driverInstance.current.drive();
    };

    if (activeTab === 'dashboard' && !appSettings.tourCompleted && !shownThisSession.current.dashboard) {
      shownThisSession.current.dashboard = true;
      timerId = setTimeout(() => runDriver(dashboardSteps, 'dashboard'), 700);
    } else if (activeTab === 'deposits' && !appSettings.tourCompletedAssets && !shownThisSession.current.deposits) {
      shownThisSession.current.deposits = true;
      timerId = setTimeout(() => runDriver(assetsSteps, 'deposits'), 700);
    } else if (activeTab === 'ndfl' && !appSettings.tourCompletedIncome && !shownThisSession.current.ndfl) {
      shownThisSession.current.ndfl = true;
      timerId = setTimeout(() => runDriver(incomeSteps, 'ndfl'), 700);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      if (driverInstance.current) {
         // Cleanup if unmounted midway
         driverInstance.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, appSettings, isLocked]);

  return null;
};
