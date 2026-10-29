import { Box, Typography } from '@mui/material'

interface KeyNestLogoProps {
  size?: number
  showName?: boolean
  name?: string
}

/** Mark: a rounded nest with a key notch, in forest green. */
export function KeyNestLogo({ size = 32, showName = true, name = 'KeyNest' }: KeyNestLogoProps) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Box
        component="svg"
        viewBox="0 0 32 32"
        width={size}
        height={size}
        aria-hidden
        sx={{ flexShrink: 0, display: 'block' }}
      >
        <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--kn-palette-primary-main)" />
        <circle cx="13" cy="13" r="5" fill="none" stroke="#F7F6F2" strokeWidth="2.4" />
        <path d="M16.6 16.6 23 23M20.2 20.2l2.2-2.2M22.4 22.4l2.2-2.2" stroke="#F7F6F2" strokeWidth="2.4" strokeLinecap="round" />
      </Box>
      {showName && (
        <Typography
          component="span"
          sx={{ fontWeight: 700, fontSize: size * 0.56, letterSpacing: '-0.02em', color: 'text.primary', lineHeight: 1 }}
          className="kn-truncate"
        >
          {name}
        </Typography>
      )}
    </Box>
  )
}
