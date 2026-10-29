import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { fadeIn, fadeUp, stagger } from '../../utils/motion'

interface MotionFadeProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  /** Use the upward variant (default) or a pure opacity fade. */
  up?: boolean
  delay?: number
}

/** Fade (and small rise) on mount; collapses to a plain div when the user prefers reduced motion. */
export function MotionFade({ children, up = true, delay = 0, style, ...rest }: MotionFadeProps) {
  const reduced = useReducedMotion()
  if (reduced) return <div style={style as React.CSSProperties}>{children}</div>
  return (
    <motion.div
      variants={up ? fadeUp : fadeIn}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      style={style}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** Parent that staggers MotionItem children. */
export function MotionStagger({ children, delay = 0.04, style }: { children: ReactNode; delay?: number; style?: React.CSSProperties }) {
  const reduced = useReducedMotion()
  if (reduced) return <div style={style}>{children}</div>
  return (
    <motion.div variants={stagger(delay)} initial="hidden" animate="visible" style={style}>
      {children}
    </motion.div>
  )
}

export function MotionItem({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  const reduced = useReducedMotion()
  if (reduced) return <div style={style}>{children}</div>
  return (
    <motion.div variants={fadeUp} style={style}>
      {children}
    </motion.div>
  )
}
