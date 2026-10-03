import type { StickerId } from './stickers'

// Spoken facts (F2 of docs/feature-ideas-study.md): a new sticker plays its recorded hello
// line, a moment after the chime. The lines are in public/voice/ (docs/sticker-book-study.md).
// The game speaks English only. The Portuguese lines stay in the sticker book study.
export const VOICE_LANGUAGE = 'en'
export const VOICE_NAME = 'af_heart'
/** The voice starts after the chime notes, so the two do not overlap (0.2 s for each note). */
export const voiceDelay = (milestone: boolean) => milestone ? 0.9 : 0.5

/** The key of the hello line in public/voice/manifest.json. */
export const voiceLine = (id: StickerId) => `hello-${id}`
/** The path of the recording. The base is import.meta.env.BASE_URL, so a build in a sub-folder works. */
export const voiceSource = (id: StickerId, base = '/') => `${base}voice/${VOICE_LANGUAGE}/${VOICE_NAME}/${voiceLine(id)}.mp3`

/** The silence before the first word and after the last word of a recording, in seconds. */
const LEAD = 0.08, TAIL = 0.15
/** The voice says the name slowly, as an exclamation ("Moon!"). */
const NAME_STRETCH = 1.6
/** The pause after a sentence and after a comma, in letters. */
const SENTENCE_PAUSE = 4, COMMA_PAUSE = 2
/** A word stays lit for a short time after its end, through the pause after it. */
const HOLD = 0.25

export type WordTime = { start: number; end: number }

/**
 * The time of each word of a hello line: first the name, then each word of the fact.
 * The line says "Name! Fact.", so a pause follows the name and each sentence. Each word
 * gets a share of the time by its letters, plus one. The loudness of the hello-moon
 * recording gave the constants (studies/feature-ideas-study/features/f2-spoken-facts.ts).
 */
export function wordTimes(name: string, words: string[], duration: number): WordTime[] {
  if (!(duration > LEAD + TAIL)) return [name, ...words].map(() => ({ start: Infinity, end: Infinity }))
  const letters = (word: string) => word.replace(/[^\p{L}]/gu, '').length + 1
  const pause = (word: string) => /[.!?]$/.test(word) ? SENTENCE_PAUSE : /[,;:]$/.test(word) ? COMMA_PAUSE : 0
  const spoken = [letters(name) * NAME_STRETCH, ...words.map(letters)]
  const after = [SENTENCE_PAUSE, ...words.map((word, index) => index < words.length - 1 ? pause(word) : 0)]
  const total = spoken.reduce((sum, weight, index) => sum + weight + after[index], 0)
  const unit = (duration - LEAD - TAIL) / total
  let at = LEAD
  return spoken.map((weight, index) => {
    const word = { start: at, end: at + weight * unit }
    at = word.end + after[index] * unit
    return word
  })
}

/** The word that the voice says at a time of the line, or -1 before the first word and after the last. */
export function wordAt(times: WordTime[], time: number) {
  for (let index = times.length - 1; index >= 0; index--) {
    if (time >= times[index].start) return time < times[index].end + HOLD ? index : -1
  }
  return -1
}

/**
 * The voice of the game: one audio element, so two lines never play at the same time.
 * `allowed` is the Sound switch of Settings, with no pause and a visible page.
 */
export function createSpokenFacts(base: string, allowed: () => boolean) {
  let player: HTMLAudioElement | null = null
  let line: string | null = null, playing = false, timer = 0, turn = 0
  const audio = () => {
    if (player) return player
    player = new Audio()
    player.preload = 'auto'
    player.addEventListener('ended', () => { line = null; playing = false })
    player.addEventListener('error', () => { if (player!.getAttribute('src')) { line = null; playing = false } })
    return player
  }
  function stop() {
    turn++
    clearTimeout(timer)
    line = null; playing = false
    if (player && !player.paused) player.pause()
  }
  return {
    /**
     * Says the hello line of a sticker after a delay in seconds. A new line stops the line
     * before it. Gives false when the sound is off: then the note shows only the words.
     */
    say(id: StickerId, delay: number) {
      stop()
      if (!allowed()) return false
      const element = audio(), mine = turn
      line = voiceLine(id)
      // Load the line during the delay.
      element.muted = false
      element.src = voiceSource(id, base)
      timer = window.setTimeout(() => {
        if (mine !== turn) return
        if (!allowed()) { stop(); return }
        playing = true
        element.currentTime = 0
        element.play().catch(() => { if (mine === turn) { line = null; playing = false } })
      }, delay * 1000)
      return true
    },
    stop,
    /**
     * Call this in the tap on the Sound switch. A phone (iOS) plays an audio element
     * only after it played once in a tap, so the element plays the first line muted.
     */
    unlock() {
      if (line) return
      const element = audio()
      element.muted = true
      element.src = voiceSource('earth', base)
      element.play().then(() => { if (!line) element.pause() }).catch(() => {}).finally(() => { element.muted = false })
    },
    /** The key of the line that plays or waits for its delay, for example "hello-moon", or null. */
    get line() { return line },
    /** The time in the line in seconds, or -1 before the voice starts. */
    get time() { return playing && player ? player.currentTime : -1 },
    /** The length of the line in seconds, or NaN before the file loads. */
    get duration() { return player && line ? player.duration : NaN },
  }
}

export type SpokenFacts = ReturnType<typeof createSpokenFacts>
