export function startProfileSync<T>(options: {
  read: (signal: AbortSignal) => Promise<T>;
  apply: (value: T) => void;
  onError?: (error: unknown) => void;
  target?: Pick<Window, 'setInterval' | 'clearInterval' | 'addEventListener' | 'removeEventListener'>;
  document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  intervalMs?: number;
}): () => void;
