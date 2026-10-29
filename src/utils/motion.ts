import type { Transition, Variants } from 'framer-motion'

export const quick: Transition = { duration: 0.18, ease: [0.2, 0, 0, 1] }
export const gentle: Transition = { duration: 0.25, ease: [0.2, 0, 0, 1] }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: gentle },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: gentle },
}

export const stagger = (delay = 0.04): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
})
