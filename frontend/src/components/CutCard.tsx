import Card from "./Card";

interface CutCardProps {
  card: string | null;
  onCut?: () => void;
  canCut?: boolean;
}

export default function CutCard({ card, onCut, canCut = false }: CutCardProps) {
  if (!card && !canCut) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-22 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center">
          <span className="text-slate-500 text-xs">Cut</span>
        </div>
      </div>
    );
  }

  if (!card && canCut) {
    return (
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onCut}
          className="w-16 h-22 rounded-lg border-2 border-blue-500 bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/30 transition-colors cursor-pointer"
        >
          <span className="text-blue-400 text-xs font-medium">Cut Deck</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Card card={card!} size="md" />
      <span className="text-xs text-slate-400">Starter</span>
    </div>
  );
}
