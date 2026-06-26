export const toastEvent = new EventTarget();

export interface ToastOptions {
  id?: string;
  duration?: number;
}

export const showToast = (message: string, type: 'success' | 'info' | 'error' | 'loading' = 'success', options?: ToastOptions) => {
  const id = options?.id || Math.random().toString(36).substring(2, 9);
  toastEvent.dispatchEvent(new CustomEvent('add_toast', { detail: { id, message, type, duration: options?.duration } }));
  return id;
};
