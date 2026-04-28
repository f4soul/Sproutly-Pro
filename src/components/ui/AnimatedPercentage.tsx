import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

export const AnimatedPercentage = ({ 
  value, 
  className,
  showPlus = false,
  showArrow = false
}: { 
  value: number, 
  className?: string,
  showPlus?: boolean,
  showArrow?: boolean
}) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => {
    const rounded = current.toFixed(1);
    const sign = current > 0 && showPlus ? '+' : '';
    return `${sign}${rounded}%`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {showArrow && (
        <motion.span
          animate={{ rotate: value >= 0 ? 0 : 180 }}
          style={{ display: 'inline-block' }}
        >
          ↑
        </motion.span>
      )}
      <motion.span>{display}</motion.span>
    </motion.div>
  );
};
