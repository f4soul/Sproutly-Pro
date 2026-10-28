import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Helper to wait for the visual viewport to settle (keyboard collapse animation)
 * with a debounce on resize events and a hard ceiling timeout.
 */
const waitForViewportSettle = (maxWait = 350) =>
  new Promise<void>((resolve) => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : undefined;
    if (!vv) {
      setTimeout(resolve, maxWait);
      return;
    }
    let done = false;
    let debounce: ReturnType<typeof setTimeout>;
    let cap: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(debounce);
      clearTimeout(cap);
      vv.removeEventListener('resize', onResize);
      resolve();
    };

    const onResize = () => {
      clearTimeout(debounce);
      debounce = setTimeout(finish, 90);
    };

    cap = setTimeout(finish, maxWait);
    vv.addEventListener('resize', onResize);
  });

/**
 * Hook to safely close modal dialogs on mobile devices (especially iOS Safari / Android Chrome / PWA).
 * 
 * Prevents screen jump / viewport jitter caused by:
 * 1. An active <input> being unmounted while focused and while the virtual keyboard is still open.
 * 2. VisualViewport animating while the modal exit animation begins.
 * 3. Browser panning/scrolling during keyboard collapse.
 */
export function useSafeModalClose(onClose: () => void) {
  const initialScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const isClosingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      initialScrollY.current = window.scrollY;
    }
    return () => {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
  }, []);

  const safeClose = useCallback(
    async (action?: () => Promise<void> | void) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      // 1. Detect if keyboard was open via active input/textarea/select
      const hadKeyboard =
        typeof document !== 'undefined' &&
        (document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement ||
          document.activeElement instanceof HTMLSelectElement);

      // 2. Immediately blur active input so virtual keyboard starts collapsing smoothly
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // 3. Perform the async operation (e.g. database save / sync) if provided
      if (action) {
        setIsSubmitting(true);
        try {
          await action();
        } catch (err) {
          setIsSubmitting(false);
          isClosingRef.current = false;
          throw err;
        }
      }

      // 4. If keyboard was active, wait for visualViewport to settle and restore scroll position instantly;
      // otherwise, a single frame pause (16ms) is enough for immediate and snappy closing.
      if (hadKeyboard) {
        await waitForViewportSettle();
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: initialScrollY.current, behavior: 'instant' as ScrollBehavior });
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 16));
      }

      // 5. Trigger parent onClose
      onClose();
    },
    [onClose]
  );

  return { safeClose, isSubmitting };
}
