/** Lower pixel cost before changing the world's terrain/collision geometry. */
export function createMobileQuality() {
  let scale = 1.25, seconds = 0, frames = 0, fastWindows = 0
  return {
    ratio(width: number, height: number, deviceRatio: number) {
      return Math.min(deviceRatio, scale, Math.sqrt(1_500_000 / Math.max(1, width * height)))
    },
    sample(delta: number, active: boolean) {
      if (!active || delta <= 0 || delta > 0.25) { seconds = 0; frames = 0; fastWindows = 0; return false }
      seconds += delta; frames++
      if (seconds < 2) return false
      const fps = frames / seconds
      const previous = scale
      if (fps < 55) { scale = Math.max(0.65, scale - 0.15); fastWindows = 0 }
      else if (fps >= 59) {
        if (++fastWindows >= 4) { scale = Math.min(1.25, scale + 0.1); fastWindows = 0 }
      } else fastWindows = 0
      seconds = 0; frames = 0
      return scale !== previous
    },
  }
}
