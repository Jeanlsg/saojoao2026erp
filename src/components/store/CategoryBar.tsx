import { useStore } from "@/contexts/StoreContext";

interface CategoryBarProps {
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
}

const categoryColors: Record<string, string> = {
  mercearia: "bg-orange-100 dark:bg-orange-900/30",
  bebidas: "bg-blue-100 dark:bg-blue-900/30",
  hortifruti: "bg-green-100 dark:bg-green-900/30",
  padaria: "bg-amber-100 dark:bg-amber-900/30",
  frios: "bg-cyan-100 dark:bg-cyan-900/30",
  limpeza: "bg-violet-100 dark:bg-violet-900/30",
  higiene: "bg-pink-100 dark:bg-pink-900/30",
};

export function CategoryBar({ activeCategory, onSelect }: CategoryBarProps) {
  const { categories } = useStore();
  return (
    <section id="category-bar" className="container py-3 sm:py-4">
      <h2 className="text-base sm:text-lg font-bold text-foreground mb-2 sm:mb-3">Categorias</h2>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pt-2 pb-2 px-1 -mx-1 scrollbar-hide">
        <button
          onClick={() => onSelect(null)}
          className="flex flex-col items-center gap-1 min-w-[56px] sm:min-w-[72px] group"
        >
          <div
            className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl sm:rounded-2xl text-xl sm:text-2xl transition-all shadow-sm ${
              activeCategory === null
                ? "bg-accent text-accent-foreground scale-110 shadow-md"
                : "bg-muted text-foreground/80 group-hover:shadow-md group-active:scale-95"
            }`}
          >
            🏪
          </div>
          <span
            className={`text-[10px] sm:text-[11px] font-medium transition-colors ${
              activeCategory === null ? "text-accent font-bold" : "text-muted-foreground"
            }`}
          >
            Todos
          </span>
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="flex flex-col items-center gap-1 min-w-[56px] sm:min-w-[72px] group"
          >
            <div
              className={`flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-xl sm:rounded-2xl text-xl sm:text-2xl transition-all shadow-sm ${
                activeCategory === cat.id
                  ? "bg-accent text-accent-foreground scale-110 shadow-md"
                  : `${categoryColors[cat.id] || "bg-muted"} text-foreground/80 group-hover:shadow-md group-active:scale-95`
              }`}
            >
              {cat.icon}
            </div>
            <span
              className={`text-[10px] sm:text-[11px] font-medium transition-colors ${
                activeCategory === cat.id ? "text-accent font-bold" : "text-muted-foreground"
              }`}
            >
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
