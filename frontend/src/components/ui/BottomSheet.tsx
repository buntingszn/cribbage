import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Height as percentage of viewport (0-1), default 0.7 */
  height?: number;
  /** Allow closing by swiping down */
  swipeable?: boolean;
  /** Show backdrop overlay */
  showBackdrop?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = 0.7,
  swipeable = true,
  showBackdrop = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetHeight = `${height * 100}vh`;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = window.innerHeight * height * 0.3; // 30% of sheet height
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Close if dragged down far enough or with enough velocity
    if (offset > threshold || velocity > 500) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {showBackdrop && (
            <motion.div
              className="fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
            />
          )}

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 bg-slate-800 rounded-t-2xl z-50 flex flex-col"
            style={{ maxHeight: sheetHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            drag={swipeable ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-slate-600 rounded-full" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-4 pb-3 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white text-center">
                  {title}
                </h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
