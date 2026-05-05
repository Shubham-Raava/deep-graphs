"use client";

import type { Concept } from "../types/knowledgeGraph";

type SidebarProps = {
  concepts: Concept[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedConceptId: string | null;
  onSelectConcept: (conceptId: string) => void;
  masteryByConceptId?: Record<string, number>;
};

export function Sidebar({
  concepts,
  searchQuery,
  onSearchChange,
  selectedConceptId,
  onSelectConcept,
  masteryByConceptId = {},
}: SidebarProps) {
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.67) return "bg-emerald-400";
    if (mastery >= 0.34) return "bg-yellow-400";
    return "bg-rose-400";
  };

  return (
    <aside className="flex h-full flex-col border-b border-white/10 bg-[#11142a] p-4 lg:border-r lg:border-b-0">
      <h1 className="mb-3 text-lg font-semibold text-white">Concept Map</h1>

      <input
        type="text"
        placeholder="Search concepts..."
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        className="mb-4 rounded-md border border-white/15 bg-[#1a1f3d] px-3 py-2 text-sm text-white outline-none transition focus:border-violet-400"
      />

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {concepts.length > 0 ? (
          concepts.map((concept) => {
            const isActive = selectedConceptId === concept.id;
            return (
              <button
                key={concept.id}
                type="button"
                onClick={() => onSelectConcept(concept.id)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "border-violet-400 bg-violet-500/20 text-violet-100"
                    : "border-white/10 bg-[#171b35] text-slate-200 hover:border-violet-400/50 hover:bg-[#20264d]"
                }`}
              >
                <span>{concept.name}</span>
                {typeof masteryByConceptId[concept.id] === "number" && (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${getMasteryColor(
                      masteryByConceptId[concept.id],
                    )}`}
                  />
                )}
              </button>
            );
          })
        ) : (
          <p className="pt-1 text-sm text-slate-400">No matching concepts found.</p>
        )}
      </div>
    </aside>
  );
}
