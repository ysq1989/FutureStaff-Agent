/** Refresh display projections without restarting a session or its business UI. */
export function startProfileSync({ read, apply, onError, target = window, document = globalThis.document, intervalMs = 30000 }) {
  let stopped = false, active = null, revision = 0;
  async function refresh(force = false) {
    if (stopped || document.visibilityState === 'hidden' || (active && !force)) return;
    if (active) active.abort();
    const controller = new AbortController(), current = ++revision;
    active = controller;
    try {
      const value = await read(controller.signal);
      if (!stopped && current === revision && !controller.signal.aborted) apply(value);
    } catch (error) {
      if (!stopped && current === revision && !controller.signal.aborted && onError) onError(error);
    } finally {
      if (active === controller) active = null;
    }
  }
  const foreground = () => { void refresh(true); };
  const timer = target.setInterval(() => { void refresh(); }, intervalMs);
  target.addEventListener('focus', foreground);
  document.addEventListener('visibilitychange', foreground);
  return () => {
    stopped = true; revision++;
    if (active) active.abort();
    target.clearInterval(timer);
    target.removeEventListener('focus', foreground);
    document.removeEventListener('visibilitychange', foreground);
  };
}
