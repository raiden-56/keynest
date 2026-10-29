import { Box, Typography } from '@mui/material'
import { useMemo } from 'react'
import { evaluateStrength, type GeneratorOptions } from '../../services/passwordGeneratorService'

interface PasswordStrengthMeterProps {
  password: string
  policy?: GeneratorOptions
  showFeedback?: boolean
}

const SEGMENT_COLORS = ['error.main', 'error.main', 'warning.main', 'secondary.main', 'success.main']

export function PasswordStrengthMeter({ password, policy, showFeedback = true }: PasswordStrengthMeterProps) {
  const result = useMemo(() => evaluateStrength(password, policy), [password, policy])
  const filled = password ? result.score + 1 : 0
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }} aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: i < filled ? SEGMENT_COLORS[result.score] : 'action.hover',
              transition: 'background-color 200ms ease',
            }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mt: 0.5, gap: 1 }}>
        <Typography variant="caption" sx={{ color: password ? SEGMENT_COLORS[result.score] : 'text.secondary', fontWeight: 600 }}>
          {password ? result.label : 'Strength'}
          {password && policy && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
              {' '}
              · {result.meetsPolicy ? 'meets the configured policy' : 'does not meet the configured policy'}
            </Typography>
          )}
        </Typography>
        {password && (
          <Typography variant="caption" color="text.secondary">
            ~{result.entropyBits} bits
          </Typography>
        )}
      </Box>
      {showFeedback && password && result.feedback.length > 0 && result.score < 3 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {result.feedback.slice(0, 2).join(' ')}
        </Typography>
      )}
    </Box>
  )
}
