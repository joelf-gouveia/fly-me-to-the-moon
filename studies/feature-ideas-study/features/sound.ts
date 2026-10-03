/**
 * The sound of the study. It plays only after the Sound button of the page, as the game
 * plays only after the Sound switch of Settings (setSound() in src/main.ts).
 *
 * A clip has no sound track. The capture records each sound call with its clip time in a
 * cue list (<id>.cues.json), and the page plays the cues again in step with the clip.
 */
export type Cue =
  | { t: number; type: 'chime'; notes: number[]; level: number }
  | { t: number; type: 'voice'; src: string }
  | { t: number; type: 'hum'; notes: number[] | null; glide: number }

let context: AudioContext | null = null
let output: GainNode | null = null
let on = false
let clock: () => number = () => 0
let recording: Cue[] | null = null

export function soundOn() { return on }
export async function setSoundOn(value: boolean) {
  if (!context) {
    context = new AudioContext()
    output = context.createGain()
    output.gain.value = 0.9
    output.connect(context.destination)
  }
  on = value
  if (on) await context.resume().catch(() => {})
  else { stopVoice(); setHumNow(null, 0.2); await context.suspend().catch(() => {}) }
  return on
}
function audio() { return on && context && output ? { context, output } : null }

/** The lab gives its clip time, for the cue list. */
export function setClock(next: () => number) { clock = next }
export function startRecording() { recording = [] }
export function takeRecording() { const cues = recording ?? []; recording = null; return cues }
function record(cue: Cue) { recording?.push(cue) }

/** The chime of playChime() in src/main.ts. */
export function chime(notes: number[], level = 0.055) {
  record({ t: clock(), type: 'chime', notes, level })
  const sound = audio()
  if (!sound) return
  const { context, output } = sound
  const now = context.currentTime
  for (const [index, frequency] of notes.entries()) {
    const tone = context.createOscillator(), gain = context.createGain()
    tone.frequency.value = frequency
    gain.gain.setValueAtTime(0, now + index * 0.2)
    gain.gain.linearRampToValueAtTime(level, now + index * 0.2 + 0.08)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.2 + 1.1)
    tone.connect(gain).connect(output)
    tone.start(now + index * 0.2); tone.stop(now + index * 0.2 + 1.2)
    tone.onended = () => { tone.disconnect(); gain.disconnect() }
  }
}

/** A recorded line of public/voice/ (F2). A path from `/` follows the base of the build, so a copy in a sub-folder works. */
let player: HTMLAudioElement | null = null
const resolve = (src: string) => src.startsWith('/') ? import.meta.env.BASE_URL + src.slice(1) : src
export function voice(src: string) {
  record({ t: clock(), type: 'voice', src })
  if (!on) return
  player ??= new Audio()
  player.src = resolve(src)
  void player.play().catch(() => {})
}
export function stopVoice() { player?.pause() }

/** The soft hum of createAmbience() in src/main.ts: three notes that glide to a new chord (F6). */
let hum: { tones: OscillatorNode[]; gains: GainNode[] } | null = null
export function setHum(notes: number[] | null, glide = 1.5) {
  record({ t: clock(), type: 'hum', notes, glide })
  setHumNow(notes, glide)
}
function setHumNow(notes: number[] | null, glide: number) {
  const sound = audio()
  if (!sound) return
  const { context, output } = sound
  const now = context.currentTime
  if (!notes) {
    hum?.gains.forEach(gain => gain.gain.setTargetAtTime(0, now, 0.2))
    return
  }
  if (!hum) {
    hum = { tones: [], gains: [] }
    notes.forEach((frequency, index) => {
      const tone = context.createOscillator(), gain = context.createGain()
      tone.type = index === 0 ? 'sine' : 'triangle'
      tone.frequency.value = frequency
      gain.gain.value = 0
      tone.connect(gain).connect(output)
      tone.start()
      hum!.tones.push(tone); hum!.gains.push(gain)
    })
  }
  hum.tones.forEach((tone, index) => tone.frequency.setTargetAtTime(notes[index] ?? notes[0], now, glide / 3))
  // The levels of createAmbience(), louder, so a laptop speaker plays them.
  hum.gains.forEach((gain, index) => gain.gain.setTargetAtTime(0.05 / (index + 1), now, 0.3))
}

/** Plays one cue of a clip again (the page, in step with the video). */
export function playCue(cue: Cue) {
  if (cue.type === 'chime') chimeNow(cue.notes, cue.level)
  else if (cue.type === 'voice') { if (on) { player ??= new Audio(); player.src = resolve(cue.src); void player.play().catch(() => {}) } }
  else setHumNow(cue.notes, cue.glide)
}
function chimeNow(notes: number[], level: number) {
  const saved = recording
  recording = null
  chime(notes, level)
  recording = saved
}
/** Stops the voice and the hum, when a clip stops or starts again. */
export function silence() { stopVoice(); setHumNow(null, 0.2) }
