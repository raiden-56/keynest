import { Box, type SxProps, type Theme } from '@mui/material'

interface ShimmerProps {
  width?: number | string
  height?: number | string
  radius?: number
  sx?: SxProps<Theme>
  className?: string
}

/** A warm, subtle skeleton block. Uses CSS variables so it adapts to dark mode and reduced motion. */
export function Shimmer({ width = '100%', height = 14, radius = 8, sx, className }: ShimmerProps) {
  return (
    <Box
      aria-hidden
      className={`kn-shimmer ${className ?? ''}`}
      sx={{ width, height, borderRadius: `${radius}px`, flexShrink: 0, ...sx }}
    />
  )
}

export function ShimmerText({ lines = 2, widths = ['70%', '45%'] }: { lines?: number; widths?: (number | string)[] }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: lines }, (_, i) => (
        <Shimmer key={i} width={widths[i % widths.length]} height={12} />
      ))}
    </Box>
  )
}
