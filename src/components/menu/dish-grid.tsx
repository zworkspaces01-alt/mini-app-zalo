import DishCard from "@/components/menu/dish-card";
import { Dish } from "@/types";

export interface DishGridProps {
  dishes: Dish[];
  onOpen: (dish: Dish) => void;
  className?: string;
  defaultRatio?: "1:1" | "4:5" | "alternating";
}

export default function DishGrid({
  dishes,
  onOpen,
  className = "",
  defaultRatio = "alternating",
}: DishGridProps) {
  if (!dishes.length) return null;

  const col1 = dishes.filter((_, i) => i % 2 === 0);
  const col2 = dishes.filter((_, i) => i % 2 === 1);

  return (
    <div className={`flex gap-2.5 items-start ${className}`}>
      {/* CỘT 1 */}
      <div className="flex-1 min-w-0 space-y-2.5">
        {col1.map((d, i) => {
          const ratio =
            defaultRatio === "alternating"
              ? i % 2 === 0
                ? "1:1"
                : "4:5"
              : defaultRatio;
          return (
            <DishCard
              key={d.id}
              dish={d}
              onOpen={onOpen}
              aspectRatio={ratio}
            />
          );
        })}
      </div>

      {/* CỘT 2 */}
      <div className="flex-1 min-w-0 space-y-2.5">
        {col2.map((d, i) => {
          const ratio =
            defaultRatio === "alternating"
              ? i % 2 === 0
                ? "4:5"
                : "1:1"
              : defaultRatio;
          return (
            <DishCard
              key={d.id}
              dish={d}
              onOpen={onOpen}
              aspectRatio={ratio}
            />
          );
        })}
      </div>
    </div>
  );
}
