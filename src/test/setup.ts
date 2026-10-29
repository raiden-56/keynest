// Shared Vitest setup. Node tests need nothing; jsdom tests get browser-API shims that jsdom lacks.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  }
  if (!window.crypto?.subtle) {
    Object.defineProperty(window, 'crypto', { value: globalThis.crypto, configurable: true })
  }
  if (!('scrollTo' in window) || typeof window.scrollTo !== 'function') {
    window.scrollTo = () => {}
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {}
  }
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock'
    URL.revokeObjectURL = () => {}
  }
}
