import { OPTIONS } from './model'
import type { Option, Sample, Trace } from './model'

export type Metric = { key: 'altitude' | 'turn' | 'speed'; title: string; unit: string; max?: number; lines?: { value: number; label: string }[] }

const W = 440, H = 250, M = { top: 14, right: 40, bottom: 28, left: 42 }
const BUCKET = 3

/** One point for each BUCKET frames. A turn keeps the largest frame of its bucket, so no spike is lost. */
function points(samples: Sample[], key: Metric['key']) {
  const result: { t: number; v: number }[] = []
  for (let i = 0; i < samples.length; i += BUCKET) {
    const slice = samples.slice(i, i + BUCKET)
    result.push({ t: slice.at(-1)!.t, v: key === 'turn' ? Math.max(...slice.map(sample => sample.turn)) : slice.at(-1)![key] })
  }
  return result
}

const format = (value: number, unit: string) => `${value >= 100 ? Math.round(value).toLocaleString('en') : value.toFixed(1)}${unit === '°' ? '°' : ` ${unit}`}`

function ticks(max: number) {
  const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(value => max / value <= 5) ?? 2000
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step)
}

/** A line chart of one metric for the four options. Today is a gray dashed baseline. */
export function renderChart(host: HTMLElement, metric: Metric, traces: Trace[], duration: number) {
  const series = traces.map(trace => ({ option: trace.option, points: points(trace.samples, metric.key) }))
  const peak = Math.max(...series.flatMap(line => line.points.map(point => point.v)))
  const max = metric.max ?? Math.max(metric.key === 'turn' ? 3 : 10, peak) * 1.05
  const x = (t: number) => M.left + t / duration * (W - M.left - M.right)
  const y = (v: number) => H - M.bottom - Math.min(v, max) / max * (H - M.top - M.bottom)
  const clip = `clip-${metric.key}`
  const grid = ticks(max).map(value => `<line x1="${M.left}" x2="${W - M.right}" y1="${y(value)}" y2="${y(value)}" class="grid"/><text x="${M.left - 8}" y="${y(value) + 3}" class="axis" text-anchor="end">${value.toLocaleString('en')}</text>`).join('')
  const times = ticks(duration).map(t => `<text x="${x(t)}" y="${H - 10}" class="axis" text-anchor="middle">${t} s</text>`).join('')
  const references = (metric.lines ?? []).map(line => `<line x1="${M.left}" x2="${W - M.right}" y1="${y(line.value)}" y2="${y(line.value)}" class="reference"/><text x="${M.left + 6}" y="${y(line.value) - 4}" class="reference-label">${line.label}</text>`).join('')
  // Today first, so the options draw over its dashed line.
  const paths = series.map(line => {
    const d = line.points.map((point, i) => `${i ? 'L' : 'M'}${x(point.t).toFixed(1)},${y(point.v).toFixed(1)}`).join('')
    return `<path d="${d}" class="series ${line.option === 'today' ? 'today' : ''}" style="--series:${OPTIONS[line.option].color}"/>`
  }).join('')
  // Direct labels at the right end, moved apart when they are near each other.
  const ends = series.map(line => ({ option: line.option, y: y(line.points.at(-1)!.v) })).sort((a, b) => a.y - b.y)
  for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 11)
  const labels = ends.map(end => `<text x="${W - M.right + 6}" y="${end.y + 3}" class="end-label">${OPTIONS[end.option].letter === '—' ? 'Today' : OPTIONS[end.option].letter}</text>`).join('')
  // The peak of a turn chart is the finding: label peaks that are out of the flat band.
  const peaks = metric.key === 'turn' ? series.map(line => {
    const top = line.points.reduce((best, point) => point.v > best.v ? point : best, line.points[0])
    return top.v > 3 ? `<text x="${x(top.t)}" y="${Math.max(M.top + 10, y(top.v) - 6)}" class="peak-label" text-anchor="middle">${format(top.v, '°')}</text>` : ''
  }).join('') : ''
  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric.title} over time for the four options">
      <defs><clipPath id="${clip}"><rect x="${M.left}" y="${M.top}" width="${W - M.left - M.right}" height="${H - M.top - M.bottom}"/></clipPath></defs>
      ${grid}${times}${references}
      <g clip-path="url(#${clip})">${paths}</g>
      ${labels}${peaks}
      <line class="crosshair" x1="0" x2="0" y1="${M.top}" y2="${H - M.bottom}" visibility="hidden"/>
      <rect class="hit" x="${M.left}" y="${M.top}" width="${W - M.left - M.right}" height="${H - M.top - M.bottom}"/>
    </svg>
    <div class="tooltip" hidden></div>`
  const svg = host.querySelector('svg')!, hit = host.querySelector<SVGRectElement>('.hit')!
  const crosshair = host.querySelector<SVGLineElement>('.crosshair')!, tooltip = host.querySelector<HTMLDivElement>('.tooltip')!
  const show = (clientX: number) => {
    const box = svg.getBoundingClientRect()
    const t = Math.max(0, Math.min(duration, ((clientX - box.left) / box.width * W - M.left) / (W - M.left - M.right) * duration))
    const index = Math.min(series[0].points.length - 1, Math.round(t / duration * (series[0].points.length - 1)))
    crosshair.setAttribute('x1', String(x(t))); crosshair.setAttribute('x2', String(x(t)))
    crosshair.setAttribute('visibility', 'visible')
    tooltip.hidden = false
    tooltip.innerHTML = `<b>${t.toFixed(1)} s</b>${series.map(line => `<span><i style="--series:${OPTIONS[line.option].color}" class="${line.option === 'today' ? 'today' : ''}"></i>${OPTIONS[line.option].name}<output>${format(line.points[index]?.v ?? 0, metric.unit)}</output></span>`).join('')}`
    const left = (clientX - box.left) / box.width
    tooltip.style.left = `${Math.min(left * 100, 70)}%`
  }
  hit.addEventListener('pointermove', event => show(event.clientX))
  hit.addEventListener('pointerleave', () => { tooltip.hidden = true; crosshair.setAttribute('visibility', 'hidden') })
}

export function legend(options: Option[]) {
  return options.map(option => `<span><i class="${option === 'today' ? 'today' : ''}" style="--series:${OPTIONS[option].color}"></i>${OPTIONS[option].letter === '—' ? '' : `${OPTIONS[option].letter} · `}${OPTIONS[option].name}</span>`).join('')
}
