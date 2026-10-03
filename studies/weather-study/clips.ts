import * as THREE from 'three'
import { EARTH_TILT } from '../../src/seasons'
import type { World } from '../../src/worlds'
import type { CameraShot, Feature, Lab } from '../feature-ideas-study/lab'
import { captionOf, findSpot, groundView, headingAt, spaceShot } from '../seasons-study/clips'
import { createSeasons } from '../seasons-study/seasons'
import type { Seasons } from '../seasons-study/seasons'
import { hourLabel, KIND_NAMES, latitudeLabel, latitudeOf, monthAt, rainBelt, SEASON_WORDS, SEASON_YEARS, seasonWord, warmthAt } from './model'
import type { ClipId } from './model'
import { createWeatherKit } from './weather'
import type { CloudLook, Mode, Stamp, WeatherKit } from './weather'
import type { SeasonName } from '../../src/seasons'

/**
 * The clips of the weather study and the live view. Each one runs in the lab of the feature ideas
 * study (../feature-ideas-study/lab.ts): the real worlds, sky, fairy and light of the game. A clip
 * sets the day, the hour and the weather on each frame; the lab draws the frame.
 *
 * A clip puts its weather over the camera with a stamp, so the clip is the same at each run. In the
 * game the weather map decides the moment.
 */
type Kit = { seasons: Seasons; weather: WeatherKit }
const kits = new WeakMap<Lab, Kit>()
/** The seasons and the weather of the Earth of a lab. The materials change once, at the first clip. */
function kitOf(lab: Lab): Kit {
  let kit = kits.get(lab)
  if (!kit) {
    kit = { seasons: createSeasons(lab.earth, lab.sun.group.position), weather: createWeatherKit(lab) }
    kits.set(lab, kit)
    // For the browser check of the study (weather-study-smoke.mjs).
    Object.assign(window, { __weather: kit.weather })
  }
  kit.seasons.setOn(1)
  Object.assign(kit.weather.state, { mode: 'map', stamps: [], fall: null, bowScale: 1, clouds: 'new' })
  kit.weather.dry()
  kit.weather.cut()
  lab.fairy.visible = true
  return kit
}

/** A clear sky for a wide area around a place. A clip puts its own weather over it. */
const clearSky = (at: THREE.Vector3, cover = 0.12): Stamp => ({ at, radius: 1.1, cover, rain: 0, mist: 0 })
/** A place `metres` from `centre` along the local direction `heading`. */
const along = (world: World, centre: THREE.Vector3, heading: THREE.Vector3, metres: number) =>
  centre.clone().addScaledVector(heading, Math.tan(metres / world.radius)).normalize()
/** The local heading at a place that looks away from the Sun, for a rainbow. Earth has its pose. */
function awayFromSun(lab: Lab, world: World, centre: THREE.Vector3) {
  const inverse = world.group.quaternion.clone().invert()
  const away = world.group.position.clone().sub(lab.sun.group.position).normalize().applyQuaternion(inverse)
  return away.addScaledVector(centre, -away.dot(centre)).normalize()
}
/**
 * A place at a latitude for a view away from the Sun at an hour of a day. The turn from the north to
 * that view is the same at each longitude, so findSpot() can look for plants in the view.
 */
function findRainbowView(lab: Lab, seasons: Seasons, latitude: number, year: number, hour: number) {
  const world = seasons.world, first = findSpot(world, latitude)
  seasons.pose(year, EARTH_TILT, first, hour)
  const north = headingAt(first, 1), away = awayFromSun(lab, world, first)
  const turn = Math.atan2(new THREE.Vector3().crossVectors(north, away).dot(first), north.dot(away)) * 180 / Math.PI
  const spot = findSpot(world, latitude, 1, turn)
  return { spot, heading: headingAt(spot, 1, turn) }
}
/** The note of a place: the weather at the camera in words. */
function weatherNote(kit: Kit, hour: number) {
  const weather = kit.weather.current
  return weather ? `${KIND_NAMES[weather.kind]} · wind ${weather.wind.toFixed(1)}× · ${hourLabel(hour)}` : ''
}
/** The year in which a place has a given warmth, between two year values. For the first snow. */
function yearOfWarmth(latitude: number, height: number, target: number, from: number, to: number) {
  let best = from, error = Infinity
  for (let year = from; year <= to; year += 0.002) {
    const miss = Math.abs(warmthAt(latitude, year, height) - target)
    if (miss < error) { error = miss; best = year }
  }
  return best
}

