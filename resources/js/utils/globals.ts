/**
 * Single registration point for browser globals exposed by the package.
 * Namespace writes are merged so importing a secondary entrypoint cannot
 * erase helpers registered by the main entrypoint.
 */
export type BrowserGlobalValue = unknown;

export function setWindowGlobal(name: string, value: BrowserGlobalValue): void {
  if (typeof window === 'undefined') return;

  (window as unknown as Record<string, BrowserGlobalValue>)[name] = value;
}

export function getFilamentReactNamespace(): Record<string, BrowserGlobalValue> {
  if (typeof window === 'undefined') return {};

  const current = window.FilamentReact;
  const namespace: Record<string, BrowserGlobalValue> =
    current && typeof current === 'object' ? (current as Record<string, BrowserGlobalValue>) : {};

  setWindowGlobal('FilamentReact', namespace);
  return namespace;
}

export function registerFilamentReactGlobals(
  globals: Record<string, BrowserGlobalValue>
): Record<string, BrowserGlobalValue> {
  const namespace = getFilamentReactNamespace();
  Object.assign(namespace, globals);
  setWindowGlobal('FilamentReact', namespace);
  return namespace;
}
