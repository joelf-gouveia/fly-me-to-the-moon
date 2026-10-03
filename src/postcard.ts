import { stickerById } from './stickers'
import type { StickerId } from './stickers'

// The postcard camera: F5 of docs/feature-ideas-study.md. This file has the numbers of the
// card, the name of the file and the drawing of the saved card. src/postcard-camera.ts has
// the button and the dialog.

/** The long side of the picture on the saved card, in pixels. */
export const PHOTO_LONG = 1200
/** The tallest and the widest picture. The camera cuts a taller or a wider view at its middle. */
export const PHOTO_ASPECT = { min: 3 / 4, max: 16 / 9 } as const
/** The white border around the picture, and the strip under it for the name and the stamp. */
export const BORDER = 40
export const CAPTION = 160
export const STAMP = 120
export const POSTCARD_LINE = 'A POSTCARD FROM YOUR JOURNEY'
/** The colours of the card. The screen card in src/postcard.css uses the same colours. */
export const CARD_COLORS = { paper: '#fffaf2', name: '#59304c', line: '#b57d9a', stamp: ['#fff7fb', '#ffe6f1'], stampEdge: '#fff6ee' } as const

export type Rect = { x: number; y: number; width: number; height: number }
export type Text = { x: number; y: number; size: number; maxWidth: number }
export type PostcardLayout = {
  width: number
  height: number
  /** The part of the view that the picture keeps. */
  crop: Rect
  /** The place of the picture on the card. */
  photo: Rect
  name: Text
  line: Text
  /** The stamp: the top-left corner, the size, and the turn in radians. */
  stamp: { x: number; y: number; size: number; turn: number }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * The layout of the saved card for a view of this size in pixels. The picture keeps the
 * shape of the view from 3:4 to 16:9, so a phone gives a tall card and a computer a wide card.
 */
export function postcardLayout(viewWidth: number, viewHeight: number): PostcardLayout {
  const width = Math.max(1, viewWidth), height = Math.max(1, viewHeight)
  const aspect = clamp(width / height, PHOTO_ASPECT.min, PHOTO_ASPECT.max)
  // Cut the sides of a wide view, or the top and the bottom of a tall view.
  const cropWidth = width / height > aspect ? height * aspect : width
  const cropHeight = cropWidth / aspect
  const crop = { x: Math.round((width - cropWidth) / 2), y: Math.round((height - cropHeight) / 2), width: Math.round(cropWidth), height: Math.round(cropHeight) }
  const photoWidth = aspect >= 1 ? PHOTO_LONG : Math.round(PHOTO_LONG * aspect)
  const photoHeight = aspect >= 1 ? Math.round(PHOTO_LONG / aspect) : PHOTO_LONG
  const photo = { x: BORDER, y: BORDER, width: photoWidth, height: photoHeight }
  const cardWidth = photoWidth + BORDER * 2, cardHeight = BORDER + photoHeight + CAPTION
  const strip = BORDER + photoHeight
  // The name and the line are on the left of the strip; the stamp is on the right.
  const textWidth = photoWidth - STAMP - 40
  return {
    width: cardWidth,
    height: cardHeight,
    crop,
    photo,
    name: { x: BORDER + 6, y: strip + 82, size: 64, maxWidth: textWidth },
    line: { x: BORDER + 8, y: strip + 124, size: 18, maxWidth: textWidth },
    stamp: { x: cardWidth - BORDER - STAMP, y: strip + (CAPTION - STAMP) / 2, size: STAMP, turn: 8 * Math.PI / 180 },
  }
}

/** The name on the card. English says "the Sun" and "the Moon", but "Mars". */
export function postcardTitle(id: StickerId) {
  const sticker = stickerById(id)
  return sticker.the ? `The ${sticker.name}` : sticker.name
}

/** The name of the saved file, for example "fairy-postcard-blossom-haven.png". */
export function postcardFileName(name: string) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `fairy-postcard-${slug || 'space'}.png`
}

/** A circle path. */
function circle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
}

/**
 * The sticker picture of a world, as the stamp of the card. It is the canvas copy of
 * `.planet-picture` in src/adventure.css: a round world with a soft light at the top left.
 */
