/** Keyboard and individual fingers own their actions independently. */
export function createFlightInput() {
  const keyboard = new Set<string>()
  const pointers = new Map<number, string>()
  return {
    setKey(code: string, down: boolean) { if (down) keyboard.add(code); else keyboard.delete(code) },
    press(pointer: number, code: string) { pointers.set(pointer, code) },
    release(pointer: number) { pointers.delete(pointer) },
    has(code: string) { return keyboard.has(code) || [...pointers.values()].includes(code) },
    clear() { keyboard.clear(); pointers.clear() },
  }
}
