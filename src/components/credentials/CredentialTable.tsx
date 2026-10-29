import { Box, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, Typography } from '@mui/material'
import { useCredentialActions } from '../../store/CredentialActionsContext'
import type { Credential, SortKey } from '../../types/credential'
import { formatRelative } from '../../utils/dateFormatter'
import { hostnameOf, isValidUrl, normalizeUrl } from '../../utils/validators'
import { AppAvatar } from '../common/AppAvatar'
import { CategoryDot } from '../common/CategoryDot'
import { Shimmer } from '../common/Shimmer'
import { CredentialRowActions } from './CredentialRowActions'
import { PasswordField } from './PasswordField'

interface CredentialTableProps {
  credentials: Credential[]
  sort: SortKey
  onSortChange: (sort: SortKey) => void
  revealedId: string | null
  onReveal: (id: string | null) => void
  loading?: boolean
}

type SortColumn = 'name' | 'category' | 'updated'

function columnOf(sort: SortKey): { column: SortColumn; direction: 'asc' | 'desc' } {
  if (sort === 'name-asc') return { column: 'name', direction: 'asc' }
  if (sort === 'name-desc') return { column: 'name', direction: 'desc' }
  if (sort === 'category') return { column: 'category', direction: 'asc' }
  if (sort === 'updated-asc') return { column: 'updated', direction: 'asc' }
  return { column: 'updated', direction: 'desc' }
}

export function CredentialTable({ credentials, sort, onSortChange, revealedId, onReveal, loading }: CredentialTableProps) {
  const actions = useCredentialActions()
  const current = columnOf(sort)

  const toggleSort = (column: SortColumn) => {
    const asc = current.column === column && current.direction === 'asc'
    if (column === 'name') onSortChange(asc ? 'name-desc' : 'name-asc')
    else if (column === 'category') onSortChange('category')
    else onSortChange(current.column === 'updated' && current.direction === 'desc' ? 'updated-asc' : 'updated-desc')
  }

  const header = (column: SortColumn, label: string) => (
    <TableSortLabel
      active={current.column === column}
      direction={current.column === column ? current.direction : 'asc'}
      onClick={() => toggleSort(column)}
    >
      {label}
    </TableSortLabel>
  )

  return (
    <TableContainer className="kn-scroll-x">
      <Table size="small" sx={{ minWidth: 880 }} aria-label="Credentials">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '24%' }}>{header('name', 'Application')}</TableCell>
            <TableCell sx={{ width: '18%' }}>Username</TableCell>
            <TableCell sx={{ width: '14%' }}>URL</TableCell>
            <TableCell sx={{ width: '16%' }}>Password</TableCell>
            <TableCell sx={{ width: '12%' }}>{header('category', 'Category')}</TableCell>
            <TableCell sx={{ width: '9%' }}>{header('updated', 'Updated')}</TableCell>
            <TableCell align="right" sx={{ width: 190 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading
            ? Array.from({ length: 6 }, (_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Shimmer width={34} height={34} radius={10} />
                      <Box sx={{ flex: 1 }}>
                        <Shimmer width="60%" height={12} />
                        <Shimmer width="40%" height={10} sx={{ mt: 0.75 }} />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Shimmer width="70%" />
                  </TableCell>
                  <TableCell>
                    <Shimmer width="60%" />
                  </TableCell>
                  <TableCell>
                    <Shimmer width="55%" />
                  </TableCell>
                  <TableCell>
                    <Shimmer width="65%" />
                  </TableCell>
                  <TableCell>
                    <Shimmer width="50%" />
                  </TableCell>
                  <TableCell align="right">
                    <Shimmer width={120} sx={{ ml: 'auto' }} />
                  </TableCell>
                </TableRow>
              ))
            : credentials.map((c) => (
                <TableRow
                  key={c.id}
                  hover
                  onClick={() => actions.openDetails(c)}
                  sx={{ cursor: 'pointer' }}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) actions.openDetails(c)
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <AppAvatar name={c.appName} size={34} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} className="kn-truncate">
                          {c.appName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" className="kn-truncate" sx={{ display: 'block' }}>
                          {c.url ? hostnameOf(c.url) : 'No website'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" className="kn-truncate" sx={{ maxWidth: 220 }}>
                      {c.username || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {c.url && isValidUrl(c.url) ? (
                      <Link
                        href={normalizeUrl(c.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        variant="body2"
                        underline="hover"
                        color="primary"
                        className="kn-truncate"
                        sx={{ display: 'block', maxWidth: 180 }}
                      >
                        {hostnameOf(c.url)}
                      </Link>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {c.url ? 'Invalid URL' : '—'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <PasswordField
                      value={c.password}
                      revealed={revealedId === c.id}
                      onToggle={() => onReveal(revealedId === c.id ? null : c.id)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <CategoryDot category={c.category} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatRelative(c.updatedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <CredentialRowActions credential={c} />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
