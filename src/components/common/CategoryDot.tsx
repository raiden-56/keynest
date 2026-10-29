import { Box, Typography } from '@mui/material'
import { hueOf } from '../../utils/validators'

/** Small colored marker + label for a category. Hue is deterministic per name and stays within the warm range. */
export function CategoryDot({ category, size = 'medium' }: { category: string; size?: 'small' | 'medium' }) {
  const hue = hueOf(category.toLowerCase())
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: `hsl(${hue} 34% 46%)`,
          '[data-mui-color-scheme="dark"] &': { bgcolor: `hsl(${hue} 36% 62%)` },
        }}
      />
      <Typography variant={size === 'small' ? 'caption' : 'body2'} className="kn-truncate" sx={{ color: 'text.secondary' }}>
        {category}
      </Typography>
    </Box>
  )
}
