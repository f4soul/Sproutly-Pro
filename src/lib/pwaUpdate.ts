import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { logger } from './logger';

export interface PwaUpdateState {
  needRefresh: boolean;
  isUpdating: boolean;
}

// Боевой режим: по умолчанию false, выставляется в true событием onNeedRefresh от Service Worker
let state: PwaUpdateState = {
  needRefresh: false,
  isUpdating: false,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      logger.error('Error in PWA update listener:', e);
    }
  });
}

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let initialized = false;

export function initPwaUpdate() {
  if (initialized || typeof window === 'undefined') {
    return;
  }
  initialized = true;

  // Хелпер для удобного вызова из консоли DevTools: window.__showReloadPrompt()
  (window as unknown as { __showReloadPrompt?: (show?: boolean) => void }).__showReloadPrompt = (show = true) => {
    setPwaNeedRefresh(show);
  };

  if (!('serviceWorker' in navigator)) {
    return;
  }

  try {
    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        logger.info('PWA: new content is waiting to be activated');
        setPwaNeedRefresh(true);
      },
      onOfflineReady() {
        logger.info('PWA: application is ready for offline work');
      },
      onRegisterError(error) {
        logger.error('PWA: Service Worker registration error:', error);
      },
    });
  } catch (err) {
    logger.error('Failed to initialize Service Worker registration:', err);
  }
}

export function setPwaNeedRefresh(needRefresh: boolean) {
  state = { ...state, needRefresh };
  notify();
}

export async function triggerPwaUpdate() {
  if (state.isUpdating) return;
  state = { ...state, isUpdating: true };
  notify();

  try {
    if (updateSWFn) {
      await updateSWFn(true);
    } else {
      // Плавная симуляция в dev-режиме предпросмотра
      await new Promise((res) => setTimeout(res, 700));
      window.location.reload();
    }
  } catch (err) {
    logger.error('PWA: failed to update service worker:', err);
    state = { ...state, isUpdating: false };
    notify();
  }
}

export function dismissPwaUpdate() {
  setPwaNeedRefresh(false);
}

export function subscribePwaUpdate(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPwaUpdateSnapshot(): PwaUpdateState {
  return state;
}

/**
 * Хук для реактивной подписки на статус обновления PWA
 */
export function usePwaUpdate() {
  const current = useSyncExternalStore(subscribePwaUpdate, getPwaUpdateSnapshot, getPwaUpdateSnapshot);

  return {
    needRefresh: current.needRefresh,
    isUpdating: current.isUpdating,
    triggerPwaUpdate,
    dismissPwaUpdate,
    setPwaNeedRefresh,
  };
}
