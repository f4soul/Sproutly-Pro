import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  children: React.ReactNode;
  targetRef: React.RefObject<HTMLElement | null>;
  align?: 'left' | 'right';
  matchWidth?: boolean;
  offset?: number;
}

export function DropdownPortal({ 
  children, 
  targetRef,
  align = 'left',
  matchWidth = false,
  offset = 8
}: DropdownPortalProps) {
  const [coords, setCoords] = useState<{ top: number | 'auto', bottom: number | 'auto', left: number, right: number, width: number }>({ top: -9999, bottom: 'auto', left: -9999, right: -9999, width: 0 });
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let animationFrameId: number;
    let isRunning = true;

    let lastTop: number | 'auto' = -9999;
    let lastBottom: number | 'auto' = 'auto';
    let lastLeft = -9999;
    let lastRight = -9999;
    let lastWidth = 0;

    const updatePosition = () => {
      if (targetRef.current) {
        const rect = targetRef.current.getBoundingClientRect();
        
        const spaceBelow = window.innerHeight - rect.bottom - offset;
        const spaceAbove = rect.top - offset;
        const dropdownHeight = 240; // Max height of dropdowns (max-h-60 is 240px)
        
        let finalTop: number | 'auto' = rect.bottom + offset;
        let finalBottom: number | 'auto' = 'auto';

        // Flip to top if not enough space below and more space above
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          finalTop = 'auto';
          finalBottom = window.innerHeight - rect.top + offset;
        }

        const newLeft = rect.left;
        const newRight = window.innerWidth - rect.right;
        const newWidth = rect.width;

        if (
          finalTop !== lastTop ||
          finalBottom !== lastBottom ||
          newLeft !== lastLeft ||
          newRight !== lastRight ||
          newWidth !== lastWidth
        ) {
          lastTop = finalTop;
          lastBottom = finalBottom;
          lastLeft = newLeft;
          lastRight = newRight;
          lastWidth = newWidth;

          setCoords({
            top: finalTop,
            bottom: finalBottom,
            left: newLeft,
            right: newRight,
            width: newWidth
          });
        }
      }
    };

    const loop = () => {
      if (!isRunning) return;
      updatePosition();
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true });
    };
  }, [targetRef, offset]);

  if (!isMounted || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        ...(coords.top !== 'auto' ? { top: coords.top } : {}),
        ...(coords.bottom !== 'auto' ? { bottom: coords.bottom } : {}),
        ...(align === 'left' ? { left: coords.left } : {}),
        ...(align === 'right' ? { right: coords.right } : {}),
        ...(matchWidth ? { width: coords.width } : {}),
        zIndex: 99999
      }}
    >
      {children}
    </div>,
    document.body
  );
}
