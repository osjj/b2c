// Each mounted editor for a parent observes the same draft, including a request
// started by an editor that has since unmounted after a conversation switch.
const subscriptions = new WeakMap<object, Map<string, Set<() => void>>>()

export function subscribeMailboxDraft<T>(cache: Map<string, T>, parentId: string, listener: () => void) {
  let byParent = subscriptions.get(cache)
  if (!byParent) {
    byParent = new Map()
    subscriptions.set(cache, byParent)
  }
  let listeners = byParent.get(parentId)
  if (!listeners) {
    listeners = new Set()
    byParent.set(parentId, listeners)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) byParent.delete(parentId)
  }
}

export function writeMailboxDraft<T>(cache: Map<string, T>, parentId: string, draft: T) {
  cache.set(parentId, draft)
  subscriptions.get(cache)?.get(parentId)?.forEach((listener) => listener())
}

export function canApplyMailboxAttempt(
  current: { requestKey: string; status: string } | undefined,
  next: { requestKey: string; status: string },
) {
  return current?.requestKey === next.requestKey &&
    !(current.status === 'sent' && next.status !== 'sent')
}
