import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface CustomTooltipProps {
  content: string;
  children: ReactNode;
  maxWidth?: number;
  delay?: number;
  disabled?: boolean;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  content,
  children,
  maxWidth = 400,
  delay = 500,
  disabled = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (disabled || !content) return;
    
    const currentTarget = e.currentTarget;
    if (!currentTarget) return;
    
    timeoutRef.current = setTimeout(() => {
      // Check if element is still in DOM and accessible
      if (currentTarget && document.contains(currentTarget)) {
        const rect = currentTarget.getBoundingClientRect();
        setPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10
        });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div
          className="fixed bg-gray-800 text-white text-sm px-3 py-2 rounded shadow-lg pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)',
            maxWidth: `${maxWidth}px`,
            wordWrap: 'break-word',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            zIndex: 999999 // Ensure tooltip is always on top
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

export default CustomTooltip;