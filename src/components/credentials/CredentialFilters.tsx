import { Box, Button, Chip, MenuItem, TextField, Typography } from '@mui/material'
import { FunnelX } from 'lucide-react'
import type { CredentialFilterState, QuickFilter } from '../../types/credential'
import { QUICK_FILTER_OPTIONS, SORT_OPTIONS, countActiveFilters } from '../../utils/filtering'

interface CredentialFiltersProps {
  filters: CredentialFilterState
  categories: string[]
  onChange: (next: CredentialFilterState) => void
  /** Hide the category selector when the page already scopes to one category. */
  hideCategory?: boolean
  /** Quick filters that are implied by the page and shouldn't be shown. */
  hiddenQuick?: QuickFilter[]
}

export function CredentialFilters({ filters, categories, onChange, hideCategory, hiddenQuick = [] }: CredentialFiltersProps) {
  const active = countActiveFilters(filters)
  const toggleQuick = (value: QuickFilter) => {
    const quick = filters.quick.includes(value) ? filters.quick.filter((q) => q !== value) : [...filters.quick, value]
    onChange({ ...filters, quick })
  }
  const visibleQuick = QUICK_FILTER_OPTIONS.filter((q) => !hiddenQuick.includes(q.value))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {!hideCategory && (
          <TextField
            select
            size="small"
            label="Category"
            value={filters.category ?? ''}
            onChange={(e) => onChange({ ...filters, category: e.target.value || null })}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All categories</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        )}
        <TextField
          select
          size="small"
          label="Sort"
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value as CredentialFilterState['sort'] })}
          sx={{ minWidth: 190 }}
        >
          {SORT_OPTIONS.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        {active > 0 && (
          <Button
            size="small"
            color="inherit"
            startIcon={<FunnelX size={15} />}
            onClick={() => onChange({ query: '', category: null, quick: [], sort: filters.sort })}
          >
            Clear filters
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
        {visibleQuick.map((q) => {
          const selected = filters.quick.includes(q.value)
          return (
            <Chip
              key={q.value}
              label={q.label}
              size="small"
              clickable
              color={selected ? 'primary' : 'default'}
              variant={selected ? 'filled' : 'outlined'}
              onClick={() => toggleQuick(q.value)}
              aria-pressed={selected}
            />
          )
        })}
        {filters.query.trim() && (
          <Chip
            size="small"
            label={`Search: "${filters.query.trim()}"`}
            onDelete={() => onChange({ ...filters, query: '' })}
            sx={{ ml: 0.5 }}
          />
        )}
        {active > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {active} active filter{active === 1 ? '' : 's'}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
