import { logger } from '../../lib/logger';

export enum OperationType {
  GET = 'GET',
  SET = 'SET',
  DELETE = 'DELETE',
  SUBSCRIBE = 'SUBSCRIBE'
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  let errorMessage = 'Неизвестная ошибка базы данных';
  let isPermissionsError = false;
  let isOfflineError = false;

  if (error && error.code) {
    switch (error.code) {
      case 'permission-denied':
        errorMessage = 'Доступ запрещен. Убедитесь, что вы авторизованы.';
        isPermissionsError = true;
        break;
      case 'unavailable':
        errorMessage = 'Сервис временно недоступен. Проверьте подключение к интернету.';
        isOfflineError = true;
        break;
      case 'unauthenticated':
        errorMessage = 'Пользователь не авторизован.';
        isPermissionsError = true;
        break;
      default:
        errorMessage = `Ошибка Firestore: ${error.message}`;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  const errInfo = {
    message: errorMessage,
    operation: operationType,
    path: path || 'unknown',
    originalCode: error?.code,
    timestamp: new Date().toISOString()
  };
  
  if (isOfflineError) {
    logger.warn('Firestore Error (Offline): ', JSON.stringify(errInfo));
  } else {
    logger.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  
  if (!isPermissionsError) {
    // throw new Error(errorMessage); // We shouldn't throw to avoid crashing sync loop
  }

  return { isPermissionsError, isOfflineError };
}

export function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const newObj = { ...obj };
  Object.keys(newObj).forEach(key => {
    if (newObj[key] === undefined) {
      delete newObj[key];
    }
  });
  return newObj;
}

export function parseLocalId(docId: string, userId: string): string | number {
  let localId: string | number = docId;
  if (typeof localId === 'string' && localId.startsWith(`${userId}_`)) {
    const numPart = localId.replace(`${userId}_`, '');
    if (numPart.trim() !== '' && !isNaN(Number(numPart))) {
      localId = Number(numPart);
    }
  }
  return localId;
}
