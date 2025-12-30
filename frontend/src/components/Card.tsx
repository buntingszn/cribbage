import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import clsx from 'clsx';
import { useHaptics } from '../hooks/useHaptics';

interface CardProps {
  card: string;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  /** Enable drag behavior */
  draggable?: boolean;
  /** Called when drag ends with velocity/offset info */
  onDragEnd?: (info: { velocity: { x: number; y: number }; offset: { x: number; y: number } }) => void;
  /** Called when long press is detected (500ms) */
  onLongPress?: () => void;
  /** Constrain drag to bounds */
  dragConstraints?: { top?: number; bottom?: number; left?: number; right?: number };
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: '\u2665',
  d: '\u2666',
  c: '\u2663',
  s: '\u2660',
};

const SUIT_COLORS: Record<string, string> = {
  h: 'text-red-500',
  d: 'text-red-500',
  c: 'text-gray-900',
  s: 'text-gray-900',
};

const SUIT_NAMES: Record<string, string> = {
  h: 'Hearts',
  d: 'Diamonds',
  c: 'Clubs',
  s: 'Spades',
};

const RANK_DISPLAY: Record<string, string> = {
  A: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
};

const RANK_NAMES: Record<string, string> = {
  A: 'Ace',
  '2': 'Two',
  '3': 'Three',
  '4': 'Four',
  '5': 'Five',
  '6': 'Six',
  '7': 'Seven',
  '8': 'Eight',
  '9': 'Nine',
  T: 'Ten',
  J: 'Jack',
  Q: 'Queen',
  K: 'King',
};

export default function Card({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  size = 'md',
  draggable = false,
  onDragEnd,
  onLongPress,
  dragConstraints,
}: CardProps) {
  const { trigger } = useHaptics();
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasTriggeredLongPress = useRef(false);

  // Motion values for drag
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Rotate slightly based on drag direction
  const rotate = useTransform(x, [-100, 0, 100], [-8, 0, 8]);

  // Scale up when dragging
  const scale = useTransform(
    [x, y],
    ([latestX, latestY]: number[]) => {
      if (!isDragging) return selected ? 1.02 : 1;
      const distance = Math.sqrt(latestX ** 2 + latestY ** 2);
      return 1 + Math.min(distance / 400, 0.08);
    }
  );

  const sizeClasses = {
    sm: 'w-12 h-16 text-base',
    md: 'w-16 h-22 text-xl',
    lg: 'w-20 h-28 text-2xl',
  };

  const rank = card[0];
  const suit = card[1];

  // Long press handling
  const handlePointerDown = useCallback(() => {
    if (!onLongPress || disabled) return;
    hasTriggeredLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      hasTriggeredLongPress.current = true;
      trigger('selection');
      onLongPress();
    }, 500);
  }, [onLongPress, disabled, trigger]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePointerCancel = handlePointerUp;

  // Drag handlers
  const handleDragStart = () => {
    setIsDragging(true);
    trigger('selection');
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    if (onDragEnd) {
      onDragEnd({
        velocity: info.velocity,
        offset: info.offset,
      });
    }
  };

  // Handle click (but not if we're dragging or long-pressed)
  const handleClick = () => {
    if (hasTriggeredLongPress.current) {
      hasTriggeredLongPress.current = false;
      return;
    }
    if (isDragging) return;
    if (onClick && !disabled) {
      trigger('selection');
      onClick();
    }
  };

  // Accessibility label
  const ariaLabel = faceDown
    ? 'Face-down card'
    : `${RANK_NAMES[rank]} of ${SUIT_NAMES[suit]}${selected ? ', selected' : ''}${disabled ? ', not playable' : ''}`;

  if (faceDown) {
    return (
      <motion.div
        className={clsx(
          sizeClasses[size],
          'rounded-lg border-2 border-blue-900 bg-gradient-to-br from-blue-800 to-blue-950 shadow-card',
          'flex items-center justify-center'
        )}
        whileHover={{ scale: 1.02 }}
        aria-label={ariaLabel}
      >
        <div className="w-3/4 h-3/4 rounded border border-blue-700 bg-blue-900/50" />
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      disabled={disabled && !selected}
      aria-label={ariaLabel}
      aria-pressed={selected}
      role="option"
      className={clsx(
        sizeClasses[size],
        'rounded-lg border-2 bg-white flex flex-col items-center justify-center gap-0.5',
        'touch-none select-none',
        selected && 'ring-2 ring-blue-400 border-blue-400',
        disabled && !selected && 'opacity-50 cursor-not-allowed',
        !disabled && !isDragging && 'cursor-pointer',
        isDragging && 'cursor-grabbing',
        !selected && !isDragging && 'border-gray-300'
      )}
      style={{
        x: draggable ? x : 0,
        y: draggable ? y : 0,
        rotate: draggable ? rotate : 0,
        scale,
        zIndex: isDragging ? 100 : selected ? 10 : 1,
        boxShadow: isDragging
          ? '0 20px 40px rgba(0, 0, 0, 0.4)'
          : selected
          ? '0 8px 16px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
      drag={draggable && !disabled}
      dragConstraints={dragConstraints || { top: 0, bottom: 0, left: 0, right: 0 }}
      dragElastic={0.1}
      dragSnapToOrigin={!onDragEnd}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileHover={!disabled && !isDragging ? { scale: 1.05 } : undefined}
      whileTap={!disabled && !draggable ? { scale: 0.95 } : undefined}
      animate={{
        y: selected && !isDragging ? -12 : 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
    >
      <span className={clsx('font-bold leading-none', SUIT_COLORS[suit])}>
        {RANK_DISPLAY[rank]}
      </span>
      <span className={clsx('leading-none', SUIT_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </motion.button>
  );
}
