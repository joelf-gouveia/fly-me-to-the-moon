import { lookColors } from '../customization'
import type { FairyLook } from '../customization'
import type { Design } from './designs'
import { paintDesign } from './paint'
import { rgb, tone } from './shapes'

/** Draws a small picture of a wing pair on a canvas, for a button of the menu. */
export function drawWingIcon(canvas: HTMLCanvasElement, design: Design, look: FairyLook) {
  const colours = lookColors(look)
  const pictures = paintDesign(design, { wing: tone(rgb(colours.wings), -0.16, 0.25), sparkle: rgb(colours.sparkle) }, { paint: true, lines: true }, 96)
  // The frame of one side: from the root of the wing to the far edge of each panel.
  const right = Math.max(...pictures.map(({ box }) => box.x + box.side))
  const top = Math.max(...pictures.map(({ box }) => box.y + box.side)), bottom = Math.min(...pictures.map(({ box }) => box.y))
  const scale = Math.min(canvas.width / 2 / right, canvas.height / (top - bottom))
  const context = canvas.getContext('2d')!
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  for (const side of [-1, 1]) {
    // The lower panels first, as on the fairy.
    for (const lower of [true, false]) pictures.forEach(({ colour, box }, index) => {
      if (!!design.panels[index].lower !== lower) return
      context.setTransform(side * scale, 0, 0, scale, canvas.width / 2, (canvas.height - (top - bottom) * scale) / 2 + top * scale)
      context.drawImage(colour, box.x, -(box.y + box.side), box.side, box.side)
    })
  }
}
