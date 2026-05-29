import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { formatCurrency } from '../../lib/taxCalculator';

export const AnimatedCurrency = ({ value, className }: { value: number, className?: string }) => {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatCurrency(current));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <span className={`inline-grid tabular-nums ${className || ''}`}>
      <span className="invisible col-start-1 row-start-1 text-inherit pr-2" aria-hidden="true">
        {formatCurrency(value)}
      </span>
      <motion.span className="col-start-1 row-start-1 text-inherit pr-2">
        {display}
      </motion.span>
    </span>
  );
};
