import type { Feature } from '../../feature-ideas-study/lab'
import { chime } from '../../feature-ideas-study/features/sound'
import { createCreature } from '../../../src/creatures/models'
import type { Species } from '../../../src/creatures/habitat'
import { creaturePass, overlay, pop, portrait } from './shared'

/**
 * F11 · Animal book. The first hello to a kind of animal puts its card in a book. The card has
 * a picture of the animal from the engine, its name, and three picture facts that need no
 * reading. The book of Earth has four animals; the book of Blossom Haven has five story creatures.
 */
const ANIMALS: Species[] = ['cow', 'rabbit', 'sheep', 'duck']
export const ANIMAL_CARDS: Record<Species, { name: string; icons: string[]; line: string }> = {
  cow: { name: 'Cow', icons: ['🌿', '🥛', '🏡'], line: 'A cow eats grass and gives milk.' },
  rabbit: { name: 'Rabbit', icons: ['🥕', '👂', '🕳️'], line: 'A rabbit hops and lives in a burrow.' },
  sheep: { name: 'Sheep', icons: ['🌿', '🧶', '🏡'], line: 'A sheep eats grass and gives wool.' },
  duck: { name: 'Duck', icons: ['💧', '🥚', '🪶'], line: 'A duck swims and lays eggs.' },
}
/** The book of the clip has the duck already. */
const KNOWN: Species[] = ['duck']
const PASS = 6.2, HELLO_DISTANCE = 6.5

export const animalBook: Feature = {
  id: 'F11',
  create(lab) {
    const { earth } = lab
    const pass = creaturePass(lab, earth, ['sheep', 'cow', 'rabbit'], PASS, { view: 8.2 })
    const card = ANIMAL_CARDS[pass.kind]
    const root = overlay(lab, `
      <div class="lp-card f11-card"><img alt=""><div><small>NEW IN YOUR ANIMAL BOOK</small><h2>${card.name}</h2><div class="lp-icons">${card.icons.map(icon => `<span>${icon}</span>`).join('')}</div><span class="lp-pill">REAL ANIMAL</span></div></div>
      <div class="lp-strip"><div class="lp-strip-title"><small>ANIMAL BOOK</small><b id="f11-count"></b></div>${ANIMALS.map(kind => `<div class="lp-slot is-empty" data-kind="${kind}"><img alt=""></div>`).join('')}</div>`)
    const note = root.querySelector<HTMLElement>('.f11-card')!, count = root.querySelector<HTMLElement>('#f11-count')!
    const slots = new Map(ANIMALS.map(kind => [kind, root.querySelector<HTMLElement>(`[data-kind="${kind}"]`)!]))
    let pictures = false, foundAt = -1, last = -1, frames = 0

    return {
      duration: 10.5,
      still: PASS + 0.9,
      update(t, delta) {
        if (t < last) { foundAt = -1; pass.restart() }
        last = t
        // The pictures of the book come from the creature models of the game.
        if (!pictures && ++frames > 1) {
          pictures = true
          for (const kind of ANIMALS) {
            const model = createCreature(kind, false)
            model.animate(0, false, { details: true, tails: true, motion: false })
            const picture = portrait(lab, model.root, kind === 'duck' ? 0xcfeaf5 : 0xe4f3cf)
            model.dispose()
            slots.get(kind)!.querySelector('img')!.src = picture
            if (kind === pass.kind) note.querySelector('img')!.src = picture
          }
        }
        earth.creatures?.greet(delta, lab.fairy.position)
        if (foundAt < 0 && pass.distance(t) < HELLO_DISTANCE) {
          foundAt = t
          chime([659.25, 783.99, 1046.5], 0.05)
        }
        const age = foundAt < 0 ? -1 : t - foundAt
        pop(note, age, 3.4)
        const known = new Set<Species>(age > 0.5 ? [...KNOWN, pass.kind] : KNOWN)
        for (const [kind, slot] of slots) {
          slot.classList.toggle('is-empty', !known.has(kind))
          slot.classList.toggle('is-full', known.has(kind))
          slot.style.transform = kind === pass.kind && age > 0.5 && age < 1 ? `scale(${1 + Math.sin((age - 0.5) * Math.PI * 2) * 0.25})` : ''
        }
        count.textContent = `${known.size} of ${ANIMALS.length}`
      },
      dispose() {},
    }
  },
}
