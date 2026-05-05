"use client";

type SelectionOption = {
  label: string;
  value: string;
};

type ClassSelectionProps = {
  title: string;
  subtitle: string;
  options: SelectionOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
};

export function ClassSelection({
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
}: ClassSelectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
                isSelected
                  ? "border-violet-300 bg-violet-500/25 text-violet-100"
                  : "border-white/10 bg-[#1a1f3d] text-slate-100 hover:border-violet-400/50 hover:bg-[#20264d]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
