import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Card from './Card';
import { CardInfoPopover } from './ui/CardInfoPopover';

interface PlayerHandProps {
  cards: string[];
  selectedCards: string[];
  validPlays?: string[];
  onCardClick: (card: string) => void;
  onCardDragEnd?: (card: string, info: { velocity: { x: number; y: number }; offset: { x: number; y: number } }) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Enable drag mode for cards */
  draggable?: boolean;
  /** Number of cards to select (for discard counter display) */
  selectionLimit?: number;
  /** Show selection counter dots */
  showSelectionCounter?: boolean;
}

export default function PlayerHand({
  cards,
  selectedCards,
  validPlays,
  onCardClick,
  onCardDragEnd,
  disabled = false,
  size = 'lg',
  draggable = false,
  selectionLimit,
  showSelectionCounter = false,
}: PlayerHandProps) {
  const [longPressCard, setLongPressCard] = useState<string | null>(null);

  const handleLongPress = (card: string) => {
    setLongPressCard(card);
  };

  const handleCloseLongPress = () => {
    setLongPressCard(null);
  };

  const handleDragEnd = (card: string, info: { velocity: { x: number; y: number }; offset: { x: number; y: number } }) => {
    if (onCardDragEnd) {
      onCardDragEnd(card, info);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Selection counter */}
      {showSelectionCounter && selectionLimit && (
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-slate-400 text-sm">Select {selectionLimit}:</span>
          <div className="flex gap-1.5">
            {Array.from({ length: selectionLimit }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < selectedCards.length ? 'bg-blue-500' : 'bg-slate-600'
                }`}
                animate={
                  i < selectedCards.length
                    ? { scale: [1, 1.3, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.2 }}
              />
            ))}
          </div>
          {selectedCards.length === selectionLimit && (
            <motion.span
              className="text-green-400 text-sm ml-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              Ready!
            </motion.span>
          )}
        </motion.div>
      )}

      {/* Cards */}
      <motion.div
        className="flex justify-center gap-2 md:gap-3 flex-wrap"
        role="listbox"
        aria-label="Your hand"
        aria-multiselectable={selectionLimit !== undefined && selectionLimit > 1}
        layout
      >
        <AnimatePresence mode="popLayout">
          {cards.map((card, index) => (
            <motion.div
              key={card}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: index * 0.05,
              }}
            >
              <Card
                card={card}
                selected={selectedCards.includes(card)}
                disabled={
                  disabled || (validPlays !== undefined && !validPlays.includes(card))
                }
                onClick={() => onCardClick(card)}
                size={size}
                draggable={draggable}
                onDragEnd={(info) => handleDragEnd(card, info)}
                onLongPress={() => handleLongPress(card)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Long press card info popover */}
      {longPressCard && (
        <CardInfoPopover
          isOpen={!!longPressCard}
          card={longPressCard}
          onClose={handleCloseLongPress}
        />
      )}
    </div>
  );
}
