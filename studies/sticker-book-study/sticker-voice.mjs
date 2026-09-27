// Records the sticker book lines with a neural voice. Run:
//   npm install --no-save kokoro-js @breezystack/lamejs @echogarden/espeak-ng-emscripten
//   node studies/sticker-book-study/sticker-voice.mjs [voice ...] [--lang en|pt] [--force]
// Reads LINES from studies/sticker-book-study/model.ts and writes one MP3 per line
// to public/voice/<lang>/<voice>/, plus public/voice/manifest.json. A line is
// recorded again only when its text changes, or with --force. The first run
// downloads the Kokoro-82M model (Apache-2.0, about 330 MB) from Hugging Face.
//
// Kokoro has no European Portuguese voice. For "pt", espeak-ng turns the text
// into European Portuguese phonemes, and the English voice says them.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const force = args.includes('--force')
const langArg = args.indexOf('--lang')
const langs = langArg >= 0 ? [args[langArg + 1]] : ['en', 'pt']
const voices = args.filter((arg, i) => !arg.startsWith('--') && i !== langArg + 1)
if (!voices.length) voices.push('af_heart')
// Slower than normal speech, for young listeners. The page plays faster for "Normal".
const SPEED = 0.9

let KokoroTTS, Mp3Encoder, initEspeak
try {
  ({ KokoroTTS } = await import('kokoro-js'))
  ;({ Mp3Encoder } = await import('@breezystack/lamejs'))
  ;({ default: initEspeak } = await import('@echogarden/espeak-ng-emscripten'))
} catch {
  throw new Error('Install the voice tools first: npm install --no-save kokoro-js @breezystack/lamejs @echogarden/espeak-ng-emscripten')
}

// The model imports other modules without extensions, so Vite loads it.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { LINES } = await vite.ssrLoadModule('/studies/sticker-book-study/model.ts')
await vite.close()

const labels = { af_heart: 'Heart', af_bella: 'Bella', af_nicole: 'Nicole', af_sarah: 'Sarah', am_michael: 'Michael', bf_emma: 'Emma', bf_isabella: 'Isabella', bm_george: 'George' }
const label = (voice, lang) => ({ name: labels[voice] ?? voice.slice(3, 4).toUpperCase() + voice.slice(4), accent: lang === 'pt' ? 'pt-PT' : voice.startsWith('b') ? 'UK' : 'US' })

const manifestPath = 'public/voice/manifest.json'
const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, 'utf8')) : {}
manifest.engine = 'Kokoro-82M v1.0 (onnx-community/Kokoro-82M-v1.0-ONNX, Apache-2.0) with kokoro-js; pt-PT phonemes from espeak-ng'
manifest.speed = SPEED
manifest.languages ??= {}

const espeak = new (await initEspeak()).eSpeakNGWorker()
espeak.set_voice('pt')
/**
 * European Portuguese phonemes for Kokoro. espeak-ng drops punctuation, so each
 * phrase is phonemized alone and the punctuation goes back for the intonation.
 */
function portuguesePhonemes(line) {
  return line.split(/([.,!?;:]+)/).map(part => {
    if (/^[.,!?;:]+$/.test(part)) return `${part} `
    if (!part.trim()) return ''
    return espeak.synthesize_ipa(part).ipa.replace(/_/g, '').replace(/\s+/g, ' ').trim()
      // espeak-ng puts an English ɹ in some clusters ("prego"), and an extra ə after ɾ before a consonant ("Marte").
      .replace(/ɹ/g, 'ɾ').replace(/ɾə(?=[^aeiouɐɛɔɨʊəɪɑ\s])/g, 'ɾ')
  }).join('').trim().normalize('NFD') // Kokoro knows the combining tilde, not "ũ".
}

/** Removes the quiet start and end of a clip, and keeps a short pad. */
function trim(samples, rate) {
  const loud = i => Math.abs(samples[i]) > 0.012
  let start = 0, end = samples.length - 1
  while (start < end && !loud(start)) start++
  while (end > start && !loud(end)) end--
  return samples.subarray(Math.max(0, start - Math.round(rate * 0.06)), Math.min(samples.length, end + Math.round(rate * 0.14)))
}
function mp3(samples, rate) {
  const encoder = new Mp3Encoder(1, rate, 40), pcm = new Int16Array(samples.length), chunks = []
  for (let i = 0; i < samples.length; i++) pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)))
  for (let i = 0; i < pcm.length; i += 1152) chunks.push(encoder.encodeBuffer(pcm.subarray(i, i + 1152)))
  chunks.push(encoder.flush())
  return Buffer.concat(chunks.map(chunk => Buffer.from(chunk)))
}

const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' })
async function say(line, voice, lang) {
  if (lang === 'en') return tts.generate(line, { voice, speed: SPEED })
  const { input_ids } = tts.tokenizer(portuguesePhonemes(line), { truncation: true })
  return tts.generate_from_ids(input_ids, { voice, speed: SPEED })
}

for (const lang of langs) {
  if (!LINES[lang]) throw new Error(`Unknown language: ${lang}`)
  manifest.languages[lang] ??= { voices: {} }
  for (const voice of voices) {
    await mkdir(`public/voice/${lang}/${voice}`, { recursive: true })
    const entry = manifest.languages[lang].voices[voice] ?? { ...label(voice, lang), lines: {} }
    let recorded = 0
    for (const [key, line] of Object.entries(LINES[lang])) {
      const file = `public/voice/${lang}/${voice}/${key}.mp3`
      if (!force && entry.lines[key] === line && existsSync(file)) continue
      const audio = await say(line, voice, lang)
      await writeFile(file, mp3(trim(audio.audio, audio.sampling_rate), audio.sampling_rate))
      entry.lines[key] = line
      recorded++
      if (recorded % 20 === 0) console.log(`${lang}/${voice}: ${recorded} lines`)
    }
    // Keep only the keys that the book still has.
    entry.lines = Object.fromEntries(Object.keys(LINES[lang]).filter(key => entry.lines[key]).map(key => [key, entry.lines[key]]))
    manifest.languages[lang].voices[voice] = entry
    manifest.generated = new Date().toISOString().slice(0, 10)
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`${lang}/${voice}: recorded ${recorded}, ${Object.keys(entry.lines).length} of ${Object.keys(LINES[lang]).length} lines up to date.`)
  }
}
