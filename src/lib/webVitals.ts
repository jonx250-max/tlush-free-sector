import { onCLS, onINP, onLCP, onFCP, onTTFB, type Metric } from 'web-vitals'

type Reporter = (metric: Metric) => void

const METRIC_THRESHOLDS: Record<string, [number, number]> = {
  CLS: [0.1, 0.25],
  INP: [200, 500],
  LCP: [2500, 4000],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
}

export function classify(metric: Pick<Metric, 'name' | 'value'>): 'good' | 'needs-improvement' | 'poor' {
  const t = METRIC_THRESHOLDS[metric.name]
  if (!t) return 'good'
  if (metric.value <= t[0]) return 'good'
  if (metric.value <= t[1]) return 'needs-improvement'
  return 'poor'
}

const consoleReporter: Reporter = (metric) => {
  const rating = classify(metric)
  const color = rating === 'good' ? 'color:#16a34a' : rating === 'needs-improvement' ? 'color:#eab308' : 'color:#dc2626'
  console.info(`%c[web-vitals] ${metric.name} = ${metric.value.toFixed(1)} (${rating})`, color)
}

function beaconReporter(endpoint: string): Reporter {
  return (metric) => {
    const body = JSON.stringify({ name: metric.name, value: metric.value, id: metric.id, rating: classify(metric) })
    if (navigator.sendBeacon) navigator.sendBeacon(endpoint, body)
    else fetch(endpoint, { body, method: 'POST', keepalive: true }).catch(() => {})
  }
}

export function initWebVitals(endpoint?: string) {
  const reporter: Reporter = endpoint ? beaconReporter(endpoint) : consoleReporter
  onCLS(reporter)
  onINP(reporter)
  onLCP(reporter)
  onFCP(reporter)
  onTTFB(reporter)
}
