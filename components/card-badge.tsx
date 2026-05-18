import { Badge } from "@/components/ui/badge";
import { CARD_COLORS } from "@/lib/constants";
import { CARD_LABELS, type CardType } from "@/types";

export function CardBadge({ cardType }: { cardType: CardType }) {
  const color = CARD_COLORS[cardType];
  return (
    <Badge
      variant="secondary"
      className="border-transparent bg-[color:var(--c)]/10 text-[color:var(--c)]"
      style={{ "--c": color } as React.CSSProperties}
    >
      {CARD_LABELS[cardType]}
    </Badge>
  );
}
