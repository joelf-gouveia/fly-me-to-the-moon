import { describe, expect, it } from 'vitest'
import adventureSource from '../../src/adventure.ts?raw'
import mainSource from '../../src/main.ts?raw'
import settingsSource from '../../src/settings.ts?raw'
import { CONTROLS, computerButtons, phoneMenuButtons, placeOf, savesSky, settingsFor, UI_OPTIONS } from './model'

const ids = (list: readonly { id: string }[]) => list.map(item => item.id)
const control = (id: string) => CONTROLS.find(item => item.id === id)!

describe('the ui simplify study', () => {
  it('counts the buttons that the screenshots of today show', () => {
    // Measured on 27 September 2026: 10 buttons on the computer screen, 8 in the phone Menu.
    expect(ids(computerButtons('today'))).toEqual(['follow-home', 'open-map', 'show-stars', 'show-orbits', 'customize-toggle', 'stickers-toggle', 'settings-toggle', 'sound-toggle', 'orbit-speed-toggle', 'pause-toggle'])
    expect(phoneMenuButtons('today')).toHaveLength(8)
  })

  it('moves the two switches of the request in every option', () => {
    for (const option of UI_OPTIONS.filter(option => option !== 'today')) {
      expect(placeOf(control('show-stars'), option)).toBe('settings')
      expect(placeOf(control('show-orbits'), option)).toBe('settings')
    }
  })

  it('makes the screen smaller with each option', () => {
    expect(UI_OPTIONS.map(option => computerButtons(option).length)).toEqual([10, 8, 7, 6])
    expect(UI_OPTIONS.map(option => phoneMenuButtons(option).length)).toEqual([8, 6, 5, 4])
  })

  it('keeps the play of the child on the screen in every option', () => {
    for (const option of UI_OPTIONS) {
      for (const id of ['follow-home', 'open-map', 'customize-toggle', 'stickers-toggle', 'settings-toggle', 'pause-toggle']) expect(placeOf(control(id), option)).toBe('screen')
    }
  })

  it('gives each moved control a row in Settings', () => {
    expect(settingsFor('today').map(section => section.id)).toEqual(['book'])
    expect(settingsFor('two').map(section => section.id)).toEqual(['sky', 'book'])
    expect(ids(settingsFor('grownup')[0].settings)).toEqual(['stars', 'orbits', 'speed'])
    expect(settingsFor('four').map(section => section.id)).toEqual(['sound', 'sky', 'help', 'book', 'credits'])
    expect(UI_OPTIONS.map(savesSky)).toEqual([false, false, true, true])
  })

  it('matches the game, which now follows option C without Guide me home', () => {
    // The code cells of CONTROLS cite the lines of 27 September 2026, before the change.
    for (const id of ['orbit-speed-toggle', 'sound-toggle', 'journey-picker', 'controls-copy', 'landscape ${world.visit}']) expect(mainSource).not.toContain(id)
    for (const id of ['follow-home', 'show-stars', 'show-orbits', 'toggle-orbits', 'hide-orbit-paths', 'sky-credits']) expect(adventureSource).not.toContain(id)
    for (const id of ['setting-sound', 'setting-stars', 'setting-orbits', 'data-speed', 'how-keys', 'sky-credits', 'fairy-settings']) expect(settingsSource).toContain(id)
    expect(settingsFor('four').map(section => section.id)).toEqual(['sound', 'sky', 'help', 'book', 'credits'])
  })
})
