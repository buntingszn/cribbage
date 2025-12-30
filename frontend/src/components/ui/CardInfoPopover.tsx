import { motion, AnimatePresence } from 'framer-motion';

interface CardInfoPopoverProps {
  isOpen: boolean;
  card: string;
  onClose: () => void;
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

// Card point values in pegging
const POINT_VALUES: Record<string, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 10,
  Q: 10,
  K: 10,
};

export function CardInfoPopover({ isOpen, card, onClose }: CardInfoPopoverProps) {
  const rank = card[0];
  const suit = card[1];
  const pointValue = POINT_VALUES[rank];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            onPointerUp={onClose}
          />

          {/* Card info */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="bg-slate-800 rounded-2xl p-6 shadow-2xl pointer-events-auto max-w-xs">
              {/* Large card display */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-36 rounded-xl border-2 bg-white border-gray-300 flex flex-col items-center justify-center gap-1 shadow-lg">
                  <span className={`text-4xl font-bold ${SUIT_COLORS[suit]}`}>
                    {RANK_DISPLAY[rank]}
                  </span>
                  <span className={`text-3xl ${SUIT_COLORS[suit]}`}>
                    {SUIT_SYMBOLS[suit]}
                  </span>
                </div>
              </div>

              {/* Card name */}
              <h3 className="text-xl font-bold text-white text-center mb-2">
                {RANK_NAMES[rank]} of {SUIT_NAMES[suit]}
              </h3>

              {/* Point value */}
              <div className="bg-slate-700 rounded-lg p-3 text-center">
                <span className="text-slate-400 text-sm">Pegging Value</span>
                <div className="text-2xl font-bold text-blue-400">
                  {pointValue} {pointValue === 1 ? 'point' : 'points'}
                </div>
              </div>

              {/* Tips */}
              <p className="text-slate-400 text-xs text-center mt-3">
                Tap anywhere to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
