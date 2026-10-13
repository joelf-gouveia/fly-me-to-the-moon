import type { Feature, Kind } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { groundRail, tangentOf } from '../../feature-ideas-study/features/path'
import { overlay, pop, ramp, smooth, worldPicture } from './shared'

/**
 * F13 · Size line-up. A card in Worlds puts two worlds side by side at their real proportions.
 * The small world then makes a row across the large one, and the row counts: 4 Moons across
 * Earth, 11 Earths across Jupiter, 10 Jupiters across the Sun. The sizes in the flight of the
 * game are not real (Jupiter is 2.1 times Earth there), so the card uses the real diameters.
 */
export const DIAMETER_KM: Partial<Record<Kind, number>> = { moon: 3475, earth: 12742, jupiter: 139820, sun: 1392700 }
export const PAIRS: { small: Kind; large: Kind; smallName: string; many: string; largeName: string }[] = [
  { small: 'moon', large: 'earth', smallName: 'The Moon', many: 'Moons', largeName: 'Earth' },
  { small: 'earth', large: 'jupiter', smallName: 'Earth', many: 'Earths', largeName: 'Jupiter' },
  { small: 'jupiter', large: 'sun', smallName: 'Jupiter', many: 'Jupiters', largeName: 'the Sun' },
]
/** How many of the small world fit across the large one, to the nearest whole number. */
export const acrossCount = (small: Kind, large: Kind) => Math.round(DIAMETER_KM[large]! / DIAMETER_KM[small]!)
/** The large world is this wide on the card, in em. */
const LARGE = 15, STEP = 3.5, START = 0.8

export const sizeLineup: Feature = {
  id: 'F13',
  create(lab) {
    const { earth, meadowLocal } = lab
    lab.setRail(earth, groundRail(lab, earth, meadowLocal, tangentOf(meadowLocal, 1.1), [[-40, 0, 16], [0, 4, 15], [40, 0, 17], [80, -6, 16], [120, 0, 18]]))
    lab.setFollow(9, 3)
    const root = overlay(lab, `
      <div class="f13-card"><small>WORLDS · HOW BIG?</small>
        <div class="f13-stage"><img class="f13-small" alt=""><img class="f13-large" alt=""><div class="f13-row"></div></div>
        <div class="f13-names"><span class="f13-small-name"></span><span class="f13-large-name"></span></div>
        <p class="f13-line"></p></div>`)
    const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!
    const card = get('.f13-card'), small = get<HTMLImageElement>('.f13-small'), large = get<HTMLImageElement>('.f13-large'), row = get('.f13-row'), line = get('.f13-line')
    const pictures = new Map<Kind, string>()
    let frames = 0, pair = -1, last = -1, counted = 0

    return {
      duration: START + STEP * PAIRS.length + 0.4,
      still: START + STEP * 1.85,
      update(t) {
        if (t < last) pair = -1
        last = t
        // The pictures of the card come from the engine: each world from space, on its day side.
        if (!pictures.size && ++frames > 1) for (const kind of ['moon', 'earth', 'jupiter', 'sun'] as Kind[]) pictures.set(kind, worldPicture(lab, lab.byKind(kind), 0.97))
        pop(card, t - START)
        const index = Math.min(PAIRS.length - 1, Math.floor(Math.max(0, t - START) / STEP))
        const item = PAIRS[index], count = acrossCount(item.small, item.large)
        const size = LARGE * DIAMETER_KM[item.small]! / DIAMETER_KM[item.large]!
        if (index !== pair && pictures.size) {
          pair = index; counted = 0
          small.src = pictures.get(item.small)!; large.src = pictures.get(item.large)!
          get('.f13-small-name').textContent = item.smallName
          get('.f13-large-name').textContent = item.largeName.replace('the', 'The')
          row.innerHTML = `<img alt="" src="${pictures.get(item.small)}">`.repeat(count)
        }
        // The small world starts as large as the other one, then takes its real size.
        const age = t - START - index * STEP
        const shown = LARGE + (size - LARGE) * smooth(ramp(age, 0.25, 1.1))
        small.style.width = small.style.height = `${shown}em`
        small.style.left = '22%'
        large.style.width = large.style.height = `${LARGE}em`
        large.style.left = '68%'
        // Then a row of the small world goes across the large one, and the row counts.
        const now = Math.floor(ramp(age, 1.3, 2.7) * count + 0.001)
        row.style.left = `calc(68% - ${LARGE / 2}em)`
        ;[...row.children].forEach((child, i) => {
          const image = child as HTMLElement
          image.style.width = image.style.height = `${LARGE / count}em`
          image.style.visibility = i < now ? 'visible' : 'hidden'
        })
        if (now > counted && lab.playing) chime([440 + now * 44], 0.03)
        counted = now
        line.innerHTML = now ? `<b>${now}</b> ${item.many} across ${item.largeName}` : '&nbsp;'
      },
      dispose() {},
    }
  },
}
