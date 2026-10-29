import { createTheme } from '@mui/material/styles'
import { darkPalette, lightPalette } from './palette'

const fontFamily = '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

function schemePalette(p: typeof lightPalette | typeof darkPalette, mode: 'light' | 'dark') {
  return {
    mode,
    primary: { main: p.primary, dark: p.primaryDark, light: p.primaryLight, contrastText: mode === 'light' ? '#FFFFFF' : '#15241B' },
    secondary: { main: p.secondary, dark: p.secondaryDark, contrastText: mode === 'light' ? '#FFFFFF' : '#1A1D16' },
    success: { main: p.success },
    warning: { main: p.warning },
    error: { main: p.error },
    info: { main: p.info },
    background: { default: p.background, paper: p.paper },
    text: { primary: p.text, secondary: p.textSecondary },
    divider: p.border,
    action: {
      hover: p.hover,
      selected: mode === 'light' ? 'rgba(53, 94, 69, 0.08)' : 'rgba(127, 174, 143, 0.14)',
      focus: mode === 'light' ? 'rgba(53, 94, 69, 0.12)' : 'rgba(127, 174, 143, 0.2)',
    },
  }
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data-mui-color-scheme', cssVarPrefix: 'kn' },
  colorSchemes: {
    light: { palette: schemePalette(lightPalette, 'light') },
    dark: { palette: schemePalette(darkPalette, 'dark') },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily,
    h1: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h3: { fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: ({ palette }) => ({
        body: { backgroundColor: palette.background.default },
      }),
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme: t }) => ({
          backgroundImage: 'none',
          border: `1px solid ${t.vars.palette.divider}`,
          borderRadius: 14,
        }),
      },
    },
    MuiCard: {
      styleOverrides: { root: { borderRadius: 14 } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 14,
          minHeight: 38,
          transition: 'background-color 160ms ease, border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease',
          '&:active': { transform: 'translateY(0.5px)' },
        },
        sizeSmall: { minHeight: 32, paddingInline: 10, fontSize: '0.8125rem' },
        sizeLarge: { minHeight: 46, fontSize: '0.9375rem' },
        outlined: ({ theme: t }) => ({
          borderColor: t.vars.palette.divider,
          '&:hover': { borderColor: t.vars.palette.text.secondary, backgroundColor: t.vars.palette.action.hover },
        }),
        text: ({ theme: t }) => ({ '&:hover': { backgroundColor: t.vars.palette.action.hover } }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 10,
          color: t.vars.palette.text.secondary,
          transition: 'background-color 160ms ease, color 160ms ease',
          '&:hover': { backgroundColor: t.vars.palette.action.hover, color: t.vars.palette.text.primary },
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderRadius: 10,
          backgroundColor: t.vars.palette.background.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: t.vars.palette.divider },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.vars.palette.text.secondary },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1.5 },
        }),
        input: { paddingBlock: 11 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontSize: '0.9rem' } } },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 2 } } },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          borderBottomColor: t.vars.palette.divider,
          paddingBlock: 'var(--kn-cell-py, 12px)',
          paddingInline: 14,
        }),
        head: ({ theme: t }) => ({
          color: t.vars.palette.text.secondary,
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          backgroundColor: t.vars.palette.background.default,
          whiteSpace: 'nowrap',
        }),
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: ({ theme: t }) => ({
          transition: 'background-color 150ms ease',
          '&:hover': { backgroundColor: t.vars.palette.action.hover },
          '&:last-child td': { borderBottom: 0 },
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, height: 26 },
        sizeSmall: { height: 22, fontSize: '0.75rem' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: 16,
          border: `1px solid ${t.vars.palette.divider}`,
          boxShadow: '0 24px 64px -24px rgba(20, 24, 18, 0.35)',
        }),
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { fontSize: '1.125rem', fontWeight: 600, paddingBottom: 8 } } },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme: t }) => ({ borderColor: t.vars.palette.divider, backgroundImage: 'none', borderRadius: 0 }),
      },
    },
    MuiTooltip: {
      defaultProps: { arrow: true, enterDelay: 400 },
      styleOverrides: {
        tooltip: ({ theme: t }) => ({
          backgroundColor: t.vars.palette.text.primary,
          color: t.vars.palette.background.paper,
          fontSize: '0.75rem',
          borderRadius: 8,
          paddingInline: 10,
        }),
        arrow: ({ theme: t }) => ({ color: t.vars.palette.text.primary }),
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme: t }) => ({
          borderRadius: 12,
          border: `1px solid ${t.vars.palette.divider}`,
          boxShadow: '0 12px 32px -12px rgba(20, 24, 18, 0.3)',
          marginTop: 4,
        }),
        list: { padding: 6 },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: '0.875rem', minHeight: 36, marginBlock: 1 },
      },
    },
    MuiListItemButton: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontSize: '0.875rem', alignItems: 'flex-start' },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: { padding: 8 },
        track: { borderRadius: 11 },
        thumb: { boxShadow: 'none' },
      },
    },
    MuiTabs: { styleOverrides: { indicator: { height: 2, borderRadius: 2 } } },
    MuiTab: { styleOverrides: { root: { minHeight: 44, paddingInline: 12 } } },
    MuiSkeleton: {
      styleOverrides: {
        root: ({ theme: t }) => ({ backgroundColor: t.vars.palette.action.hover, borderRadius: 8 }),
      },
    },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 4, height: 6 } } },
    MuiSelect: { styleOverrides: { select: { borderRadius: 10 } } },
    MuiAutocomplete: { styleOverrides: { paper: { marginTop: 4 } } },
    MuiTablePagination: {
      styleOverrides: {
        root: { fontSize: '0.8125rem' },
        toolbar: { minHeight: 48 },
        selectLabel: { fontSize: '0.8125rem' },
        displayedRows: { fontSize: '0.8125rem' },
      },
    },
  },
})
