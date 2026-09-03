import React from 'react';

export const TodayGlow = () => {
  return (
    <div className="absolute -inset-[2px] rounded-[inherit] pointer-events-none z-20">
      {/* Мягкое пульсирующее свечение вокруг всей карточки */}
      <div className="absolute inset-0 rounded-[inherit] shadow-[0_0_14px_rgba(59,130,246,0.25)] animate-[breathe_6s_ease-in-out_infinite]" />
      
      {/* Маска, которая вырезает только рамку */}
      <div 
        className="absolute inset-0 rounded-[inherit] overflow-hidden"
        style={{
          padding: '2px',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude'
        }}
      >
        {/* Базовая полупрозрачная рамка, чтобы грани никогда не исчезали полностью */}
        <div className="absolute inset-0 bg-primary-500/20" />
        
        {/* Медленно вращающийся перелив. Имеет две мягкие точки акцента (на 25% и 75%),
            которые величественно плывут по граням, создавая эффект космического мерцания. */}
        <div className="absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0%,theme(colors.primary.400)_25%,transparent_50%,theme(colors.primary.400)_75%,transparent_100%)] animate-[spin_12s_linear_infinite] opacity-90" />
      </div>
    </div>
  );
};