// ---- W1: the weather map from space -----------------------------------------------------------------

const earthYear: Feature = { id: 'W1', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab)
  lab.fairy.visible = false
  lab.setShot(spaceShot(lab, lab.earth))
  return {
    duration: 12, still: 3.5,
    update(t, delta) {
      const year = t / 12
      kit.seasons.setLook(year)
      kit.seasons.pose(year, EARTH_TILT, undefined, 12, 0.6 + year * Math.PI * 2)
      // One year of the seasons and 12 minutes of the fronts.
      kit.weather.update(t, delta, year, 300 + t * 60, delta * 60)
      const belt = rainBelt(year)
      caption(monthAt(year), `The rain belt of the tropics is at ${Math.abs(belt) < 0.5 ? 'the equator' : latitudeLabel(belt)} · North: ${seasonWord(40, year).toLowerCase()}`)
    },
    dispose() { lab.fairy.visible = true },
  }
} }

// ---- W2: one leaf forest, four seasons ----------------------------------------------------------------

type Scene = { year: number; hour: number; stamps: (spot: THREE.Vector3, heading: THREE.Vector3) => Stamp[]; fall?: 'petal' | 'leaf'; bow?: boolean }
const FOUR: Record<SeasonName, Scene> = {
  // A shower in front of the camera and the low Sun behind it: a rainbow.
  spring: { year: SEASON_YEARS.spring, hour: 17.2, fall: 'petal', bow: true, stamps: (spot, heading) => [clearSky(spot, 0.3), { at: spot.clone().addScaledVector(heading, 0.34).normalize(), radius: 0.3, cover: 1, rain: 0.85 }] },
  // A clear afternoon with a heat shower far away.
  summer: { year: SEASON_YEARS.summer, hour: 15.5, stamps: (spot, heading) => [clearSky(spot, 0.32), { at: spot.clone().addScaledVector(heading, 0.38).normalize(), radius: 0.27, cover: 1, rain: 1, storm: 1 }] },
  autumn: { year: SEASON_YEARS.autumn, hour: 13, fall: 'leaf', stamps: spot => [clearSky(spot, 0.5), { at: spot, radius: 0.6, cover: 0.96, rain: 0.55 }] },
  winter: { year: SEASON_YEARS.winter, hour: 12.5, stamps: spot => [clearSky(spot, 0.5), { at: spot, radius: 0.6, cover: 1, rain: 0.7 }] },
}
const ORDER: SeasonName[] = ['spring', 'summer', 'autumn', 'winter']

const fourSeasons: Feature = { id: 'W2', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const latitude = 32, each = 3
  // The camera looks away from the Sun of the spring afternoon, so the rainbow is in the picture.
  const { spot, heading } = findRainbowView(lab, kit.seasons, latitude, FOUR.spring.year, FOUR.spring.hour)
  const view = groundView(lab, world, spot, heading, { lookUp: 7 })
  lab.setShot(view.shot)
  let shown = -1
  return {
    duration: each * 4, still: 1.6,
    update(t, delta) {
      const index = Math.min(3, Math.floor(t / each)), name = ORDER[index], scene = FOUR[name]
      const cut = index !== shown
      shown = index
      kit.seasons.setLook(scene.year)
      kit.seasons.pose(scene.year, EARTH_TILT, spot, scene.hour)
      view.place(t)
      kit.weather.state.stamps = scene.stamps(spot, heading)
      kit.weather.state.fall = scene.fall ?? null
      kit.weather.state.bowScale = scene.bow ? 1 : 0
      if (cut) { kit.weather.dry(); kit.weather.cut() }
      kit.weather.update(t, delta, scene.year, 0, cut ? 90 : delta)
      caption(`${monthAt(scene.year)} · ${SEASON_WORDS[name]}`, `${latitudeLabel(latitude)} · ${seasonWord(latitude, scene.year)} · ${weatherNote(kit, scene.hour)}`)
    },
    dispose() {},
  }
} }

// ---- W3: one moment, four places ----------------------------------------------------------------------

