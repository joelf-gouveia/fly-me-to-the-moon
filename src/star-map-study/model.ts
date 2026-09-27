import { webbImages } from '../star-data'
import { resolvedPictures, starsBrighterThan } from '../star-map'
import { beforePictureIds } from './legacy-sky'

export type StudySettings = {
  figures: 'today' | 'proposed'; asterisms: boolean; background: 'today' | 'real'; limit: number
  milkyWay: boolean; webb: boolean; placement: 'beside' | 'true'; postcardDegrees: number; labels: boolean
}

/** 'today' is the sky before the change: three pictures over random stars. */
export function shownFigures(settings: Pick<StudySettings, 'figures' | 'asterisms'>) {
  return resolvedPictures.filter(figure => settings.figures === 'today'
    ? (beforePictureIds as readonly string[]).includes(figure.id)
    : settings.asterisms || figure.kind === 'constellation')
}

/** Rough game cost of a setting, for the study's budget panel. */
export function budget(settings: StudySettings) {
  const shown = shownFigures(settings)
  const stars = settings.background === 'real' ? starsBrighterThan(settings.limit) : 3022
  const segments = shown.reduce((total, figure) => total + figure.segments.length, 0)
  return {
    stars,
    figures: shown.length,
    segments,
    // Compact typed-array rows: 4 floats × 4 bytes for each drawn star.
    starDataKb: Math.round(stars * 16 / 1024),
    webbImages: settings.webb ? webbImages.length : 0,
    // 512² RGBA with mipmaps is about 1.4 MB of GPU memory per picture.
    webbGpuMb: settings.webb ? +(webbImages.length * 512 * 512 * 4 * 4 / 3 / 1048576).toFixed(1) : 0,
    drawCalls: 1 + (settings.milkyWay ? 1 : 0) + shown.length + (settings.webb ? webbImages.length : 0),
  }
}
