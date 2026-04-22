import type { MotionProps } from 'framer-motion'

export function fadeUp(reduced: boolean): MotionProps {
  if (reduced) return {}
  return {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.75, ease: 'easeOut' },
  }
}

export function fadeInView(reduced: boolean, delay = 0): MotionProps {
  if (reduced) return {}
  return {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.65, delay },
  }
}
