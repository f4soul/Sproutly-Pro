import React, { useRef, useEffect } from 'react';

export const AutoFitText = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeText = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;

      // Reset to measure
      content.style.transform = 'scale(1)';
      container.style.height = 'auto'; // Reset container height
      
      const containerWidth = container.clientWidth;
      const contentWidth = content.scrollWidth;
      const originalHeight = content.offsetHeight;

      if (contentWidth > containerWidth && contentWidth > 0) {
        const scale = containerWidth / contentWidth;
        content.style.transform = `scale(${scale})`;
        
        // Adjust container height so it doesn't push elements down
        container.style.height = `${originalHeight * scale}px`;
      }
    };

    resizeText();

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(resizeText);
    });

    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (contentRef.current) resizeObserver.observe(contentRef.current);

    const mutationObserver = new MutationObserver(() => {
      resizeText();
    });

    if (contentRef.current) {
      mutationObserver.observe(contentRef.current, { characterData: true, childList: true, subtree: true });
    }

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full min-w-0 flex flex-col justify-start items-start overflow-visible origin-top-left transition-[height]">
      <div ref={contentRef} className={`origin-top-left ${className} whitespace-nowrap inline-flex`}>
        {children}
      </div>
    </div>
  );
};