const fourPlaces: Feature = { id: 'W3', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const year = SEASON_YEARS.summer, each = 3
  const moistAt = (centre: THREE.Vector3) => kit.weather.placeOf(centre).moist
  /** The first latitude of a list with a place that the test accepts. */
  const search = (latitudes: number[], accept: (centre: THREE.Vector3) => boolean) => {
    for (const latitude of latitudes) { const spot = findSpot(world, latitude, 1, 28, 6, accept); if (accept(spot)) return spot }
    return findSpot(world, latitudes[0])
  }
  const places = [
    { name: 'Jungle', spot: search([4, -4, 8, -8, 0, 11, -11], centre => moistAt(centre) > 0.2), hour: 15, stamp: { cover: 1, rain: 0.9 }, words: 'Warm rain on most days' },
    { name: 'Desert', spot: search([8, -8, 4, -4, 12, -12, 0], centre => moistAt(centre) < -0.3), hour: 13, stamp: { cover: 0, rain: 0 }, words: 'A clear, dry sky' },
    { name: 'Leaf forest', spot: findSpot(world, 32), hour: 13, stamp: { cover: 0.5, rain: 0 }, words: 'A few clouds in summer' },
    { name: 'Far south', spot: findSpot(world, -50), hour: 12.5, stamp: { cover: 1, rain: 0.75 }, words: 'Winter in the south: snow' },
  ].map(place => ({ ...place, view: groundView(lab, world, place.spot, headingAt(place.spot, 1, 28), { lookUp: 5 }) }))
  const at = (t: number) => Math.min(places.length - 1, Math.floor(t / each))
  lab.setShot((camera, t) => places[at(t)].view.shot(camera, t))
  kit.seasons.setLook(year)
  let shown = -1
  return {
    duration: each * places.length, still: 1.5,
    update(t, delta) {
      const index = at(t), place = places[index], cut = index !== shown
      shown = index
      kit.seasons.pose(year, EARTH_TILT, place.spot, place.hour)
      place.view.place(t)
      kit.weather.state.stamps = [clearSky(place.spot, 0.2), { at: place.spot, radius: 0.6, ...place.stamp }]
      if (cut) { kit.weather.dry(); kit.weather.cut() }
      kit.weather.update(t, delta, year, 0, cut ? 90 : delta)
      const latitude = latitudeOf(place.spot)
      caption(`${place.name} · ${place.words}`, `${monthAt(year)} · ${latitudeLabel(latitude)} · ${seasonWord(latitude, year)} · ${weatherNote(kit, place.hour)}`)
    },
    dispose() {},
  }
} }

// ---- W4: a shower passes ------------------------------------------------------------------------------

const shower: Feature = { id: 'W4', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const latitude = 32, year = SEASON_YEARS.spring, hour = 17.2, duration = 14
  kit.seasons.setLook(year)
  // The camera looks away from the Sun. The shower comes from behind the camera and goes away in front of it.
  const { spot, heading } = findRainbowView(lab, kit.seasons, latitude, year, hour)
  const view = groundView(lab, world, spot, heading, { lookUp: 7 })
  lab.setShot(view.shot)
  return {
    duration, still: 10.4,
    update(t, delta) {
      kit.seasons.pose(year, EARTH_TILT, spot, hour)
      view.place(t)
      const reach = THREE.MathUtils.lerp(-0.62, 0.52, THREE.MathUtils.smoothstep(t, 0.5, 11))
      kit.weather.state.stamps = [clearSky(spot, 0.3), { at: spot.clone().addScaledVector(heading, Math.tan(reach)).normalize(), radius: 0.36, cover: 1, rain: 0.9 }]
      // About 2 minutes of the game in the clip.
      kit.weather.update(t, delta, year, 0, delta * 8)
      const bow = kit.weather.bow > 0.25
      caption(bow ? 'A rainbow, opposite to the Sun' : t < 2.2 ? 'A spring afternoon' : t < 8 ? 'A shower passes' : 'The Sun comes back',
        `${monthAt(year)} · ${latitudeLabel(latitude)} · ${weatherNote(kit, hour)}`)
    },
    dispose() {},
  }
} }

// ---- W5: morning mist -----------------------------------------------------------------------------------

