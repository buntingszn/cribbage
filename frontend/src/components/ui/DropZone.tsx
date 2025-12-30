import { motion } from 'framer-motion';
import clsx from 'clsx';

interface DropZoneProps {
  /** Is a card currently being dragged? */
  active: boolean;
  /** Is the dragged card over this zone? */
  hovering: boolean;
  /** Zone label text */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Visual style variant */
  variant?: 'crib' | 'play';
  /** Additional className */
  className?: string;
  children?: React.ReactNode;
}

export function DropZone({
  active,
  hovering,
  label,
  icon,
  variant = 'crib',
  className,
  children,
}: DropZoneProps) {
  const baseColors = {
    crib: {
      idle: 'border-slate-600 bg-slate-800/30',
      active: 'border-blue-500 bg-blue-900/30',
      hovering: 'border-blue-400 bg-blue-800/50',
    },
    play: {
      idle: 'border-slate-600 bg-slate-800/30',
      active: 'border-green-500 bg-green-900/30',
      hovering: 'border-green-400 bg-green-800/50',
    },
  };

  const colors = baseColors[variant];
  const currentColor = hovering ? colors.hovering : active ? colors.active : colors.idle;

  return (
    <motion.div
      className={clsx(
        'rounded-xl border-2 border-dashed p-4 transition-colors duration-200',
        'flex flex-col items-center justify-center gap-2',
        'min-h-[100px]',
        currentColor,
        active && 'animate-pulse-slow',
        className
      )}
      animate={{
        scale: hovering ? 1.02 : 1,
        borderStyle: active ? 'solid' : 'dashed',
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      {children || (
        <>
          {icon && (
            <motion.div
              className={clsx(
                'text-2xl',
                hovering ? 'text-white' : active ? 'text-slate-300' : 'text-slate-500'
              )}
              animate={{
                scale: hovering ? 1.2 : 1,
                y: active ? [0, -4, 0] : 0,
              }}
              transition={{
                y: {
                  duration: 1,
                  repeat: active ? Infinity : 0,
                  ease: 'easeInOut',
                },
              }}
            >
              {icon}
            </motion.div>
          )}
          <motion.span
            className={clsx(
              'text-sm font-medium',
              hovering ? 'text-white' : active ? 'text-slate-300' : 'text-slate-500'
            )}
            animate={{
              opacity: active ? 1 : 0.7,
            }}
          >
            {label}
          </motion.span>
        </>
      )}

      {/* Glow effect when hovering */}
      {hovering && (
        <motion.div
          className={clsx(
            'absolute inset-0 rounded-xl pointer-events-none',
            variant === 'crib' ? 'bg-blue-500/10' : 'bg-green-500/10'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
