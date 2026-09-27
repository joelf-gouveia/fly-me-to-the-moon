/**
 * The part of the page that the screen shows, in CSS pixels.
 * On an iPad, WebKit can show the page at a scale other than 1, for example in the
 * desktop mode of Chrome. Then 100%, 100dvh and innerWidth do not match the screen,
 * and the controls at the edges go off the screen. The visual viewport always matches
 * the screen, so the game shell, the dialogs and the renderer use it.
 */
export const view = { left: 0, top: 0, width: innerWidth, height: innerHeight }

// Open the game with ?viewport to show the measured sizes on the device.
const report = new URLSearchParams(location.search).has('viewport') ? document.createElement('pre') : null

function measure() {
  const visual = window.visualViewport
  view.left = visual?.offsetLeft ?? 0
  view.top = visual?.offsetTop ?? 0
  view.width = visual?.width ?? innerWidth
  view.height = visual?.height ?? innerHeight
  // While the screen shows the whole layout viewport, the plain CSS sizes apply:
  // they follow a resize at once, and the resize event can come one frame later.
  const root = document.documentElement
  const whole = Math.abs(view.left) + Math.abs(view.top) < 0.5
    && Math.abs(view.width - root.clientWidth) < 0.5 && Math.abs(view.height - root.clientHeight) < 0.5
  for (const [name, value] of Object.entries({ left: view.left, top: view.top, width: view.width, height: view.height })) {
    if (whole) root.style.removeProperty(`--view-${name}`)
    else root.style.setProperty(`--view-${name}`, `${value}px`)
  }
  if (report) {
    const round = (value: number) => Math.round(value * 10) / 10
    const probe = document.createElement('div')
    probe.style.cssText = 'position:fixed;width:100vw;height:100dvh;visibility:hidden'
    document.body.append(probe)
    const units = probe.getBoundingClientRect()
    probe.remove()
    report.textContent = [
      `visual  ${round(view.left)}, ${round(view.top)}  ${round(view.width)} × ${round(view.height)}  scale ${round(visual?.scale ?? 1)}`,
      `inner   ${innerWidth} × ${innerHeight}`,
      `client  ${document.documentElement.clientWidth} × ${document.documentElement.clientHeight}`,
      `100vw × 100dvh  ${round(units.width)} × ${round(units.height)}`,
      `screen  ${screen.width} × ${screen.height}  ratio ${devicePixelRatio}`,
      navigator.userAgent,
    ].join('\n')
  }
}
measure()

if (report) {
  report.style.cssText = 'position:fixed;z-index:30;left:calc(var(--view-left, 0px) + var(--view-width, 100vw) / 2);top:calc(var(--view-top, 0px) + 80px);translate:-50% 0;max-width:calc(var(--view-width, 100vw) - 32px);margin:0;padding:10px 14px;border-radius:12px;background:#000c;color:#fff;font:12px/1.5 monospace;white-space:pre-wrap;pointer-events:none'
  document.body.append(report)
  measure()
}

/** Calls onResize when the visible size changes. */
export function watchView(onResize: () => void) {
  let { width, height } = view
  function update() {
    measure()
    if (view.width === width && view.height === height) return
    ({ width, height } = view)
    onResize()
  }
  addEventListener('resize', update)
  window.visualViewport?.addEventListener('resize', update)
  window.visualViewport?.addEventListener('scroll', update)
  // After a rotation, iOS can send the resize event before the new size is ready.
  addEventListener('orientationchange', () => setTimeout(update, 250))
}
