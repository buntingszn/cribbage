import clsx from "clsx";

interface CardProps {
  card: string;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

const SUIT_SYMBOLS: Record<string, string> = {
  h: "\u2665",
  d: "\u2666",
  c: "\u2663",
  s: "\u2660",
};

const SUIT_COLORS: Record<string, string> = {
  h: "text-red-500",
  d: "text-red-500",
  c: "text-gray-900",
  s: "text-gray-900",
};

const RANK_DISPLAY: Record<string, string> = {
  A: "A",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  T: "10",
  J: "J",
  Q: "Q",
  K: "K",
};

export default function Card({
  card,
  faceDown = false,
  selected = false,
  disabled = false,
  onClick,
  size = "md",
}: CardProps) {
  const sizeClasses = {
    sm: "w-12 h-16 text-base",
    md: "w-16 h-22 text-xl",
    lg: "w-20 h-28 text-2xl",
  };

  const rank = card[0];
  const suit = card[1];

  if (faceDown) {
    return (
      <div
        className={clsx(
          sizeClasses[size],
          "rounded-lg border-2 border-blue-900 bg-gradient-to-br from-blue-800 to-blue-950 shadow-md",
          "flex items-center justify-center"
        )}
      >
        <div className="w-3/4 h-3/4 rounded border border-blue-700 bg-blue-900/50" />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={clsx(
        sizeClasses[size],
        "rounded-lg border-2 bg-white shadow-md transition-all duration-150",
        "flex flex-col items-center justify-center gap-0.5",
        selected && "ring-2 ring-blue-400 -translate-y-3 border-blue-400",
        disabled && !selected && "opacity-50 cursor-not-allowed",
        !disabled && "hover:scale-105 active:scale-95 cursor-pointer",
        !selected && "border-gray-300"
      )}
    >
      <span className={clsx("font-bold leading-none", SUIT_COLORS[suit])}>
        {RANK_DISPLAY[rank]}
      </span>
      <span className={clsx("leading-none", SUIT_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </button>
  );
}
