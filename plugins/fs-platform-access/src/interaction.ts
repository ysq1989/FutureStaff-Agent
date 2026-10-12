/** Host-only shared lifecycle. Business adapters must authorize before checked(). */
export interface InteractionView {
  schemaVersion: 1
  module: string
  viewId: string
  sessionId: string
  kind: string
  title: string
  data: unknown
}
export interface OwnedView<V extends InteractionView> {
  view: V
  owner: string
  policy: string
  expires: number
  signal?: AbortSignal
}
export class InteractionRegistry<V extends InteractionView, S extends OwnedView<V> = OwnedView<V>> {
  private entries = new Map<string, S>()
  private listeners = new Set<(view: V, owner: string) => void>()
  private now: () => number
  private ttlMs: number
  private capacity: number
  private error: string
  constructor(readonly module: string, options: {now?: () => number; ttlMs?: number; capacity?: number; invalidError?: string} = {}) {
    this.now = options.now ?? Date.now
    this.ttlMs = options.ttlMs ?? 600000
    this.capacity = options.capacity ?? 100
    this.error = options.invalidError ?? 'INTERACTION_VIEW_EXPIRED'
    if (!module || !Number.isFinite(this.ttlMs) || this.ttlMs <= 0 || !Number.isInteger(this.capacity) || this.capacity < 1) throw Error('INTERACTION_CONFIG_INVALID')
  }
  put(value: Omit<S, 'expires'>): V {
    const view = value.view
    if (view.schemaVersion !== 1 || view.module !== this.module || !view.viewId || !view.sessionId || view.sessionId.length > 128 || !value.owner || !value.policy) throw Error('INTERACTION_VIEW_INVALID')
    // A view id is immutable: replacement could associate an old confirmation with new data.
    if (this.entries.has(view.viewId)) throw Error('INTERACTION_VIEW_DUPLICATE')
    for (const [id, entry] of this.entries) if (entry.expires <= this.now()) this.entries.delete(id)
    if (this.entries.size >= this.capacity) this.entries.delete(this.entries.keys().next().value!)
    this.entries.set(view.viewId, {...value, expires: this.now() + this.ttlMs} as S)
    for (const listener of this.listeners) {
      try { listener(view, value.owner) } catch { /* Presentation cannot roll back a business fact. */ }
    }
    return view
  }
  checked(id: string, sessionId: string, owner: string, policy: string): S {
    const saved = this.entries.get(id)
    if (!saved || saved.expires <= this.now() || saved.signal?.aborted || saved.view.sessionId !== sessionId || saved.owner !== owner || saved.policy !== policy) throw Error(this.error)
    return saved
  }
  subscribe(listener: (view: V, owner: string) => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }
  clear(): void { this.entries.clear(); this.listeners.clear() }
}

type Binding<V> = {owner: string; signal: AbortSignal; receive: (view: V, sourceId: string) => Promise<void>; release: () => void; results: Map<string, Promise<boolean>>}
/** Business facts go to the original runtime, never a renderer-selected recipient. */
export class InteractionReturnChannel<V extends InteractionView = InteractionView> {
  private bindings = new Map<string, Binding<V>>()
  bind(sessionId: string, owner: string, receive: Binding<V>['receive'], signal: AbortSignal): void {
    signal.throwIfAborted()
    const previous = this.bindings.get(sessionId)
    if (previous?.owner === owner && previous.signal === signal) { previous.receive = receive; return }
    previous?.release()
    const binding: Binding<V> = {owner, signal, receive, results:previous?.owner === owner ? previous.results : new Map(), release:() => {
      signal.removeEventListener('abort', binding.release)
      if (this.bindings.get(sessionId) === binding) this.bindings.delete(sessionId)
    }}
    this.bindings.set(sessionId, binding)
    signal.addEventListener('abort', binding.release, {once:true})
  }
  async deliver(sourceId: string, view: V, owner: string): Promise<boolean> {
    const binding = this.bindings.get(view.sessionId)
    if (!binding || binding.owner !== owner || binding.signal.aborted) return false
    const previous = binding.results.get(sourceId)
    if (previous) return previous
    // Publish the promise before callback execution so concurrent clicks share delivery.
    const pending = Promise.resolve().then(async () => {
      binding.signal.throwIfAborted()
      if (this.bindings.get(view.sessionId) !== binding) return false
      await binding.receive(view, sourceId)
      return true
    })
    binding.results.set(sourceId, pending)
    try { return await pending } catch (error) { binding.results.delete(sourceId); throw error }
  }
  unbind(sessionId: string): void { this.bindings.get(sessionId)?.release() }
  clear(): void { for (const binding of [...this.bindings.values()]) binding.release() }
}