export function drawStamp(ctx: CanvasRenderingContext2D, id: StickerId, color: string, x: number, y: number, size: number, turn: number) {
  ctx.save()
  ctx.translate(x + size / 2, y + size / 2)
  ctx.rotate(turn)
  // The sticker paper: a soft pink square with round corners and a cream edge.
  ctx.shadowColor = '#3a1f2e40'
  ctx.shadowBlur = size * 0.12
  ctx.shadowOffsetY = size * 0.05
  const paper = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2)
  paper.addColorStop(0, CARD_COLORS.stamp[0])
  paper.addColorStop(1, CARD_COLORS.stamp[1])
  ctx.fillStyle = paper
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(-size / 2, -size / 2, size, size, size * 0.28)
  else ctx.rect(-size / 2, -size / 2, size, size)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.lineWidth = size * 0.04
  ctx.strokeStyle = CARD_COLORS.stampEdge
  ctx.stroke()

  // The Moon and the dwarf worlds have smaller pictures, as in Worlds.
  const radius = size * (id === 'moon' ? 0.24 : id === 'ceres' || id === 'vesta' ? 0.21 : 0.32)
  const fill = id === 'fairy' ? '#e68db6' : color
  if (id === 'saturn') {
    // The back half of the rings.
    ctx.save(); ctx.rotate(-25 * Math.PI / 180)
    ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.45, radius * 0.42, 0, Math.PI, Math.PI * 2)
    ctx.lineWidth = radius * 0.2; ctx.strokeStyle = '#e7c794aa'; ctx.stroke()
    ctx.restore()
  }
  ctx.save()
  if (id === 'vesta') { ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.04, radius * 0.94, 0.3, 0, Math.PI * 2) } else circle(ctx, 0, 0, radius)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.clip()
  if (id === 'jupiter' || id === 'neptune') {
    // Soft bands.
    ctx.save(); ctx.rotate(10 * Math.PI / 180)
    ctx.fillStyle = '#ffffff33'
    for (let band = -radius; band < radius; band += radius * 0.42) ctx.fillRect(-radius * 1.2, band, radius * 2.4, radius * 0.21)
    ctx.restore()
  }
  if (id === 'moon') {
    ctx.fillStyle = '#7c7d82'
    circle(ctx, -radius * 0.28, -radius * 0.16, radius * 0.28); ctx.fill()
    circle(ctx, radius * 0.24, radius * 0.2, radius * 0.38); ctx.fill()
  }
  if (id === 'vesta') { ctx.fillStyle = '#0003'; ctx.beginPath(); ctx.ellipse(radius * 0.05, radius * 0.62, radius * 0.45, radius * 0.25, 0, 0, Math.PI * 2); ctx.fill() }
  if (id === 'ceres') { ctx.fillStyle = '#fbf7ec'; ctx.beginPath(); ctx.ellipse(radius * 0.2, -radius * 0.2, radius * 0.17, radius * 0.13, 0, 0, Math.PI * 2); ctx.fill() }
  // The soft light at the top left and the shade at the bottom right.
  const light = ctx.createRadialGradient(-radius * 0.4, -radius * 0.5, 0, -radius * 0.4, -radius * 0.5, radius * 1.3)
  light.addColorStop(0, '#ffffff70')
  light.addColorStop(1, '#ffffff00')
  ctx.fillStyle = light
  ctx.fillRect(-radius * 1.5, -radius * 1.5, radius * 3, radius * 3)
  const shade = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.7, 0, 0, radius * 1.15)
  shade.addColorStop(0, '#00000000')
  shade.addColorStop(1, '#00000040')
  ctx.fillStyle = shade
  ctx.fillRect(-radius * 1.5, -radius * 1.5, radius * 3, radius * 3)
  ctx.restore()
  if (id === 'saturn') {
    // The front half of the rings.
    ctx.save(); ctx.rotate(-25 * Math.PI / 180)
    ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.45, radius * 0.42, 0, 0, Math.PI)
    ctx.lineWidth = radius * 0.2; ctx.strokeStyle = '#e7c794aa'; ctx.stroke()
    ctx.restore()
  }
  // Blossom Haven has its flower, and Earth its sea.
  const mark = id === 'fairy' ? '✿' : id === 'earth' ? '≈' : ''
  if (mark) {
    ctx.fillStyle = id === 'fairy' ? '#ffefc4' : '#669b79'
    ctx.font = `${Math.round(radius * 1.5)}px Manrope, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(mark, 0, radius * 0.06)
  }
  ctx.restore()
}

/** Draws the saved card: the picture in a white border, the name, the line and the stamp. */
export function drawPostcard(ctx: CanvasRenderingContext2D, layout: PostcardLayout, photo: CanvasImageSource, place: { id: StickerId; title: string; color: string }) {
  ctx.fillStyle = CARD_COLORS.paper
  ctx.fillRect(0, 0, layout.width, layout.height)
  const { x, y, width, height } = layout.photo
  ctx.drawImage(photo, x, y, width, height)
  // A thin line gives the picture a clean edge on the paper.
  ctx.strokeStyle = '#00000014'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = CARD_COLORS.name
  ctx.font = `${layout.name.size}px Italiana, Georgia, serif`
  ctx.fillText(place.title, layout.name.x, layout.name.y, layout.name.maxWidth)
  ctx.fillStyle = CARD_COLORS.line
  ctx.font = `${layout.line.size}px "DM Mono", monospace`
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0.2em'
  ctx.fillText(POSTCARD_LINE, layout.line.x, layout.line.y, layout.line.maxWidth)
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
  drawStamp(ctx, place.id, place.color, layout.stamp.x, layout.stamp.y, layout.stamp.size, layout.stamp.turn)
}
