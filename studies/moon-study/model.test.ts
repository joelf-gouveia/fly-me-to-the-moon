import { describe, expect, it } from 'vitest'
import {
  BOOST_SPEED, budget, clearances, darkFullMoons, EARTHSHINE, eclipseOrbit, eclipseSchedule, earthPosition, moonDiameterFromGround,
  moonOffset, moonPhase, moonPosition, moonSpeed, nextElongation, OCCLUDER_SLOTS, OPTIONS, phaseContrast, relocationRisk,
  SIDEREAL_SECONDS, skyAt, SOLAR_ORBIT_SECONDS, sunDiameterFromGround, SURFACE_SPEED, SYNODIC_SECONDS, tidalFrame, touchesMoonPath, tripSeconds,
} from './model'
import type { Orbit } from './model'

const far: Orbit = { radius: OPTIONS.far.orbit, inclination: OPTIONS.far.inclination }
const flat: Orbit = { radius: OPTIONS.far.orbit, inclination: 0 }
const distance = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/** Earth spin that puts an equator meadow at this sun elevation, rising or setting. */
function spinFor(time: number, orbit: Orbit, elevation: number, rising: boolean) {
  const normal = { x: 1, y: 0, z: 0 }
  for (let step = 0; step < 3600; step++) {
    const spin = step / 3600 * Math.PI * 2
    const now = skyAt(time, orbit, normal, spin).sun, next = skyAt(time, orbit, normal, spin + 0.001).sun
    if (Math.abs(now - elevation) < 0.2 && (next > now) === rising) return spin
  }
  throw new Error('No meadow found')
}

