import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';
import { formatCurrency } from '../../lib/taxCalculator';

export const AnimatedCurrency = ({ value, className }: { value: number, className?: string }) => {
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => formatCurrency(current));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
};
