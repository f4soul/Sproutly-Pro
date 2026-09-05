import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, onAuthStateChanged, auth } from '../config/firebase';
import { startRealTimeSync, stopRealTimeSync, clearLocalData, syncWithFirebase } from '../config/db';
import { logger } from '../lib/logger';

interface AuthSyncContextType {
  user: User | null;
  isAuthReady: boolean;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline' | 'idle';
  setSyncStatus: React.Dispatch<React.SetStateAction<'synced' | 'syncing' | 'error' | 'offline' | 'idle'>>;
}

const AuthSyncContext = createContext<AuthSyncContextType | null>(null);

export const AuthSyncProvider = ({ children }: { children: ReactNode }) => {
  const globalAuthInitialized = useRef(false);
  const globalLastUserUid = useRef<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'offline' | 'idle'>('idle');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      const uid = currentUser?.uid || null;

      if (currentUser) {
        if (!globalAuthInitialized.current || globalLastUserUid.current !== uid) {
          globalAuthInitialized.current = true;
          globalLastUserUid.current = uid;
          setSyncStatus('syncing');
          startRealTimeSync(currentUser);
          syncWithFirebase().catch(logger.error);
        }
      } else {
        setSyncStatus('offline');
        stopRealTimeSync();
        if (globalLastUserUid.current !== null) {
          globalLastUserUid.current = null;
          globalAuthInitialized.current = false;
          try {
            await clearLocalData();
          } catch (e) {
            logger.error("Failed to clear local data on logout:", e);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AuthSyncContext.Provider value={{ user, isAuthReady, syncStatus, setSyncStatus }}>
      {children}
    </AuthSyncContext.Provider>
  );
};

export const useAuthSync = () => {
  const context = useContext(AuthSyncContext);
  if (!context) throw new Error('useAuthSync must be used within an AuthSyncProvider');
  return context;
};
