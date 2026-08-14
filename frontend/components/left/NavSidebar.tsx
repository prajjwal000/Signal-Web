'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { WidthBreakpoint } from './types';

interface NavSidebarProps {
  title: string;
  actions?: ReactNode;
  headerContent?: ReactNode;
  children: ReactNode;
  widthBreakpoint: WidthBreakpoint;
}

export default function NavSidebar({
  title,
  actions,
  headerContent,
  children,
  widthBreakpoint,
}: NavSidebarProps) {
  const [width, setWidth] = useState(320);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
  }, [width]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.min(380, Math.max(280, dragStartWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      className="flex flex-col h-full bg-bg-primary relative flex-shrink-0"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border min-h-[52px]">
        {headerContent ? (
          headerContent
        ) : (
          <h1 className="text-lg font-bold text-label-primary">{title}</h1>
        )}
        {actions && (
          <div className="flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>

      {/* Drag handle */}
      <div
        className={`absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 transition-colors ${
          isDragging ? 'bg-brand/30' : 'hover:bg-brand/20'
        }`}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
