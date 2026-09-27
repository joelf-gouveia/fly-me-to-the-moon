import { MathUtils, Vector3 } from 'three'

export type NightStyle = 'gentle' | 'deep'
export const presets = [
  { name: 'Dawn', hour: 6.5, note: 'Peach light arrives at the horizon. The garden slowly regains its color.' },
  { name: 'Noon', hour: 12, note: 'A bright, familiar garden. Short shadows, clear colors, and a soft blue sky.' },
  { name: 'Sunset', hour: 17.5, note: 'Warm light grazes the candy trees. Shadows stretch and the cottage begins to glow.' },
  { name: 'Night', hour: 0, note: 'A blue-lilac garden under the stars. The fairy, paths, and home stay easy to find.' },
] as const

/** World-space vectors: valid at any latitude and after spin, orbit, or relocation. */
export function solarElevation(position: Vector3, center: Vector3, sun: Vector3) {
  const up = position.clone().sub(center).normalize()
  const toSun = sun.clone().sub(position).normalize()
  return Math.asin(MathUtils.clamp(up.dot(toSun), -1, 1)) * 180 / Math.PI
}

export function lightingAtElevation(elevation: number, style: NightStyle) {
  const day = MathUtils.smoothstep(elevation, -6, 14)
  const direct = MathUtils.smoothstep(elevation, -1, 8)
  const twilight = (1 - MathUtils.smoothstep(Math.abs(elevation), 0, 22)) * MathUtils.smoothstep(elevation, -12, -2)
  const night = 1 - day
  return {
    elevation, day, night, twilight,
    sunIntensity: 3 * direct,
    ambientIntensity: MathUtils.lerp(style === 'gentle' ? 0.85 : 0.22, 2.1, day),
    fillIntensity: (style === 'gentle' ? 0.45 : 0.08) * night,
    stars: 1 - MathUtils.smoothstep(elevation, -14, -3),
    windowGlow: MathUtils.lerp(1.6, 0.12, day),
  }
}

/** Review clock only: equatorial, zero-tilt illustration of one solar day. */
export function sampleHour(hour: number, style: NightStyle) {
  const angle = (hour - 12) / 24 * Math.PI * 2
  const sunDirection = new Vector3(-Math.sin(angle) * 0.85, Math.cos(angle), -Math.sin(angle) * Math.sqrt(1 - 0.85 ** 2))
  const elevation = Math.asin(MathUtils.clamp(sunDirection.y, -1, 1)) * 180 / Math.PI
  return { ...lightingAtElevation(elevation, style), angle, sunDirection }
}

export function advanceHour(hour: number, delta: number, secondsPerDay: number) {
  return ((hour + Math.max(0, delta) / secondsPerDay * 24) % 24 + 24) % 24
}
