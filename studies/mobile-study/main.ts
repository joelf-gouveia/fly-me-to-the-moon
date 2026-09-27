import './style.css'
import reportUrl from '../../docs/mobile-compatibility-study.md?url'
import playGuideUrl from '../../docs/mobile-play.md?url'

type Question = { id: string; title: string; why: string; options?: string[]; placeholder?: string }
const groups: { title: string; note: string; questions: Question[] }[] = [
  { title: 'The hands holding the world', note: 'Start here. These answers set the actual support target.', questions: [
    { id: 'devices', title: '01 / Which phone and which iPad?', why: 'Model, OS version and Chrome version matter more than screen size alone. Include the oldest device you want supported.', placeholder: 'Phone: … / OS: …\niPad: … / iPadOS: …\nChrome versions, if known: …' },
    { id: 'players', title: '02 / Who is flying?', why: 'Small hands, experience and access needs affect button size, wording and steering precision.', placeholder: 'Adults or children (rough ages)? Any difficulty with holding buttons, small text, motion or using two hands?' },
    { id: 'orientation', title: '03 / How should you hold it?', why: 'The original layout lost steering in landscape. Both orientations now have touch controls and scrollable panels.', options: ['Both orientations (recommended)', 'Landscape is enough', 'Portrait is enough'] },
    { id: 'grip', title: '04 / How will you play?', why: 'A tablet resting on a table needs a different reach than a phone held with two thumbs.', options: ['Two hands / thumbs', 'One hand', 'Tablet on a stand or table', 'A mix; let me move the controls'] },
  ] },
  { title: 'What should flying feel like?', note: 'Choose a direction for a future playable touch prototype.', questions: [
    { id: 'steering', title: '05 / How would you like to steer?', why: 'The game already cruises automatically and follows planets. A joystick would need tuning; arrows are the smallest change.', options: ['Keep the four arrows (recommended first step)', 'A thumb joystick for climb and turn', 'Mostly tap destinations and let her fly', 'Let me compare arrows and a joystick first'] },
    { id: 'boost', title: '06 / How should faster flight work?', why: 'A held Boost button now joins the Shift key. It changes both speed and the fairy’s pose.', options: ['Hold a boost button', 'Tap to toggle fast / normal', 'Automatic speed is enough; omit manual boost'] },
    { id: 'hover', title: '07 / Do you want to stop in mid-air?', why: 'Hover / Fly now has its own touch button. Hover and pausing the whole game are different actions.', options: ['A separate hover toggle', 'Pause is enough', 'Try both before deciding'] },
    { id: 'interface', title: '08 / What should stay on screen?', why: 'More labels help discovery but cover the scenery on a phone. Worlds, pause and customization must stay reachable.', options: ['Minimal controls; details in a menu (recommended)', 'Keep the current information visible', 'Large, labelled controls even if they cover more scenery'] },
  ] },
  { title: 'What does “works” mean to you?', note: 'These choices separate basic browser play from extra product work.', questions: [
    { id: 'quality', title: '09 / When visuals and smoothness compete?', why: 'Mobile play now uses simpler scenery and adaptive resolution. Frame rates are targets for device measurement, not guarantees.', options: ['Consistent 30+ fps with lower detail if needed (recommended)', 'Aim for 60 fps, even with simpler scenery', 'Preserve the current visuals; accept slower devices'] },
    { id: 'session', title: '10 / How long is a normal session?', why: 'A quick loading check cannot reveal heat, battery use or repeated travel problems.', options: ['5–10 minutes', '15–30 minutes', 'An hour or more'] },
    { id: 'access', title: '11 / Where do you want to open the game?', why: 'A localhost address only works on the computer running it. A shared browser link needs hosting.', options: ['A private link on my home Wi-Fi', 'A web link available away from home', 'A public link for friends and family'] },
    { id: 'offline', title: '12 / Is internet access okay?', why: 'There is no offline cache or installable app setup today. Ordinary browser play can ship first.', options: ['Online browser tab is enough (recommended)', 'Also add a home-screen shortcut', 'It must work offline after the first visit'] },
    { id: 'progress', title: '13 / What should survive closing the tab?', why: 'Today, appearance and home discovery are saved locally. Flight position is reset, and saves do not sync to another device.', options: ['Current appearance and discovery are enough', 'Resume where I was flying on this device', 'Share my progress between phone and iPad'] },
    { id: 'return', title: '14 / When you switch apps and come back?', why: 'Simulation already stops while the page is hidden. Mobile audio and interrupted touches still need device testing.', options: ['Stay paused until I tap resume (recommended)', 'Resume flying automatically', 'Ask me when I return'] },
    { id: 'notes', title: 'Anything that would make this frustrating?', why: 'For example: needing two fingers, a hot phone, tiny buttons, motion sickness, or a device you cannot upgrade.', placeholder: 'Your non-negotiables, preferences, or unanswered questions…' },
  ] },
]
const questions = groups.flatMap(group => group.questions)
const storageKey = 'fairy-mobile-study-v1'
const answers: Record<string, string> = {}
let storageAvailable = true
try {
  const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '{}')
  if (saved && typeof saved === 'object') for (const q of questions) {
    const value = (saved as Record<string, unknown>)[q.id]
    if (typeof value === 'string' && (!q.options || q.options.includes(value))) answers[q.id] = value
  }
} catch { storageAvailable = false }

