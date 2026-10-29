import { Box, Button, Checkbox, FormControlLabel, IconButton, Slider, Tooltip, Typography } from '@mui/material'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useClipboard } from '../../hooks/useClipboard'
import {
  DEFAULT_GENERATOR_OPTIONS,
  MAX_LENGTH,
  MIN_LENGTH,
  generatePassword,
  type GeneratorOptions,
} from '../../services/passwordGeneratorService'
import { PasswordStrengthMeter } from './PasswordStrengthMeter'

interface PasswordGeneratorProps {
  onUse?: (password: string) => void
  initialOptions?: GeneratorOptions
}

const TOGGLES: { key: keyof Omit<GeneratorOptions, 'length'>; label: string }[] = [
  { key: 'uppercase', label: 'Uppercase (A–Z)' },
  { key: 'lowercase', label: 'Lowercase (a–z)' },
  { key: 'numbers', label: 'Numbers (0–9)' },
  { key: 'symbols', label: 'Symbols (!@#…)' },
  { key: 'excludeAmbiguous', label: 'Exclude ambiguous (Il1O0)' },
]

export function PasswordGenerator({ onUse, initialOptions = DEFAULT_GENERATOR_OPTIONS }: PasswordGeneratorProps) {
  const [options, setOptions] = useState<GeneratorOptions>(initialOptions)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { copyPassword } = useClipboard()

  const regenerate = useCallback((opts: GeneratorOptions) => {
    try {
      setPassword(generatePassword(opts))
      setError(null)
    } catch (e) {
      setPassword('')
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    regenerate(options)
  }, [options, regenerate])

  const setToggle = (key: keyof Omit<GeneratorOptions, 'length'>, value: boolean) =>
    setOptions((prev) => ({ ...prev, [key]: value }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.25,
          pl: 1.75,
          borderRadius: 2.5,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Typography
          className="kn-mono"
          sx={{ flex: 1, fontSize: '0.9rem', wordBreak: 'break-all', lineHeight: 1.5, color: error ? 'text.secondary' : 'text.primary' }}
          aria-live="polite"
        >
          {error ?? password}
        </Typography>
        <Tooltip title="Generate another">
          <IconButton size="small" onClick={() => regenerate(options)} aria-label="Generate another password">
            <RefreshCw size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Copy password">
          <IconButton size="small" onClick={() => void copyPassword(password)} aria-label="Copy generated password" disabled={!password}>
            <Copy size={16} />
          </IconButton>
        </Tooltip>
      </Box>

      <PasswordStrengthMeter password={password} policy={options} showFeedback={false} />

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Length
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {options.length} characters
          </Typography>
        </Box>
        <Slider
          value={options.length}
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          step={1}
          size="small"
          aria-label="Password length"
          onChange={(_, value) => setOptions((prev) => ({ ...prev, length: Array.isArray(value) ? value[0] : value }))}
          sx={{ mt: 0.5 }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 1 }}>
        {TOGGLES.map((t) => (
          <FormControlLabel
            key={t.key}
            control={<Checkbox size="small" checked={options[t.key]} onChange={(e) => setToggle(t.key, e.target.checked)} />}
            label={<Typography variant="body2">{t.label}</Typography>}
            sx={{ mr: 0, ml: -1 }}
          />
        ))}
      </Box>

      {onUse && (
        <Button
          variant="contained"
          startIcon={<Check size={16} />}
          onClick={() => password && onUse(password)}
          disabled={!password}
          sx={{ alignSelf: 'flex-start' }}
        >
          Use this password
        </Button>
      )}
    </Box>
  )
}
