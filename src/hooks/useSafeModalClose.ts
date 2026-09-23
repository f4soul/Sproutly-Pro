import { useRef, useEffect, useCallback, useState } from 'react';

/**
 * Hook to safely close modal dialogs on mobile devices (especially iOS Safari / PWA).
 * 
 * Prevents screen jump / viewport jitter caused by:
 * 1. An active <input> being unmounted while focused and while the virtual keyboard is still open.
 * 2. Headless UI FocusTrap restoring focus to the trigger button while visualViewport is unstable.
 * 3. iOS WebKit canceling smooth keyboard collapse and snapping scroll to top.
 */
export function useSafeModalClose(onClose: () => void) {
  const initialScrollY = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const isClosingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preserve and restore the exact scroll position upon modal unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const targetY = initialScrollY.current;

        // Disarm any active element focus that might trigger a scroll jump
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        // Instantly restore scroll if shifted by keyboard or FocusTrap
        if (Math.abs(window.scrollY - targetY) > 5) {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        }

        // Ensure next animation frame also stays pinned (handles post-unmount FocusTrap micro-tasks)
        requestAnimationFrame(() => {
          if (typeof window !== 'undefined') {
            if (Math.abs(window.scrollY - targetY) > 5) {
              window.scrollTo({ top: targetY, behavior: 'instant' });
            }
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
          }
        });
      }
    };
  }, []);

  const safeClose = useCallback(
    async (action?: () => Promise<void> | void) => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;

      // 1. Immediately blur active input so iOS virtual keyboard starts collapsing smoothly
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      // 2. Perform the async operation (e.g. database save / sync) if provided
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

      // 3. Grace period (80ms) allowing iOS WebKit to initiate keyboard collapse and settle visualViewport
      await new Promise((resolve) => setTimeout(resolve, 80));

      // 4. Trigger parent onClose
      onClose();
    },
    [onClose]
  );

  return { safeClose, isSubmitting };
}