/** The local heading at a place toward the nearest water, or null with no water in 60 m. */
function waterHeading(world: World, centre: THREE.Vector3) {
  const east = new THREE.Vector3(0, 1, 0).cross(centre).normalize(), north = new THREE.Vector3().crossVectors(centre, east)
  let best: THREE.Vector3 | null = null, most = 2
  for (let step = 0; step < 16; step++) {
    const heading = east.clone().multiplyScalar(Math.cos(step / 16 * Math.PI * 2)).addScaledVector(north, Math.sin(step / 16 * Math.PI * 2))
    let water = 0
    for (const metres of [18, 28, 38, 50, 60]) { const point = along(world, centre, heading, metres); if (world.sample(point.x, point.y, point.z).height < 0.2) water++ }
    if (water > most) { most = water; best = heading }
  }
  return best
}

const morningMist: Feature = { id: 'W5', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const year = SEASON_YEARS.autumn, duration = 10
  // Low ground near the water, in the leaf forest.
  let spot = findSpot(world, 30), heading = headingAt(spot, 1, 28)
  for (const latitude of [30, 27, 33, 24, 36]) {
    const found = findSpot(world, latitude, 1, 28, 6, centre => world.sample(centre.x, centre.y, centre.z).height < 3 && waterHeading(world, centre) !== null)
    const toWater = waterHeading(world, found)
    if (toWater) { spot = found; heading = toWater; break }
  }
  const view = groundView(lab, world, spot, heading, { lookUp: 4 })
  lab.setShot(view.shot)
  kit.seasons.setLook(year)
  const latitude = Math.round(latitudeOf(spot))
  return {
    duration, still: 3.2,
    update(t, delta) {
      const hour = 7.3 + t / duration * 3.2
      kit.seasons.pose(year, EARTH_TILT, spot, hour)
      view.place(t)
      const mist = 1 - THREE.MathUtils.smoothstep(hour, 8.1, 10)
      kit.weather.state.stamps = [{ at: spot, radius: 1.1, cover: 0.1, rain: 0, mist }]
      kit.weather.update(t, delta, year, 0, delta)
      caption(mist > 0.5 ? 'Mist on the low ground' : mist > 0.05 ? 'The Sun warms the air' : 'A clear morning',
        `${monthAt(year)} · ${latitudeLabel(latitude)} · ${seasonWord(latitude, year)} · ${weatherNote(kit, hour)}`)
    },
    dispose() {},
  }
} }

// ---- W6: a flight into the rain ---------------------------------------------------------------------------

const intoRain: Feature = { id: 'W6', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const year = SEASON_YEARS.spring, hour = 15, duration = 13
  // East is the direction of the spin of Earth. The fairy flies to the east, 240 m in the clip.
  const eastAt = (centre: THREE.Vector3) => new THREE.Vector3(0, 1, 0).cross(centre).normalize().negate()
  const heightAt = (centre: THREE.Vector3) => Math.max(0, world.sample(centre.x, centre.y, centre.z).height)
  // The route with the lowest ground, so no mountain hides the view.
  let start = findSpot(world, 30), lowest = Infinity
  for (let longitude = 0; longitude < 360; longitude += 4) {
    const from = new THREE.Vector3(Math.cos(30 * Math.PI / 180) * Math.cos(longitude * Math.PI / 180), Math.sin(30 * Math.PI / 180), Math.cos(30 * Math.PI / 180) * Math.sin(longitude * Math.PI / 180))
    const east = eastAt(from)
    let top = 0, land = 0
    for (let metres = 0; metres <= 250; metres += 10) { const height = heightAt(along(world, from, east, metres)); top = Math.max(top, height); if (height > 0.8) land++ }
    // Land under most of the route shows the dark, wet ground.
    const score = top + Math.max(0, 16 - land) * 0.6
    if (score < lowest) { lowest = score; start = from }
  }
  kit.seasons.setLook(year)
  kit.seasons.pose(year, EARTH_TILT, start, hour)
  const east = eastAt(start)
  // A level flight, 13 m above the sea.
  const rail = Array.from({ length: 9 }, (_, i) => { const dir = along(world, start, east, i * 30); return { dir, alt: 13 - heightAt(dir) + Math.sin(i * 1.3) } })
  lab.setRail(world, rail)
  lab.setShot(null)
  // A low camera, so the sky in front of the fairy is in the picture.
  lab.setFollow(9, 1.3)
  const centre = along(world, start, east, 135)
  kit.weather.state.stamps = [clearSky(start, 0.28), { at: centre, radius: 0.3, cover: 1, rain: 0.95 }]
  return {
    duration, still: 6.2,
    update(t, delta) {
      kit.weather.update(t, delta, year, 0, t === 0 ? 90 : delta)
      const rain = kit.weather.here.rain
      caption(rain > 0.25 ? 'In the rain' : t < duration / 2 ? 'A shower in front of the fairy' : 'Out into the Sun',
        `${monthAt(year)} · ${latitudeLabel(kit.weather.latitude())} · ${weatherNote(kit, hour)}`)
    },
    dispose() {},
  }
} }

