import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function SearchSelect({
  label,
  placeholder = 'Rechercher...',
  options,
  value,
  onChange,
}: {
  label?: string;
  placeholder?: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);

  const filtered = query
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        (o.sublabel || '').toLowerCase().includes(query.toLowerCase())
      )
    : options;

  return (
    <div ref={ref} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      <div
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-all hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        onClick={() => setOpen(!open)}
      >
        <Search size={16} className="shrink-0 text-slate-400" />
        <span className={`flex-1 truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        {selected && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="shrink-0 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Tapez pour rechercher..."
              className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-400">Aucun resultat</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 ${opt.value === value ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                >
                  <span className="font-medium">{opt.label}</span>
                  {opt.sublabel && <span className="text-xs text-slate-400">{opt.sublabel}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
