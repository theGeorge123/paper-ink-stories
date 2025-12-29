import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  label?: string;
}

const stars = [1, 2, 3, 4, 5];

export default function StarRating({ value, onChange, readOnly, label }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value;

  return (
    <div className="w-full">
      {label && <p className="text-sm font-medium text-white/80 mb-2">{label}</p>}
      <div className="flex items-center gap-2">
        {stars.map((star) => {
          const filled = displayValue >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(star)}
              onBlur={() => setHovered(null)}
              onClick={() => onChange?.(star)}
              className={cn(
                "rounded-full p-1 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-transparent",
                readOnly ? "cursor-default" : "hover:scale-105"
              )}
            >
              <Star
                className={cn(
                  "h-7 w-7 drop-shadow",
                  filled ? "fill-amber-400 text-amber-400" : "text-white/40"
                )}
              />
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-white/70">{value > 0 ? `${value}/5 sterren` : "Jouw beoordeling"}</p>
    </div>
  );
}
