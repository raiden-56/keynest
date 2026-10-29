import { Box, Paper, Typography } from '@mui/material'
import {
  Briefcase,
  Clapperboard,
  CodeXml,
  Folder,
  Landmark,
  Share2,
  ShoppingBag,
  User,
  type LucideIcon,
} from 'lucide-react'
import { hueOf } from '../../utils/validators'
import { Shimmer } from '../common/Shimmer'

const ICONS: Record<string, LucideIcon> = {
  Work: Briefcase,
  Personal: User,
  Finance: Landmark,
  Shopping: ShoppingBag,
  'Social Media': Share2,
  Entertainment: Clapperboard,
  'Developer Tools': CodeXml,
}

export function categoryIcon(category: string): LucideIcon {
  return ICONS[category] ?? Folder
}

interface CategoryCardProps {
  category: string
  count: number
  onClick: () => void
  active?: boolean
}

export function CategoryCard({ category, count, onClick, active }: CategoryCardProps) {
  const Icon = categoryIcon(category)
  const hue = hueOf(category.toLowerCase())
  return (
    <Paper
      component="button"
      onClick={onClick}
      aria-pressed={active}
      sx={{
        p: 'var(--kn-card-pad)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        textAlign: 'left',
        font: 'inherit',
        color: 'inherit',
        cursor: 'pointer',
        borderColor: active ? 'primary.main' : 'divider',
        transition: 'border-color 160ms ease, transform 160ms ease',
        '&:hover': { borderColor: active ? 'primary.main' : 'text.secondary' },
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          borderRadius: '11px',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          color: `hsl(${hue} 30% 32%)`,
          bgcolor: `hsl(${hue} 30% 91%)`,
          '[data-mui-color-scheme="dark"] &': { color: `hsl(${hue} 34% 78%)`, bgcolor: `hsl(${hue} 18% 22%)` },
        }}
      >
        <Icon size={18} strokeWidth={1.9} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} className="kn-truncate">
          {category}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {count} {count === 1 ? 'account' : 'accounts'}
        </Typography>
      </Box>
    </Paper>
  )
}

export function CategoryCardSkeleton() {
  return (
    <Paper sx={{ p: 'var(--kn-card-pad)', display: 'flex', alignItems: 'center', gap: 1.5 }} aria-hidden>
      <Shimmer width={38} height={38} radius={11} />
      <Box sx={{ flex: 1 }}>
        <Shimmer width="60%" height={12} />
        <Shimmer width="35%" height={10} sx={{ mt: 0.75 }} />
      </Box>
    </Paper>
  )
}
