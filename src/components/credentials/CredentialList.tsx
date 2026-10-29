import { Box, Paper, TablePagination, useMediaQuery, useTheme } from '@mui/material'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSettings } from '../../store/SettingsContext'
import type { Credential, SortKey } from '../../types/credential'
import { PAGE_SIZE_OPTIONS } from '../../utils/constants'
import { CredentialCard, CredentialCardSkeleton } from './CredentialCard'
import { CredentialTable } from './CredentialTable'

interface CredentialListProps {
  credentials: Credential[]
  loading: boolean
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  emptyState: ReactNode
}

export function CredentialList({ credentials, loading, sort, onSortChange, emptyState }: CredentialListProps) {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('md'))
  const { settings, update } = useSettings()
  const [page, setPage] = useState(0)
  const [revealedId, setRevealedId] = useState<string | null>(null)

  const useCards = narrow || settings.viewMode === 'cards'
  const pageSize = settings.pageSize
  const pageCount = Math.max(1, Math.ceil(credentials.length / pageSize))

  useEffect(() => {
    if (page > pageCount - 1) setPage(0)
  }, [page, pageCount])

  // Auto re-mask after the configured interval; only one password is visible at a time.
  useEffect(() => {
    if (!revealedId || settings.revealTimeoutSeconds <= 0) return
    const timer = setTimeout(() => setRevealedId(null), settings.revealTimeoutSeconds * 1000)
    return () => clearTimeout(timer)
  }, [revealedId, settings.revealTimeoutSeconds])

  const pageItems = useMemo(() => credentials.slice(page * pageSize, page * pageSize + pageSize), [credentials, page, pageSize])

  if (!loading && credentials.length === 0) return <>{emptyState}</>

  const pagination = credentials.length > PAGE_SIZE_OPTIONS[0] && (
    <TablePagination
      component="div"
      count={credentials.length}
      page={page}
      onPageChange={(_, next) => setPage(next)}
      rowsPerPage={pageSize}
      onRowsPerPageChange={(e) => {
        update({ pageSize: Number(e.target.value) })
        setPage(0)
      }}
      rowsPerPageOptions={PAGE_SIZE_OPTIONS}
      labelRowsPerPage="Per page"
      sx={{ borderTop: useCards ? 0 : 1, borderColor: 'divider' }}
    />
  )

  if (useCards) {
    return (
      <Box>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } }}>
          {loading
            ? Array.from({ length: 6 }, (_, i) => <CredentialCardSkeleton key={i} />)
            : pageItems.map((c) => (
                <CredentialCard
                  key={c.id}
                  credential={c}
                  revealed={revealedId === c.id}
                  onReveal={() => setRevealedId(revealedId === c.id ? null : c.id)}
                />
              ))}
        </Box>
        {pagination}
      </Box>
    )
  }

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <CredentialTable
        credentials={pageItems}
        sort={sort}
        onSortChange={onSortChange}
        revealedId={revealedId}
        onReveal={setRevealedId}
        loading={loading}
      />
      {pagination}
    </Paper>
  )
}