document.querySelector<HTMLDivElement>('#mobile-study')!.innerHTML = `
  <main>
    <nav class="masthead"><a href="./">← Back to the game</a><span>FIELD STUDY <b>05</b> / MOBILE PLAY</span><a href="#questions">Your brief ↗</a></nav>
    <header class="intro"><div><p class="eyebrow">FLY ME TO THE MOON · PHONE & iPAD</p><h1>A little world,<br><em>in your hands.</em></h1></div><div class="intro-note"><span class="edition">COMPATIBILITY REVIEW / 26 SEP 2026</span><p>The browser is a good home for this game.<br>The touch experience is ready for your device trial.</p><a class="text-link" href="${reportUrl}">Read the technical study ↗</a></div></header>
    <section class="verdict" aria-labelledby="verdict-title"><span class="status-dot"></span><div><p class="eyebrow">IMPLEMENTATION UPDATE</p><h2 id="verdict-title">Your mobile brief is now in the game.</h2><p>Four arrows, held Boost, Hover / Fly, a compact menu, both orientations, and explicit resume after switching apps. Mobile graphics adjust toward a 60 fps target. Real-device speed, long sessions and Apple-browser behavior still need checking. <a href="${playGuideUrl}">Read the play guide ↗</a></p></div><span class="verdict-stamp">IMPLEMENTED<br><b>DEVICE TESTS NEXT</b></span></section>
    <section class="layout-study" aria-labelledby="layout-title"><div class="layout-copy"><p class="eyebrow">01 / SEE THE GAP</p><h2 id="layout-title">Same journey.<br>Different-sized hands.</h2><p>Switch the screen size. The original layout hid the arrows based on width alone. Compare that baseline with the implemented touch availability.</p><div class="device-presets" aria-label="Preview size"><button type="button" data-device="390,844" aria-pressed="true">Phone</button><button type="button" data-device="844,390" aria-pressed="false">Phone ↔</button><button type="button" data-device="820,1180" aria-pressed="false">iPad</button><button type="button" data-device="1180,820" aria-pressed="false">iPad ↔</button></div><label for="preview-width">Screen width <output id="width-label">390 CSS px</output></label><input id="preview-width" type="range" min="320" max="1366" value="390" step="1"><label class="proposal-toggle"><input id="proposed" type="checkbox"> Show implemented touch availability</label><p class="preview-note" id="preview-note" aria-live="polite"></p><p class="fine">Schematic only. This is a layout comparison, not a playable control or a performance test.</p></div>
      <div class="preview-stage"><div class="screen" id="screen"><div class="screen-sky"><span class="star one">✧</span><span class="star two">✦</span><span class="moon"></span><span class="planet"></span><span class="fairy">✧</span></div><div class="screen-top"><span>EARTH<br><b>Over the meadows</b></span><span>Ⅱ</span></div><div class="screen-message" id="screen-message"></div><div class="mock-arrows" id="mock-arrows" aria-hidden="true"><span>↑</span><span>←</span><span>↓</span><span>→</span></div><div class="screen-bottom"><span>◉ Worlds</span><span>✿ Your fairy</span></div></div><div class="preview-caption"><span id="preview-mode">ORIGINAL LAYOUT</span><span id="preview-size">390 × 844</span></div></div>
    </section>
    <section class="findings" aria-label="Compatibility findings"><article><span class="finding-tag ready">ALREADY THERE</span><h3>A useful foundation</h3><p>Touch arrow events, tap-friendly menus, resize handling, user-started sound, and local appearance saves are already implemented.</p></article><article><span class="finding-tag ready">NOW IMPLEMENTED</span><h3>Controls at every size</h3><p>Touch steering follows input capability. Boost and hover are on the right, with details in Menu. The welcome card now scrolls on short screens.</p></article><article><span class="finding-tag verify">NEEDS DEVICE TESTS</span><h3>Chrome has two paths</h3><p>Chrome on Apple mobile devices uses WebKit; Android Chrome uses Blink. Desktop phone emulation cannot establish iPad compatibility.</p><a href="https://www.chromium.org/developers/design-documents/profile-architecture/">Chromium architecture ↗</a></article></section>
    <section id="questions" class="question-section"><div class="question-heading"><div><p class="eyebrow">02 / YOUR TURN</p><h2>Let’s make the right<br><em>small-screen game.</em></h2><p>Answer what you know. Leave anything undecided.<br>Recommendations are suggestions, never preselected answers.</p></div><div class="progress"><strong id="answered">0 / 14</strong><span>decisions answered</span><progress id="completion" max="14" value="0" aria-label="Decisions answered"></progress></div></div>
    <form id="brief-form">${groups.map((group, index) => `<section class="question-group"><div class="group-heading"><span>0${index + 1}</span><div><h3>${group.title}</h3><p>${group.note}</p></div></div><div class="question-grid">${group.questions.map(q => `<fieldset><legend>${q.title}</legend><p id="help-${q.id}">${q.why}</p>${q.options ? `<div class="choices">${q.options.map((option, i) => `<label><input type="radio" name="${q.id}" value="${i}" aria-describedby="help-${q.id}"><span>${option}</span></label>`).join('')}</div><button type="button" class="clear-answer" data-clear="${q.id}">Leave undecided</button>` : `<textarea name="${q.id}" rows="3" placeholder="${q.placeholder}" aria-describedby="help-${q.id}"></textarea>`}</fieldset>`).join('')}</div></section>`).join('')}</form>
    <section class="export-panel"><div><p class="eyebrow">03 / TAKE YOUR BRIEF WITH YOU</p><h2>Your answers, ready to share.</h2><p id="save-status" role="status"></p><p>Download the brief and share its text in our conversation. Nothing is sent automatically.</p></div><div class="export-actions"><button type="button" id="download" class="primary">Download answers ↓</button><button type="button" id="copy">Copy answers</button><a href="${reportUrl}">Technical study ↗</a></div><details><summary>Preview your brief</summary><pre id="brief-preview"></pre></details></section></section>
    <section class="device-check"><div><p class="eyebrow">OPTIONAL / OPEN THIS ON YOUR DEVICE</p><h2>A quick capability check.</h2><p>Checks WebGL 2, touch input and viewport size in this browser. It cannot certify game performance, comfortable controls or audio recovery.</p></div><div><button type="button" id="check">Check this browser</button><output id="device-result" aria-live="polite">No check run yet.</output></div></section>
    <footer><span>FLY ME TO THE MOON / DESIGN NOTE 05</span><span>Research + questionnaire · Mobile controls implemented</span></footer>
  </main>`

