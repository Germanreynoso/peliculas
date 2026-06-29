interface Option {
  value: string;
  label: string;
}

interface FiltersProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  // Select primario polimórfico: género (movies/tv/anime) o país/grupo (live)
  primaryOptions: Option[];
  primaryValue: string;
  onPrimaryChange: (v: string) => void;
  primaryAllLabel: string; // ej. "Todas las categorías" / "Todos los países"
  // Orden (opcional)
  showSort?: boolean;
  sortBy?: string;
  onSortChange?: (v: string) => void;
}

export default function Filters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar por nombre...',
  primaryOptions,
  primaryValue,
  onPrimaryChange,
  primaryAllLabel,
  showSort = true,
  sortBy = 'default',
  onSortChange,
}: FiltersProps) {
  return (
    <section className="filters-section">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="filter-input"
      />
      <select value={primaryValue} onChange={(e) => onPrimaryChange(e.target.value)} className="filter-select">
        <option value="">{primaryAllLabel}</option>
        {primaryOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {showSort && (
        <select value={sortBy} onChange={(e) => onSortChange?.(e.target.value)} className="filter-select">
          <option value="default">Orden por defecto</option>
          <option value="name_asc">Nombre (A-Z)</option>
          <option value="name_desc">Nombre (Z-A)</option>
          <option value="year_desc">Año (Más recientes)</option>
          <option value="year_asc">Año (Más antiguos)</option>
          <option value="category">Categoría (A-Z)</option>
        </select>
      )}
    </section>
  );
}
