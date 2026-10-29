import { Box } from '@mui/material'
import { hueOf, initialsOf } from '../../utils/validators'

interface AppAvatarProps {
  name: string
  size?: number
}

/** Generated-initials avatar with a deterministic warm hue per application name. */
export function AppAvatar({ name, size = 36 }: AppAvatarProps) {
  const hue = hueOf(name.toLowerCase())
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: `${Math.round(size * 0.3)}px`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        fontSize: size * 0.36,
        fontWeight: 600,
        letterSpacing: '0.02em',
        color: `hsl(${hue} 30% 28%)`,
        bgcolor: `hsl(${hue} 32% 90%)`,
        '[data-mui-color-scheme="dark"] &': {
          color: `hsl(${hue} 36% 78%)`,
          bgcolor: `hsl(${hue} 20% 22%)`,
        },
      }}
    >
      {initialsOf(name)}
    </Box>
  )
}
