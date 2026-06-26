import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, BarChart3, TrendingUp, ChevronRight } from 'lucide-react';
import { SproutlyLogo } from '../ui/SproutlyLogo';

interface LandingViewProps {
  onStart: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#0B0F19] overflow-y-auto overflow-x-hidden selection:bg-deposit-500/30">
      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-deposit-500/10 dark:bg-deposit-500/20 blur-[120px]" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-primary-500/10 dark:bg-primary-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-teal-500/10 dark:bg-teal-500/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] md:py-12 flex flex-col min-h-[100dvh] [justify-content:safe_center]">
        <div className="flex flex-col w-full">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex justify-center mb-5 md:mb-6"
          >
            <div className="w-16 h-16 bg-white/80 dark:bg-slate-900/80 shadow-2xl border border-slate-200/50 dark:border-white/10 rounded-[1.5rem] flex items-center justify-center backdrop-blur-xl">
              <SproutlyLogo className="w-8 h-8 text-primary-500 drop-shadow-[0_0_12px_rgba(var(--rgb-primary),0.5)]" />
            </div>
          </motion.div>

          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-8 md:mb-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-3 sm:mb-5 leading-tight"
            >
              Управляйте капиталом<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-deposit-500 to-primary-500">
                с элегантностью
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-400 font-medium max-w-2xl"
            >
              Ваши доходы и вклады под полным контролем. Инструмент премиального уровня для персональной финансовой аналитики.
            </motion.p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 lg:gap-6 mb-8 md:mb-12">
            {[
              {
                icon: <ShieldCheck className="w-6 h-6 text-deposit-500" />,
                title: 'Полная анонимность',
                desc: 'Данные хранятся локально. Синхронизация защищена и полностью под вашим контролем.'
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-primary-500" />,
                title: 'Единый обзор',
                desc: 'Консолидированный дашборд с точной аналитикой по всем вашим банковским продуктам.'
              },
              {
                icon: <TrendingUp className="w-6 h-6 text-teal-500" />,
                title: 'Расчет доходностей',
                desc: 'Умные калькуляторы налогов, НДФЛ и сложных процентов в режиме реального времени.'
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + idx * 0.1, ease: "easeOut" }}
                className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/[0.05] shadow-xl p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] flex flex-col items-center text-center h-full"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm mb-3 sm:mb-4 border border-slate-100 dark:border-slate-700">
                  {feature.icon}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
            className="flex justify-center empty:hidden"
          >
            <button
              onClick={onStart}
              className="group relative flex items-center gap-3 px-8 sm:px-12 py-3 sm:py-4 bg-deposit-500 hover:bg-deposit-600 text-white rounded-[1.25rem] sm:rounded-2xl font-black text-base sm:text-lg tracking-wide shadow-[0_4px_16px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_24px_rgba(16,185,129,0.5)] transition-all active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
              <span>Начать работу</span>
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
