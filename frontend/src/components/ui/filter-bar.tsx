import { X } from "lucide-react";

type FilterOption = {
  value: string;
  label: string;
};

type FilterField =
  | {
      key: string;
      label: string;
      type: "search";
      placeholder?: string;
      value: string;
      onChange: (value: string) => void;
    }
  | {
      key: string;
      label: string;
      type: "select";
      value: string;
      onChange: (value: string) => void;
      options: FilterOption[];
      disabled?: boolean;
    };

interface FilterBarProps {
  title?: string;
  fields: FilterField[];
  hasActiveFilters: boolean;
  onReset: () => void;
  className?: string;
}

export function FilterBar({ title, fields, hasActiveFilters, onReset, className }: FilterBarProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`.trim()}>
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
            {field.type === "search" ? (
              <input
                type="text"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            ) : (
              <select
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                disabled={field.disabled}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>
      {hasActiveFilters && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
