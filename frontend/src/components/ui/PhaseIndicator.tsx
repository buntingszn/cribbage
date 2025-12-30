import { motion } from 'framer-motion';
import { Layers, Scissors, PlayCircle, Calculator, Check } from 'lucide-react';
import clsx from 'clsx';

type GamePhase = 'discard' | 'cut' | 'pegging' | 'hand_scoring' | 'crib_scoring' | 'waiting';

interface PhaseIndicatorProps {
  currentPhase: GamePhase;
  /** Compact mode for smaller screens */
  compact?: boolean;
}

const PHASES = [
  { id: 'discard', label: 'Discard', icon: Layers },
  { id: 'cut', label: 'Cut', icon: Scissors },
  { id: 'pegging', label: 'Pegging', icon: PlayCircle },
  { id: 'hand_scoring', label: 'Score', icon: Calculator },
] as const;

function getPhaseIndex(phase: GamePhase): number {
  if (phase === 'waiting') return -1;
  if (phase === 'crib_scoring') return 3; // Same visual position as hand_scoring
  const index = PHASES.findIndex(p => p.id === phase);
  return index >= 0 ? index : -1;
}

export function PhaseIndicator({ currentPhase, compact = false }: PhaseIndicatorProps) {
  const currentIndex = getPhaseIndex(currentPhase);

  if (currentPhase === 'waiting') {
    return (
      <div className="flex items-center justify-center gap-2 text-slate-400">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"
        />
        <span className="text-sm">Waiting for players...</span>
      </div>
    );
  }

  return (
    <div className={clsx(
      'flex items-center justify-center',
      compact ? 'gap-1' : 'gap-2'
    )}>
      {PHASES.map((phase, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const Icon = isComplete ? Check : phase.icon;

        return (
          <div key={phase.id} className="flex items-center">
            {/* Phase step */}
            <motion.div
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors',
                isComplete && 'bg-green-900/30 text-green-400',
                isCurrent && 'bg-blue-900/50 text-blue-400',
                !isComplete && !isCurrent && 'bg-slate-800 text-slate-500'
              )}
              animate={isCurrent ? {
                scale: [1, 1.02, 1],
                boxShadow: [
                  '0 0 0 0 rgba(59, 130, 246, 0)',
                  '0 0 0 4px rgba(59, 130, 246, 0.2)',
                  '0 0 0 0 rgba(59, 130, 246, 0)',
                ],
              } : {}}
              transition={{
                duration: 2,
                repeat: isCurrent ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <motion.div
                initial={false}
                animate={isComplete ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Icon className={clsx(
                  compact ? 'w-3.5 h-3.5' : 'w-4 h-4'
                )} />
              </motion.div>
              {!compact && (
                <span className={clsx(
                  'text-xs font-medium',
                  isCurrent && 'font-semibold'
                )}>
                  {phase.label}
                </span>
              )}
            </motion.div>

            {/* Connector line */}
            {index < PHASES.length - 1 && (
              <div className={clsx(
                'h-0.5 transition-colors',
                compact ? 'w-2' : 'w-4',
                index < currentIndex ? 'bg-green-400/50' : 'bg-slate-700'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Compact version with just the current phase name
export function PhaseLabel({ currentPhase }: { currentPhase: GamePhase }) {
  const phaseLabels: Record<GamePhase, string> = {
    waiting: 'Waiting...',
    discard: 'Discard Phase',
    cut: 'Cut the Deck',
    pegging: 'Pegging',
    hand_scoring: 'Scoring Hands',
    crib_scoring: 'Scoring Crib',
  };

  return (
    <motion.div
      key={currentPhase}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <span className="text-sm font-medium text-blue-400">
        {phaseLabels[currentPhase]}
      </span>
    </motion.div>
  );
}
