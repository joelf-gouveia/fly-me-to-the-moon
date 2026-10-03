import { describe, expect, it } from 'vitest'
import { VOICE_LANGUAGE, VOICE_NAME, voiceDelay, voiceLine, voiceSource, wordAt, wordTimes } from '../src/spoken-facts'
import { STICKERS, stickerById } from '../src/stickers'

type Manifest = { languages: Record<string, { voices: Record<string, { lines: Record<string, string> }> }> }
const manifest = Object.values(import.meta.glob<Manifest>('../public/voice/manifest.json', { eager: true, import: 'default' }))[0]
const lines = manifest.languages[VOICE_LANGUAGE].voices[VOICE_NAME].lines
// The recordings, by their path in the build.
const recordings = new Set(Object.keys(import.meta.glob('../public/voice/en/af_heart/*.mp3')).map(path => path.replace('../public', '')))

describe('spoken facts', () => {
  it('has a recording of the name and the fact of each sticker', () => {
    for (const sticker of STICKERS) {
      // A change of a fact needs a new recording (studies/sticker-book-study/sticker-voice.mjs).
      expect(lines[voiceLine(sticker.id)]).toBe(`${sticker.name}! ${sticker.fact}`)
      expect(recordings.has(voiceSource(sticker.id))).toBe(true)
    }
  })

  it('follows the base of the build', () => {
    expect(voiceSource('moon')).toBe('/voice/en/af_heart/hello-moon.mp3')
    expect(voiceSource('fairy', '/fly/')).toBe('/fly/voice/en/af_heart/hello-fairy.mp3')
  })

  it('starts the voice after the last note of the chime', () => {
    // playChime() starts a note each 0.2 s: two notes for a sticker, four for every fourth sticker.
    expect(voiceDelay(false)).toBeGreaterThan(0.2)
    expect(voiceDelay(true)).toBeGreaterThan(0.6)
  })

  it('times the words of the Moon line near the measured parts of the recording', () => {
    // The parts from the loudness of hello-moon.mp3 (3.67 s): the name, then two sentences.
    const fact = stickerById('moon').fact.split(' ')
    const times = wordTimes('Moon', fact, 3.67)
    expect(times).toHaveLength(1 + fact.length)
    expect(times[0].start).toBeCloseTo(0.08, 2)
    expect(times[0].end).toBeCloseTo(0.58, 0)
    expect(times[1].start).toBeCloseTo(0.66, 0)
    expect(times[6].start).toBeCloseTo(2.36, 0)
    expect(times.at(-1)!.end).toBeCloseTo(3.52, 1)
  })

  it('keeps the words in order, with no overlap, inside the line', () => {
    for (const sticker of STICKERS) {
      const times = wordTimes(sticker.name, sticker.fact.split(' '), 5)
      times.forEach((word, index) => {
        expect(word.end).toBeGreaterThan(word.start)
        if (index) expect(word.start).toBeGreaterThanOrEqual(times[index - 1].end)
      })
      expect(times[0].start).toBeGreaterThan(0)
      expect(times.at(-1)!.end).toBeLessThan(5)
    }
  })

  it('gives a longer time to a longer word', () => {
    const [, short, long] = wordTimes('Sun', ['on', 'asteroid'], 3)
    expect(long.end - long.start).toBeGreaterThan(short.end - short.start)
  })

  it('lights no word before the file loads', () => {
    expect(wordTimes('Moon', ['Hello.'], NaN).every(word => word.start === Infinity)).toBe(true)
    expect(wordAt(wordTimes('Moon', ['Hello.'], NaN), 1)).toBe(-1)
  })

  it('finds the word that the voice says', () => {
    const times = wordTimes('Moon', stickerById('moon').fact.split(' '), 3.67)
    expect(wordAt(times, 0)).toBe(-1)
    expect(wordAt(times, 0.2)).toBe(0)
    expect(wordAt(times, (times[3].start + times[3].end) / 2)).toBe(3)
    // A word stays lit through a short pause after it.
    expect(wordAt(times, times[0].end + 0.05)).toBe(0)
    expect(wordAt(times, 4)).toBe(-1)
  })
})