// ---- W7: the first snow -------------------------------------------------------------------------------------

const firstSnow: Feature = { id: 'W7', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const latitude = 36, hour = 12.5, duration = 10
  // A place with land in front of the camera, so the snow on the ground shows.
  const landAhead = (centre: THREE.Vector3) => [12, 24, 36, 48, 60].every(metres => { const point = along(world, centre, headingAt(centre, 1, 28), metres); return world.sample(point.x, point.y, point.z).height > 0.7 })
  const spot = findSpot(world, latitude, 1, 28, 6, landAhead)
  // A day at the end of autumn, when the ground of the place has no snow of the season and the air is cold for snow.
  const year = yearOfWarmth(latitude, kit.weather.placeOf(spot).height, 0.675, 0.6, 0.8)
  const view = groundView(lab, world, spot, headingAt(spot, 1, 28), { lookUp: 4 })
  lab.setShot(view.shot)
  kit.seasons.setLook(year)
  return {
    duration, still: 8.5,
    update(t, delta) {
      kit.seasons.pose(year, EARTH_TILT, spot, hour)
      view.place(t)
      const come = THREE.MathUtils.smoothstep(t, 0.3, 2.6)
      kit.weather.state.stamps = [clearSky(spot, 0.45), { at: spot, radius: 0.6, cover: 0.45 + come * 0.55, rain: come * 0.8 }]
      // About 1 minute of the game in the clip.
      kit.weather.update(t, delta, year, 0, delta * 6)
      caption(t < 2.4 ? 'A grey sky comes' : t < 6.5 ? 'The first snow' : 'The snow stays on the ground',
        `${monthAt(year)} · ${latitudeLabel(latitude)} · ${seasonWord(latitude, year)} · ${weatherNote(kit, hour)}`)
    },
    dispose() {},
  }
} }

// ---- W8: thunder far away -------------------------------------------------------------------------------------

const farThunder: Feature = { id: 'W8', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const latitude = 30, year = SEASON_YEARS.summer, hour = 21.4, duration = 10
  const spot = findSpot(world, latitude), heading = headingAt(spot, 1, 28)
  const view = groundView(lab, world, spot, heading, { lookUp: 9 })
  lab.setShot(view.shot)
  kit.seasons.setLook(year)
  kit.weather.state.stamps = [clearSky(spot, 0.1), { at: spot.clone().addScaledVector(heading, 0.5).normalize(), radius: 0.3, cover: 1, rain: 1, storm: 1 }]
  return {
    duration, still: 3.62,
    update(t, delta) {
      kit.seasons.pose(year, EARTH_TILT, spot, hour)
      view.place(t)
      kit.weather.update(t, delta, year, 0, delta)
      caption('Thunder far away', `${monthAt(year)} · ${latitudeLabel(latitude)} · A warm night · stars where the sky is clear · ${hourLabel(hour)}`)
    },
    dispose() {},
  }
} }

// ---- W9: the clouds, before and after -------------------------------------------------------------------------