describe('moon study', () => {
  it('has twelve lunar months in one game year, and the Moon wraps with the planets', () => {
    expect(SIDEREAL_SECONDS).toBeCloseTo(3600 / 11)
    let newMoons = 0, previous = moonPhase(0, far).elongation
    for (let time = 1; time <= SOLAR_ORBIT_SECONDS; time++) {
      const now = moonPhase(time, far).elongation
      if (now < previous - 180) newMoons++
      previous = now
    }
    expect(newMoons).toBe(SOLAR_ORBIT_SECONDS / SYNODIC_SECONDS)
    expect(distance(moonPosition(0, far), moonPosition(SOLAR_ORBIT_SECONDS, far))).toBeLessThan(0.01)
    for (const time of [0, 123, 2400]) expect(Math.hypot(...Object.values(moonOffset(time, far)))).toBeCloseTo(far.radius)
  })

  it('turns with Earth’s spin: a first quarter is high at sunset, a last quarter in the morning', () => {
    const firstQuarter = nextElongation(0, 90, flat)
    expect(skyAt(firstQuarter, flat, { x: 1, y: 0, z: 0 }, spinFor(firstQuarter, flat, 0, false)).moon).toBeGreaterThan(60)
    // The game starts at 25° of morning Sun; ORBIT_START puts a last-quarter Moon in that sky.
    expect(moonPhase(0, far).name).toBe('Last quarter')
    expect(skyAt(0, far, { x: 1, y: 0, z: 0 }, spinFor(0, far, 25, true)).moon).toBeGreaterThan(30)
  })

  it('gives option B the size of the Sun from the ground, and C a smaller Moon', () => {
    expect(eclipseOrbit()).toBe(528)
    expect(Math.abs(moonDiameterFromGround(OPTIONS.close.orbit) - sunDiameterFromGround())).toBeLessThan(0.2)
    expect(moonDiameterFromGround(OPTIONS.far.orbit)).toBeLessThan(10)
    // The Sun is near: a quarter Moon of C shows about two thirds of its disc lit.
    const quarter = moonPhase(nextElongation(0, 90, flat), flat)
    expect(quarter.illuminated).toBeGreaterThan(0.6)
    expect(quarter.illuminated).toBeLessThan(0.7)
    expect(moonPhase(nextElongation(0, 180, flat), flat).illuminated).toBeGreaterThan(0.99)
  })

  it('keeps each Moon world clear of Earth’s air, the near zones and the other worlds', () => {
    for (const option of ['close', 'far'] as const) {
      const gap = clearances(OPTIONS[option].orbit, OPTIONS[option].inclination)
      expect(gap.earthAir).toBeGreaterThan(100)
      expect(gap.nearZones).toBeGreaterThan(0)
      for (const other of [gap.mercury, gap.venus, gap.sun]) expect(other).toBeGreaterThan(500)
    }
    const frame = tidalFrame(40, far)
    expect(Math.hypot(frame.toEarth.x, frame.toEarth.y, frame.toEarth.z)).toBeCloseTo(1)
    expect(frame.toEarth.x * frame.normal.x + frame.toEarth.y * frame.normal.y + frame.toEarth.z * frame.normal.z).toBeCloseTo(0)
  })

  it('darkens every full moon at a small tilt; a steep orbit gives two eclipse seasons', () => {
    expect(darkFullMoons({ radius: OPTIONS.far.orbit, inclination: 5.1 })).toBe(1)
    expect(darkFullMoons({ radius: OPTIONS.close.orbit, inclination: 20 })).toBe(1)
    const events = eclipseSchedule(far)
    expect(events.filter(event => event.type === 'solar').length).toBeLessThanOrEqual(3)
    expect(darkFullMoons(far)).toBeLessThanOrEqual(1 / 3)
    // Seasons: the gaps between eclipses are short, except two long gaps each game year.
    const middles = events.map(event => (event.start + event.end) / 2).sort((a, b) => a - b)
    const gaps = middles.map((time, i) => (middles[i + 1] ?? middles[0] + SOLAR_ORBIT_SECONDS) - time)
    expect(gaps.filter(gap => gap > 900)).toHaveLength(2)
  })

  it('finds that relocation can put Blossom Haven in the Moon path today', () => {
    const risk = relocationRisk(OPTIONS.far.orbit)
    expect(risk.perMove).toBeGreaterThan(0.005)
    expect(risk.perMove).toBeLessThan(0.05)
    expect(risk.excludedNeeded).toBeGreaterThan(risk.excludedToday)
    // A place 1,200 m from Earth passes the test of today, but the Moon of C comes within 60 m.
    const earth = earthPosition(0), place = { x: earth.x * (1 + 1200 / 3300), y: 0, z: earth.z * (1 + 1200 / 3300) }
    expect(distance(place, earth)).toBeGreaterThan(risk.excludedToday)
    expect(touchesMoonPath(place, earth, OPTIONS.far.orbit, 204 + 250)).toBe(true)
    expect(relocationRisk(OPTIONS.close.orbit).perMove).toBeLessThan(risk.perMove)
  })

  it('needs a carry shell: at 8× the Moon outruns the fairy near its ground', () => {
    for (const option of ['close', 'far'] as const) expect(moonSpeed(OPTIONS[option].orbit, 8).around).toBeGreaterThan(SURFACE_SPEED.max)
    expect(moonSpeed(OPTIONS.far.orbit, 64).around).toBeGreaterThan(BOOST_SPEED)
    expect(moonSpeed(OPTIONS.close.orbit, 64).around).toBeLessThan(BOOST_SPEED)
    expect(tripSeconds(OPTIONS.far.orbit)).toBeGreaterThan(tripSeconds(OPTIONS.close.orbit))
    expect(tripSeconds(OPTIONS.far.orbit, true)).toBeLessThan(tripSeconds(OPTIONS.far.orbit))
  })

  it('fills the last sun occluder slot, and today’s light makes weak phases', () => {
    expect(budget('sky')).toMatchObject({ occluders: 11, worldPictures: 12, trip: null, solarEclipses: 0, relocation: 0 })
    for (const option of ['close', 'far'] as const) expect(budget(option)).toMatchObject({ occluders: OCCLUDER_SLOTS, worldPictures: 13, drawCalls: 1 })
    expect(budget('close').fog).toBeLessThan(0.3)
    expect(budget('far').fog).toBeGreaterThan(0.9)
    expect(phaseContrast(1.1)).toBeLessThan(4)
    expect(phaseContrast(1.1, EARTHSHINE)).toBeGreaterThan(15)
  })
})
