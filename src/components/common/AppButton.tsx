import { Button, CircularProgress, type ButtonProps } from '@mui/material'

interface AppButtonProps extends ButtonProps {
  loading?: boolean
}

/** MUI Button with a built-in loading state that keeps its width stable. */
export function AppButton({ loading, children, disabled, startIcon, ...props }: AppButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" thickness={5} /> : startIcon}
    >
      {children}
    </Button>
  )
}