const cloudLooks: Feature = { id: 'W9', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const latitude = 32, year = SEASON_YEARS.summer, each = 3
  const { spot, heading } = findRainbowView(lab, kit.seasons, latitude, SEASON_YEARS.spring, 17.2)
  const view = groundView(lab, world, spot, heading, { lookUp: 9 })
  lab.setShot(view.shot)
  kit.seasons.setLook(year)
  const front: Stamp = { at: spot, radius: 0.7, cover: 0.97, rain: 0.5 }
  const scenes: { mode: Mode; hour: number; stamps: Stamp[]; title: string; words: string }[] = [
    { mode: 'off', hour: 13, stamps: [], title: 'Before · The puffs of the game', words: 'Clear, grey-green balls: the same at each place and in each weather' },
    { mode: 'map', hour: 13, stamps: [clearSky(spot, 0.42)], title: 'After · Fair weather', words: 'Small, solid heap clouds with a flat base, and high wisps' },
    { mode: 'map', hour: 13, stamps: [clearSky(spot, 0.5), front], title: 'After · A front', words: 'Tall, grey rain clouds, and a grey layer that closes the sky' },
    { mode: 'map', hour: 17.9, stamps: [clearSky(spot, 0.46)], title: 'After · The low Sun', words: 'The clouds take the warm colours of dusk' },
  ]
  let shown = -1
  return {
    duration: each * scenes.length, still: 4.6,
    update(t, delta) {
      const index = Math.min(scenes.length - 1, Math.floor(t / each)), scene = scenes[index], cut = index !== shown
      shown = index
      kit.seasons.pose(year, EARTH_TILT, spot, scene.hour)
      view.place(t)
      kit.weather.state.mode = scene.mode
      kit.weather.state.stamps = scene.stamps
      kit.weather.state.bowScale = 0
      if (cut) { kit.weather.dry(); kit.weather.cut() }
      kit.weather.update(t, delta, year, 0, cut ? 90 : delta)
      caption(scene.title, `${scene.words} · ${hourLabel(scene.hour)}`)
    },
    dispose() {},
  }
} }

// ---- W10: rain far away, and above the clouds -----------------------------------------------------------------

const cloudKinds: Feature = { id: 'W10', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const latitude = 32, year = SEASON_YEARS.summer, each = 4
  const { spot, heading } = findRainbowView(lab, kit.seasons, latitude, SEASON_YEARS.spring, 17.2)
  const ground = groundView(lab, world, spot, heading, { lookUp: 8 })
  // A camera above the clouds: 60 m above the ground, with the fairy in front of it.
  const above = groundView(lab, world, spot, heading, { eye: 60, back: 24, ahead: 46, lookUp: 44, height: 55, circle: 6 })
  const shower: Stamp = { at: along(world, spot, heading, 95), radius: 0.2, cover: 1, rain: 1 }
  const scenes = [
    { view: ground, hour: 14, stamps: [clearSky(spot, 0.4), shower], title: 'Rain far away', words: 'A rain curtain under the cloud shows where the shower is' },
    { view: above, hour: 14, stamps: [clearSky(spot, 0.62), shower], title: 'Above the clouds', words: 'The heap clouds stand out of the grey layer' },
    { view: above, hour: 17.9, stamps: [clearSky(spot, 0.62), shower], title: 'The low Sun', words: 'White at noon, gold and pink at dusk' },
  ]
  const at = (t: number) => scenes[Math.min(scenes.length - 1, Math.floor(t / each))]
  lab.setShot((camera, t) => at(t).view.shot(camera, t))
  kit.seasons.setLook(year)
  let shown: typeof scenes[number] | null = null
  return {
    duration: each * scenes.length, still: 1.5,
    update(t, delta) {
      const scene = at(t), cut = scene !== shown
      shown = scene
      kit.seasons.pose(year, EARTH_TILT, spot, scene.hour)
      scene.view.place(t)
      kit.weather.state.stamps = scene.stamps
      kit.weather.state.bowScale = 0
      if (cut) { kit.weather.dry(); kit.weather.cut() }
      kit.weather.update(t, delta, year, 0, cut ? 90 : delta)
      caption(scene.title, `${scene.words} · ${hourLabel(scene.hour)}`)
    },
    dispose() {},
  }
} }

// ---- The live view --------------------------------------------------------------------------------------------

