import { describe, expect, it } from 'vitest'
import { newSkyNote, SKY_FACTS, SKY_NOTE, skyNoteStep } from '../src/sky-note'
import type { SkyNoteKind } from '../src/sky-note'

/** Steps of 0.1 s with the same input. */
function run(state = newSkyNote(), seconds: number, here: SkyNoteKind | null, { spark = false, flying = true, busy = false } = {}) {
  for (let t = 0; t < seconds - 1e-9; t += 0.1) skyNoteStep(state, here, spark, 0.1, flying, busy)
  return state
}

describe('the sky note', () => {
  it('shows the fact of a world after some time in its air, once in a visit', () => {
    const state = run(undefined, SKY_NOTE.wait - 0.5, 'jupiter')
    expect(state.shown).toBeNull()
    run(state, 1, 'jupiter')
    expect(state.shown).toBe('jupiter')
    run(state, SKY_NOTE.show + SKY_NOTE.fade + 0.2, 'jupiter')
    expect(state.shown).toBeNull()
    run(state, 20, 'jupiter')
    expect(state.shown).toBeNull()
  })

  it('shows the note again after a new visit, not after a short dip out of the air', () => {
    const state = run(undefined, SKY_NOTE.wait + SKY_NOTE.show + 1, 'mars')
    run(state, SKY_NOTE.again - 2, null)
    run(state, SKY_NOTE.wait + 0.5, 'mars')
    expect(state.shown).toBeNull()
    run(state, SKY_NOTE.again + 1, null)
    run(state, SKY_NOTE.wait + 0.5, 'mars')
    expect(state.shown).toBe('mars')
  })

  it('shows the note of an airless world at its first spark', () => {
    const state = run(undefined, 30, 'moon')
    expect(state.shown).toBeNull()
    run(state, 0.1, 'moon', { spark: true })
    expect(state.shown).toBe('moon')
  })

  it('waits behind a different note and behind the menus, and leaves when a different note comes', () => {
    const state = run(undefined, SKY_NOTE.wait + 1, 'neptune', { busy: true })
    expect(state.shown).toBeNull()
    expect(state.pending).toBe('neptune')
    run(state, 1, 'neptune', { flying: false })
    expect(state.shown).toBeNull()
    run(state, 0.1, 'neptune')
    expect(state.shown).toBe('neptune')
    run(state, 0.1, 'neptune', { busy: true })
    expect(state.shown).toBeNull()
    run(state, 5, 'neptune')
    expect(state.shown).toBeNull()
  })

  it('says that scientists are not sure of the lightning of Venus, and gives no numbers', () => {
    expect(SKY_FACTS.venus).toContain('Scientists are not sure')
    for (const fact of Object.values(SKY_FACTS)) expect(fact).not.toMatch(/\d/)
  })
})
