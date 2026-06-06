import { Badge } from "@/components/ui/badge";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { Category } from "@/types";

export function CategoryBadge({ category }: { category: Category }) {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other;
  return (
    <Badge
      variant="secondary"
      className="border-transparent"
      style={{ color, backgroundColor: `${color}1a` }}
    >
      {category}
    </Badge>
  );
}
