import { Box, Button, Chip, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material'
import { Folders, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { MotionFade } from '../components/common/MotionFade'
import { useToast } from '../components/common/ToastProvider'
import { CategoryCard, CategoryCardSkeleton } from '../components/dashboard/CategoryCard'
import { CredentialFilters } from '../components/credentials/CredentialFilters'
import { CredentialList } from '../components/credentials/CredentialList'
import { useCategoryCounts, useFilteredCredentials } from '../hooks/useCredentials'
import { useListFilters } from '../hooks/useListFilters'
import { useSettings } from '../store/SettingsContext'
import { useVault } from '../store/VaultContext'
import { DEFAULT_CATEGORIES } from '../utils/constants'

export function CategoriesPage() {
  const { state } = useVault()
  const { categories, settings, addCategory, removeCategory } = useSettings()
  const toast = useToast()
  const counts = useCategoryCounts()
  const [params, setParams] = useSearchParams()
  const selected = params.get('category')
  const [newName, setNewName] = useState('')

  const allCategories = useMemo(() => {
    const extra = [...counts.keys()].filter((c) => !categories.includes(c))
    return [...categories, ...extra]
  }, [categories, counts])

  const { filters, setFilters } = useListFilters({ lockedCategory: selected })
  const filtered = useFilteredCredentials(filters)

  const select = (category: string | null) => {
    const next = new URLSearchParams(params)
    if (category && category !== selected) next.set('category', category)
    else next.delete('category')
    setParams(next, { replace: true })
  }

  const create = () => {
    const name = newName.trim()
    if (!name) return
    if (addCategory(name)) {
      toast.success(`Category "${name}" created.`)
      setNewName('')
    } else {
      toast.warning('That category already exists.')
    }
  }

  return (
    <MotionFade>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' } }}>
          {state.loading
            ? Array.from({ length: 8 }, (_, i) => <CategoryCardSkeleton key={i} />)
            : allCategories.map((category) => (
                <CategoryCard key={category} category={category} count={counts.get(category) ?? 0} active={selected === category} onClick={() => select(category)} />
              ))}
        </Box>

        <Paper sx={{ p: 'var(--kn-card-pad)' }}>
          <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
            Custom categories
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add your own categories alongside the built-in ones. Removing a custom category does not change existing records.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: settings.customCategories.length ? 2 : 0 }}>
            <TextField
              size="small"
              label="New category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  create()
                }
              }}
              sx={{ minWidth: 220 }}
            />
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={create} disabled={!newName.trim()}>
              Add category
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {settings.customCategories.map((c) => (
              <Chip
                key={c}
                label={`${c} · ${counts.get(c) ?? 0}`}
                onDelete={() => removeCategory(c)}
                deleteIcon={
                  <Tooltip title="Remove category">
                    <IconButton size="small" aria-label={`Remove ${c}`} component="span">
                      <X size={14} />
                    </IconButton>
                  </Tooltip>
                }
              />
            ))}
          </Box>
        </Paper>

        {selected ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h3" component="h2">
                {selected} · {counts.get(selected) ?? 0}
              </Typography>
              <Button size="small" color="inherit" onClick={() => select(null)} sx={{ color: 'text.secondary' }}>
                Show all categories
              </Button>
            </Box>
            <CredentialFilters filters={filters} categories={categories} onChange={setFilters} hideCategory />
            <CredentialList
              credentials={filtered}
              loading={state.loading}
              sort={filters.sort}
              onSortChange={(sort) => setFilters({ ...filters, sort })}
              emptyState={
                <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 3.5, bgcolor: 'background.paper' }}>
                  <EmptyState icon={Folders} title={`Nothing in ${selected}`} description="Accounts assigned to this category will appear here." compact />
                </Box>
              }
            />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a category above to see its accounts. Built-in categories: {DEFAULT_CATEGORIES.join(', ')}.
          </Typography>
        )}
      </Box>
    </MotionFade>
  )
}