export type LivePlace = 'space' | number
export type LiveSky = 'map' | 'clear' | 'fair' | 'rain' | 'storm' | 'mist'
/** The controls of the live view. The page changes them; the live feature reads them on each frame. */
export const live = {
  place: 32 as LivePlace,
  year: SEASON_YEARS.spring,
  hour: 15,
  /** The time of the fronts, in seconds of the game. `play` runs it 10 times faster than the game. */
  time: 0,
  play: true,
  mode: 'map' as Mode,
  /** The weather over the camera: from the map, or one that the page sets. */
  sky: 'map' as LiveSky,
  /** The new clouds, or the puffs of the game with a size from the map. */
  clouds: 'new' as CloudLook,
  free: false,
}
const LIVE_SKIES: Record<Exclude<LiveSky, 'map' | 'storm'>, Omit<Stamp, 'at' | 'radius'>> = {
  clear: { cover: 0, rain: 0, mist: 0 }, fair: { cover: 0.5, rain: 0, mist: 0 }, rain: { cover: 1, rain: 0.9, mist: 0 }, mist: { cover: 0.1, rain: 0, mist: 1 },
}
export const LIVE: Feature = { id: 'LIVE', create(lab) {
  const kit = kitOf(lab), caption = captionOf(lab), world = lab.earth
  const views = new Map<number, { spot: THREE.Vector3; heading: THREE.Vector3; shot: CameraShot; place: (t: number) => void }>()
  function viewOf(latitude: number) {
    if (!views.has(latitude)) {
      const spot = findSpot(world, latitude), heading = headingAt(spot, 1, 28)
      views.set(latitude, { spot, heading, ...groundView(lab, world, spot, heading, { lookUp: 6 }) })
    }
    return views.get(latitude)!
  }
  const space = spaceShot(lab, world)
  const offset = new THREE.Vector3(), turn = new THREE.Quaternion(), inverse = new THREE.Quaternion(), here = new THREE.Vector3(), ahead = new THREE.Vector3()
  let spin = 0.6
  return {
    duration: Infinity,
    update(t, delta) {
      if (live.play) live.time += delta * 10
      kit.weather.state.mode = live.mode
      kit.weather.state.clouds = live.clouds
      kit.seasons.setOn(1)
      kit.seasons.setLook(live.year)
      const view = live.place === 'space' ? null : viewOf(live.place)
      lab.fairy.visible = !!view
      if (live.free && view) {
        // The fairy flies with the keys. She stays on the world while the hour turns it.
        inverse.copy(world.group.quaternion).invert()
        offset.copy(lab.fairy.position).sub(world.group.position).applyQuaternion(inverse)
        turn.copy(inverse).multiply(lab.fairy.quaternion)
        kit.seasons.pose(live.year, EARTH_TILT, view.spot, live.hour)
        lab.fairy.position.copy(offset).applyQuaternion(world.group.quaternion).add(world.group.position)
        lab.fairy.quaternion.copy(world.group.quaternion).multiply(turn)
      } else if (view) {
        kit.seasons.pose(live.year, EARTH_TILT, view.spot, live.hour)
        view.place(t)
        lab.setShot(view.shot)
      } else {
        spin += delta * 0.1
        kit.seasons.pose(live.year, EARTH_TILT, undefined, 12, spin)
        lab.setShot(space)
      }
      // The weather that the page sets goes over the camera, and it follows the fairy in free flight.
      kit.weather.localOf(lab.camera.position, here)
      const stamps: Stamp[] = []
      if (view && live.sky === 'storm') {
        ahead.set(0, 0, -1).applyQuaternion(lab.camera.quaternion).applyQuaternion(inverse.copy(world.group.quaternion).invert())
        ahead.addScaledVector(here, -ahead.dot(here)).normalize()
        stamps.push(clearSky(here.clone(), 0.15), { at: here.clone().addScaledVector(ahead, 0.5).normalize(), radius: 0.3, cover: 1, rain: 1, storm: 1 })
      } else if (view && live.sky !== 'map' && live.sky !== 'storm') stamps.push({ at: here.clone(), radius: 0.9, ...LIVE_SKIES[live.sky] })
      kit.weather.state.stamps = stamps
      kit.weather.update(t, delta, live.year, live.time, live.play ? delta * 10 : delta, 4)
      const latitude = latitudeOf(here)
      if (live.mode === 'off') caption('The game of today', 'The same puffs at each place. Snow falls all the time in the cold. No rain.')
      else if (!view) caption(monthAt(live.year), `${live.mode === 'one' ? 'One sky for the whole planet' : `The rain belt of the tropics is at ${Math.abs(rainBelt(live.year)) < 0.5 ? 'the equator' : latitudeLabel(rainBelt(live.year))}`} · North: ${seasonWord(40, live.year).toLowerCase()}`)
      else caption(`${monthAt(live.year)} · ${latitudeLabel(latitude)} · ${seasonWord(latitude, live.year)}`, weatherNote(kit, kit.weather.hourOf(here)))
    },
    dispose() { lab.fairy.visible = true },
  }
} }

/** The clips of the study, in the order of the page. */
export const WEATHER_CLIPS: Record<ClipId, Feature> = {
  W1: earthYear, W2: fourSeasons, W3: fourPlaces, W4: shower, W5: morningMist, W6: intoRain, W7: firstSnow, W8: farThunder, W9: cloudLooks, W10: cloudKinds,
}
