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
    let rafId: number;

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

        setCoords({
          top: finalTop,
          bottom: finalBottom,
          left: rect.left,
          right: window.innerWidth - rect.right,
          width: rect.width
        });
      }
    };

    const handleScroll = (e: Event) => {
      if (e.target instanceof Node && document.body.lastChild?.contains(e.target)) {
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      cancelAnimationFrame(rafId);
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
