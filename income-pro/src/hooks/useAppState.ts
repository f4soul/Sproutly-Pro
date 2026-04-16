import { useState, useEffect, useRef } from 'react';
import { AppState, Toast } from '../types';
import { generateDefaultYear } from '../lib/helpers';
import { DEFAULT_TAX_BRACKETS } from '../lib/constants';
import { auth, db, onAuthStateChanged, doc, setDoc, onSnapshot, User } from '../firebase';

// --- Firebase Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

const getInitialState = (): AppState => {
  const saved = localStorage.getItem('incomeCalculatorState_v4');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!parsed.taxBrackets) {
        parsed.taxBrackets = DEFAULT_TAX_BRACKETS;
      }
      // Migrate old years to new structure
      if (parsed.years) {
        Object.keys(parsed.years).forEach(yearKey => {
          const y = parsed.years[yearKey];
          if (!y.quarters) {
            y.quarters = Array.from({ length: 4 }, () => ({ bonusCoef: 0, bonusAmount: 0 }));
          }
          if (y.annualBonusAmount === undefined) y.annualBonusAmount = 0;
          if (y.extraBonusAmount === undefined) y.extraBonusAmount = 0;
          if (y.bonusBase === undefined) y.bonusBase = 169500;
        });
      }
      return parsed;
    } catch (e) {
      console.error('Failed to parse saved state', e);
    }
  }
  return {
    years: {
      2024: generateDefaultYear(2024),
      2025: generateDefaultYear(2025),
    },
    activeYear: 2025,
    taxBrackets: DEFAULT_TAX_BRACKETS,
  };
};

export const useAppState = () => {
  const [state, setState] = useState<AppState>(getInitialState);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'idle'>('offline');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastSyncedStateRef = useRef<string>('');

  const addToast = (message: string, type: 'success' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        setSyncStatus('syncing');
      } else {
        setSyncStatus('offline');
      }
    });
    return () => unsubscribe();
  }, []);

  // Firestore Sync (Read)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const docRef = doc(db, 'users', user.uid, 'data', 'income');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data() as AppState;
        const remoteString = JSON.stringify(remoteData);
        
        if (remoteString !== lastSyncedStateRef.current) {
          setState(prev => ({
            ...prev,
            ...remoteData,
          }));
          lastSyncedStateRef.current = remoteString;
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('synced');
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/data/income`);
      setSyncStatus('error');
    });

    return () => unsubscribe();
  }, [isAuthReady, user]);

  // Firestore Sync (Write)
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const currentStateString = JSON.stringify(state);
    if (currentStateString === lastSyncedStateRef.current) return;

    setSyncStatus('syncing');

    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'data', 'income');
        await setDoc(docRef, {
          ...state,
          updatedAt: new Date().toISOString()
        });
        lastSyncedStateRef.current = currentStateString;
        setSyncStatus('synced');
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/data/income`);
        setSyncStatus('error');
      }
    }, 1000); // Debounce saves

    return () => clearTimeout(timer);
  }, [state, user, isAuthReady]);

  // Hide sync status after success
  useEffect(() => {
    if (syncStatus === 'synced') {
      const timer = setTimeout(() => setSyncStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('incomeCalculatorState_v4', JSON.stringify(state));
  }, [state]);

  return {
    state,
    setState,
    user,
    isAuthReady,
    syncStatus,
    toasts,
    addToast,
    removeToast,
  };
};