const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const form = get<HTMLFormElement>('#brief-form')
for (const q of questions) {
  if (!answers[q.id]) continue
  if (q.options) {
    const radio = form.querySelector<HTMLInputElement>(`[name="${q.id}"][value="${q.options.indexOf(answers[q.id]!)}"]`)
    if (radio) radio.checked = true
  } else form.querySelector<HTMLTextAreaElement>(`[name="${q.id}"]`)!.value = answers[q.id]!
}
let deviceReport = ''
function brief() {
  return `# Fly me to the moon — Mobile brief\n\nStudy: 2026-09-26. Answers describe preferences; editing this form does not change gameplay.\n\n${questions.map(q => `## ${q.title}\n${answers[q.id]?.trim() || 'Undecided'}\n`).join('\n')}\n## Browser capability check\n${deviceReport || 'Not run; real-device testing remains required.'}\n`
}
function updateBrief() {
  const answered = questions.filter(q => q.id !== 'notes' && answers[q.id]?.trim()).length
  get('#answered').textContent = `${answered} / 14`
  get<HTMLProgressElement>('#completion').value = answered
  get('#brief-preview').textContent = brief()
  get('#save-status').textContent = storageAvailable ? 'Answers are saved in this browser on this site.' : 'Browser storage is unavailable. Download or copy your answers before leaving.'
}
form.addEventListener('submit', event => event.preventDefault())
form.addEventListener('input', event => {
  const field = event.target
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return
  const q = questions.find(q => q.id === field.name)
  if (!q) return
  answers[q.id] = q.options ? q.options[Number(field.value)]! : field.value
  save()
})
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(answers)); storageAvailable = true } catch { storageAvailable = false }
  updateBrief()
}
document.querySelectorAll<HTMLButtonElement>('[data-clear]').forEach(button => button.addEventListener('click', () => {
  const id = button.dataset.clear!
  delete answers[id]
  form.querySelectorAll<HTMLInputElement>(`[name="${id}"]`).forEach(radio => { radio.checked = false })
  save()
}))
get('#download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([brief()], { type: 'text/markdown;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url; link.download = 'mobile-play-brief.md'; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
get('#copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(brief()); get('#save-status').textContent = 'Copied. Paste your brief into our conversation.' }
  catch {
    get<HTMLDetailsElement>('.export-panel details').open = true
    const selection = window.getSelection(), range = document.createRange()
    range.selectNodeContents(get('#brief-preview')); selection?.removeAllRanges(); selection?.addRange(range)
    get('#save-status').textContent = 'Automatic copy is unavailable here. Copy the selected brief below, or use Download answers.'
  }
})
let width = 390, height = 844
function preview() {
  const proposed = get<HTMLInputElement>('#proposed').checked
  const visible = proposed || width <= 720
  get('#screen').style.aspectRatio = `${width} / ${height}`
  get('#screen').classList.toggle('landscape', width > height)
  get('#mock-arrows').hidden = !visible
  get('#screen-message').textContent = visible ? 'A way to steer' : 'Where did the arrows go?'
  get('#width-label').textContent = `${width} CSS px`
  get('#preview-size').textContent = `${width} × ${height}`
  get('#preview-mode').textContent = proposed ? 'IMPLEMENTED · TOUCH DEVICE' : 'ORIGINAL LAYOUT'
  get('#preview-note').textContent = proposed ? 'Implemented: touch controls follow input capability, with an explicit layout option for mixed input devices.' : visible ? 'Original layout: this width was within the 720 px breakpoint. Boost and hover were keyboard-only.' : 'Original layout: above 720 px, the arrows disappeared. Guided world travel was available but manual touch steering was missing.'
  document.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.device === `${width},${height}`)))
}
document.querySelectorAll<HTMLButtonElement>('[data-device]').forEach(button => button.addEventListener('click', () => {
  const dimensions = button.dataset.device!.split(',').map(Number)
  width = dimensions[0]!; height = dimensions[1]!
  get<HTMLInputElement>('#preview-width').value = String(width); preview()
}))
get('#preview-width').addEventListener('input', event => { width = Number((event.target as HTMLInputElement).value); preview() })
get('#proposed').addEventListener('change', preview)
get('#check').addEventListener('click', () => {
  let webgl = false
  try {
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2')
    webgl = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { /* A failed context is a useful diagnostic result. */ }
  deviceReport = `WebGL 2: ${webgl ? 'available' : 'unavailable'}\nTouch points: ${navigator.maxTouchPoints}\nCoarse pointer: ${matchMedia('(any-pointer: coarse)').matches ? 'yes' : 'no'}\nViewport: ${innerWidth} × ${innerHeight} CSS px\nPixel ratio: ${devicePixelRatio}\nBrowser: ${navigator.userAgent}\nCapability check only; no gameplay or frame-rate certification.`
  get('#device-result').textContent = deviceReport
  updateBrief()
})
preview()
updateBrief()
