import { Search, X, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";

export type ViewMode = "grid" | "list";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function SearchBar({ value, onChange, viewMode, onViewModeChange }: SearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10 rounded-xl bg-card border-border"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
        <button
          onClick={() => onViewModeChange("grid")}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            viewMode === "grid"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Exibir em grade"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => onViewModeChange("list")}
          className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
            viewMode === "list"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Exibir em lista"
        >
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
