import { useState, useCallback, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { searchSettlements, ZONE_NAMES, type Settlement } from '../../data/settlements'
import { twMerge } from 'tailwind-merge'

interface SettlementSelectorProps {
  value: Settlement | null
  onChange: (settlement: Settlement | null) => void
  label?: string
  error?: string
}

export function SettlementSelector({
  value,
  onChange,
  label = 'ישוב מגורים',
  error,
}: SettlementSelectorProps) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<Settlement[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleSearch = useCallback((text: string) => {
    setQuery(text)
    if (text.length >= 2) {
      setResults(searchSettlements(text))
      setIsOpen(true)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [])

  const handleSelect = useCallback((settlement: Settlement) => {
    setQuery(settlement.name)
    onChange(settlement)
    setIsOpen(false)
  }, [onChange])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const typeLabel = (type: string) => {
    switch (type) {
      case 'city': return 'עיר'
      case 'town': return 'עיירה'
      case 'kibbutz': return 'קיבוץ'
      case 'moshav': return 'מושב'
      case 'community': return 'יישוב קהילתי'
      default: return type
    }
  }

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      {label && (
        <label className="block text-sm font-medium text-cs-muted">{label}</label>
      )}
      <div className="relative">
        <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-cs-muted" />
        <input
          type="text"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder="הקלד שם ישוב..."
          className={twMerge(
            'w-full rounded-lg border border-cs-border bg-cs-surface py-2 pr-9 pl-3 text-cs-text',
            'placeholder:text-cs-muted/60 focus:border-cs-primary focus:outline-none focus:ring-2 focus:ring-cs-primary/30',
            error && 'border-cs-danger',
          )}
        />
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-cs-border bg-cs-surface shadow-lg">
          {results.map(s => (
            <li key={`${s.name}-${s.type}`}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-right hover:bg-cs-primary/5"
              >
                <div className="flex-1">
                  <p className="font-medium text-cs-text">{s.name}</p>
                  <p className="text-xs text-cs-muted">
                    {typeLabel(s.type)} • {ZONE_NAMES[s.zone]}
                  </p>
                </div>
                {s.creditPoints > 0 && (
                  <span className="rounded-full bg-cs-success/10 px-2 py-0.5 text-xs text-cs-success">
                    +{s.creditPoints} נק׳ זיכוי
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value && value.zone !== 'none' && (
        <div className="mt-2 rounded-lg border border-cs-success/20 bg-cs-success/5 p-3">
          <p className="text-sm font-medium text-cs-success">
            {value.name} — {ZONE_NAMES[value.zone]}
          </p>
          <p className="text-xs text-cs-muted">
            {value.creditPoints > 0 && `${value.creditPoints} נקודות זיכוי נוספות`}
            {value.taxDiscountPct > 0 && ` • ${value.taxDiscountPct}% הנחת מס`}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-cs-danger">{error}</p>}
    </div>
  )
}
