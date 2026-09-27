export const hairOptions = [
  { id: 'bun', label: 'Bun' },
  { id: 'bob', label: 'Bob' },
  { id: 'tails', label: 'Tails' },
  { id: 'spaceBuns', label: 'Space buns' },
  { id: 'cloudCurls', label: 'Cloud curls' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'braid', label: 'Long braid' },
  { id: 'twinBraids', label: 'Twin braids' },
  { id: 'longWaves', label: 'Long waves' },
] as const

export const wingOptions = [
  { id: 'petal', label: 'Petal' },
  { id: 'luna', label: 'Luna' },
  { id: 'flutter', label: 'Flutter' },
] as const

export const hairColorOptions = [
  { id: 'midnight', label: 'Midnight', color: 0x2a2330 },
  { id: 'plum', label: 'Plum', color: 0x422b45 },
  { id: 'chestnut', label: 'Chestnut', color: 0x5a3627 },
  { id: 'auburn', label: 'Auburn', color: 0x9a4a2c },
  { id: 'honey', label: 'Honey', color: 0xd9a55c },
  { id: 'moonlight', label: 'Moonlight', color: 0xd8c5aa },
  { id: 'rose', label: 'Rose', color: 0xf0a3c0 },
  { id: 'lavender', label: 'Lavender', color: 0xb89de6 },
  { id: 'sky', label: 'Sky', color: 0x8ec8ef },
  { id: 'mint', label: 'Mint', color: 0x98dcc0 },
] as const

export const dressOptions = [
  { id: 'rose', label: 'Rose', color: 0xe88eae },
  { id: 'blossom', label: 'Blossom', color: 0xf6bfd2 },
  { id: 'coral', label: 'Coral', color: 0xf29a84 },
  { id: 'buttercup', label: 'Buttercup', color: 0xf1d27a },
  { id: 'fern', label: 'Fern', color: 0x7fa783 },
  { id: 'mint', label: 'Mint', color: 0x9ed8c0 },
  { id: 'sky', label: 'Sky', color: 0x8fc3ea },
  { id: 'moon', label: 'Moon', color: 0x8c9ee8 },
  { id: 'lilac', label: 'Lilac', color: 0xc3a3e8 },
  { id: 'berry', label: 'Berry', color: 0xa4497a },
] as const

// Each wing color brings a matching sparkle for the dust trail and glow.
export const wingColorOptions = [
  { id: 'dewdrop', label: 'Dewdrop', color: 0xc6f3ff, sparkle: 0xffc786 },
  { id: 'moonbeam', label: 'Moonbeam', color: 0xd9d2ff, sparkle: 0x9fc8ff },
  { id: 'leaf', label: 'Leaf', color: 0xcaf2c0, sparkle: 0xb9e493 },
  { id: 'blush', label: 'Blush', color: 0xffcfe2, sparkle: 0xffa8c8 },
  { id: 'peach', label: 'Peach', color: 0xffd9b8, sparkle: 0xffb98a },
  { id: 'lemon', label: 'Lemon', color: 0xfff1a8, sparkle: 0xffe07a },
  { id: 'aqua', label: 'Aqua', color: 0xa8f0e6, sparkle: 0x7fe8d8 },
  { id: 'periwinkle', label: 'Periwinkle', color: 0xb5c4ff, sparkle: 0x9fb0ff },
  { id: 'violet', label: 'Violet', color: 0xd6b3ff, sparkle: 0xc79cff },
  { id: 'pearl', label: 'Pearl', color: 0xf4f1ea, sparkle: 0xfff0d0 },
] as const

export const skinOptions = [
  { id: 'porcelain', label: 'Porcelain', color: 0xf8dccb },
  { id: 'peach', label: 'Peach', color: 0xefba9f },
  { id: 'rosy', label: 'Rosy', color: 0xe8a98f },
  { id: 'honey', label: 'Honey', color: 0xd9a07a },
  { id: 'golden', label: 'Golden', color: 0xc68a5e },
  { id: 'caramel', label: 'Caramel', color: 0xa86c45 },
  { id: 'bronze', label: 'Bronze', color: 0x8a5535 },
  { id: 'cocoa', label: 'Cocoa', color: 0x6b3f28 },
  { id: 'lilac', label: 'Lilac', color: 0xd7c3ef },
  { id: 'seafoam', label: 'Seafoam', color: 0xbfe6d4 },
] as const

export const lookOptions = {
  hair: hairOptions,
  hairColor: hairColorOptions,
  dress: dressOptions,
  wings: wingOptions,
  wingColor: wingColorOptions,
  skin: skinOptions,
} as const

export type LookPart = keyof typeof lookOptions
export type HairStyle = typeof hairOptions[number]['id']
export type WingStyle = typeof wingOptions[number]['id']

export type FairyLook = { [Part in LookPart]: typeof lookOptions[Part][number]['id'] }

export const defaultFairyLook: FairyLook = {
  hair: 'bun',
  hairColor: 'plum',
  dress: 'rose',
  wings: 'petal',
  wingColor: 'dewdrop',
  skin: 'peach',
}

// Looks saved before per-part colors used one of these palettes.
const legacyPalettes: Record<string, Pick<FairyLook, 'hairColor' | 'dress' | 'wingColor'>> = {
  rose: { hairColor: 'plum', dress: 'rose', wingColor: 'dewdrop' },
  moon: { hairColor: 'moonlight', dress: 'moon', wingColor: 'moonbeam' },
  fern: { hairColor: 'chestnut', dress: 'fern', wingColor: 'leaf' },
}

export function isLookValue<Part extends LookPart>(part: Part, value: unknown): value is FairyLook[Part] {
  return lookOptions[part].some(({ id }) => id === value)
}

// Keep each valid saved part and use the default for the others.
export function parseFairyLook(value: unknown): FairyLook {
  if (!value || typeof value !== 'object') return { ...defaultFairyLook }
  const saved = value as Record<string, unknown>
  const legacy = typeof saved.palette === 'string' && Object.hasOwn(legacyPalettes, saved.palette)
    ? legacyPalettes[saved.palette]
    : {}
  const look: Record<string, unknown> = { ...defaultFairyLook, ...legacy }
  for (const part of Object.keys(lookOptions) as LookPart[]) {
    if (isLookValue(part, saved[part])) look[part] = saved[part]
  }
  return look as FairyLook
}

function colorOf<Option extends { id: string }>(options: readonly Option[], id: string) {
  return options.find(option => option.id === id)!
}

export function lookColors(look: FairyLook) {
  const wings = colorOf(wingColorOptions, look.wingColor)
  return {
    hair: colorOf(hairColorOptions, look.hairColor).color,
    dress: colorOf(dressOptions, look.dress).color,
    wings: wings.color,
    sparkle: wings.sparkle,
    skin: colorOf(skinOptions, look.skin).color,
  }
}
