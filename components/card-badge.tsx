import { Badge } from "@/components/ui/badge";
import { CARD_COLORS } from "@/lib/constants";
import { CARD_LABELS, type CardType } from "@/types";

export function CardBadge({ cardType }: { cardType: CardType }) {
  const color = CARD_COLORS[cardType];
  return (
    <Badge
      variant="secondary"
      className="border-transparent"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {CARD_LABELS[cardType]}
    </Badge>
  );
}
