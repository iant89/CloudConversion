import React, { useState, useEffect, useRef } from 'react';

export function useIsLargeViewport(breakpoint = 1024): boolean {
  const [isLarge, setIsLarge] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsLarge(window.innerWidth >= breakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isLarge;
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left';
  disabled?: boolean;
  variant?: 'default' | 'error' | 'warning';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  disabled = false,
  variant = 'default',
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const show = () => {
    if (disabled || !content) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setVisible(true);
  };

  const hide = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const bgClass =
    variant === 'error'
      ? 'bg-red-900 border-red-600 text-red-50'
      : variant === 'warning'
      ? 'bg-amber-900 border-amber-600 text-amber-50'
      : 'bg-[#141921] border-slate-700 text-white';

  const arrowBorderClass =
    variant === 'error'
      ? 'border-t-red-900'
      : variant === 'warning'
      ? 'border-t-amber-900'
      : 'border-t-[#141921]';

  const arrowBottomBorderClass =
    variant === 'error'
      ? 'border-b-red-900'
      : variant === 'warning'
      ? 'border-b-amber-900'
      : 'border-b-[#141921]';

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && !disabled && content && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold shadow-xl animate-in fade-in zoom-in-95 duration-100 ${bgClass} ${
            position === 'top'
              ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
              : position === 'bottom'
              ? 'top-full left-1/2 -translate-x-1/2 mt-2'
              : 'right-full top-1/2 -translate-y-1/2 mr-2'
          }`}
        >
          {content}
          {position === 'top' && (
            <span
              className={`absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent ${arrowBorderClass}`}
            />
          )}
          {position === 'bottom' && (
            <span
              className={`absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent ${arrowBottomBorderClass}`}
            />
          )}
        </div>
      )}
    </div>
  );
};

interface ResponsiveActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  tooltipText?: string;
  iconOnly?: boolean;
  breakpoint?: number;
  tooltipPosition?: 'top' | 'bottom' | 'left';
  tooltipVariant?: 'default' | 'error' | 'warning';
}

/**
 * Button component that always renders an icon, renders both icon + text when the viewport
 * is large enough (unless iconOnly is true), and wraps the button in a custom Tooltip
 * component so when only an icon is shown (or on hover), the user sees the descriptive text.
 */
export const ResponsiveActionButton: React.FC<ResponsiveActionButtonProps> = ({
  icon,
  label,
  tooltipText,
  iconOnly = false,
  breakpoint = 1024,
  tooltipPosition = 'top',
  tooltipVariant = 'default',
  className = '',
  disabled,
  ...rest
}) => {
  const isLargeViewport = useIsLargeViewport(breakpoint);
  const showTextInline = !iconOnly && isLargeViewport;

  return (
    <Tooltip
      content={tooltipText || label}
      position={tooltipPosition}
      variant={tooltipVariant}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={tooltipText || label}
        className={`inline-flex items-center justify-center gap-1.5 transition-colors ${className} ${
          disabled ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer'
        }`}
        {...rest}
      >
        <span className="shrink-0 flex items-center justify-center">{icon}</span>
        {showTextInline && <span>{label}</span>}
      </button>
    </Tooltip>
  );
};
