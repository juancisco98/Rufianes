import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Descripción debajo del título */
  subtitle?: React.ReactNode;
  /** Acción derecha en el header (ej: "Guardar") */
  headerAction?: React.ReactNode;
  /** Footer fijo debajo (ej: botón de submit) */
  footer?: React.ReactNode;
  /** Bloquea el cierre al tap en backdrop / drag (cuando hay datos sin guardar) */
  preventCloseOnBackdrop?: boolean;
  /** Altura máxima como fracción del viewport (default 92vh) */
  maxHeightVh?: number;
  children: React.ReactNode;
}

/**
 * BottomSheet — modal estilo iOS que sube desde abajo.
 * - Drag handle visual
 * - Backdrop blur
 * - Safe area inset bottom (Capacitor / iOS PWA)
 * - Header sticky con título + close, footer sticky opcional
 * - Body scrolleable
 *
 * Reemplaza el patrón de modal centrado para todo lo que sea mobile-first.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  headerAction,
  footer,
  preventCloseOnBackdrop = false,
  maxHeightVh = 92,
  children,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      // Lock body scroll
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 220);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventCloseOnBackdrop) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, preventCloseOnBackdrop, onClose]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        onClick={() => !preventCloseOnBackdrop && onClose()}
        className={[
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100 animate-ios-fade-in',
        ].join(' ')}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{ maxHeight: `${maxHeightVh}vh` }}
        className={[
          'relative w-full sm:max-w-lg flex flex-col',
          'bg-white dark:bg-iosDark-bg2',
          'rounded-t-3xl sm:rounded-3xl sm:mb-4',
          'shadow-ios-xl border border-ios-border/50 dark:border-iosDark-border',
          'overflow-hidden',
          closing ? 'translate-y-full transition-transform duration-200' : 'animate-ios-slide-up',
        ].join(' ')}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-9 h-1.5 rounded-full bg-ios-label3 dark:bg-iosDark-label3" />
        </div>

        {/* Header */}
        {(title || headerAction) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 shrink-0 border-b border-ios-divider dark:border-iosDark-divider">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 className="text-[17px] font-semibold text-ios-label dark:text-iosDark-label leading-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[13px] text-ios-label2 dark:text-iosDark-label2 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {headerAction}
              {!preventCloseOnBackdrop && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-ios-grouped dark:bg-iosDark-grouped flex items-center justify-center text-ios-label2 dark:text-iosDark-label2 active:scale-95 transition-transform"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-ios-divider dark:border-iosDark-divider bg-white/95 dark:bg-iosDark-bg2/95 backdrop-blur-ios px-5 py-3 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BottomSheet;
