import React, { useState, useEffect } from 'react';
import { ToastContainer } from './ToastContainer';
import { Toast } from '../../types';
import { toastEvent } from '../../lib/toast';

export const GlobalToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const id = detail.id;
      
      setToasts(prev => {
        const existing = prev.find(t => t.id === id);
        if (existing) {
          return prev.map(t => t.id === id ? { ...t, ...detail } : t);
        }
        return [...prev, { ...detail }];
      });
      
      if (detail.duration !== Infinity && detail.type !== 'loading') {
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), detail.duration || 3000);
      }
    };

    toastEvent.addEventListener('add_toast', handleToast);
    return () => toastEvent.removeEventListener('add_toast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
};
