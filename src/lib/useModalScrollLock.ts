import { useEffect, RefObject } from 'react';

/**
 * Блокировка прокрутки фона для модальных окон и шторок без принудительного Layout Reflow.
 *
 * Вместо мутации `document.documentElement.style.overflow = "hidden"` и чтения
 * `clientWidth`/`offsetWidth`/`getComputedStyle` в первом кадре анимации (что в iOS Safari
 * при `window.scrollY > 0` разрушает аппаратное дерево прокрутки ScrollingTreeScrollingNode
 * и вызывает фриз 80–120 мс), перехватывает события `touchmove` и `wheel` на уровне документа,
 * разрешая нативный скролл только внутри контейнера модального окна.
 */
export function useModalScrollLock(
  isOpen: boolean,
  scrollContainerRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!isOpen) return;

    const findScrollableInModal = (
      target: EventTarget | null,
      root: HTMLElement | null | undefined
    ): HTMLElement | null => {
      if (!root || !(target instanceof Node) || !root.contains(target)) {
        return null;
      }
      let el: HTMLElement | null =
        target instanceof HTMLElement ? target : target.parentElement;
      while (el && el !== root.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const root = scrollContainerRef?.current;
      const scrollable = findScrollableInModal(e.target, root);

      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      const currentY = e.touches[0].clientY;
      const deltaY = startY - currentY; // > 0 — скролл вниз
      const { scrollTop, scrollHeight, clientHeight } = scrollable;

      const isAtTop = scrollTop <= 0 && deltaY < 0;
      const isAtBottom =
        scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0;

      if (isAtTop || isAtBottom) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const onWheel = (e: WheelEvent) => {
      const root = scrollContainerRef?.current;
      const scrollable = findScrollableInModal(e.target, root);

      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable;
      const isAtTop = scrollTop <= 0 && e.deltaY < 0;
      const isAtBottom =
        scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;

      if (isAtTop || isAtBottom) {
        if (e.cancelable) e.preventDefault();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('wheel', onWheel);
    };
  }, [isOpen, scrollContainerRef]);
}
