import type { StateStorage } from 'zustand/middleware'

/**
 * Rehydrate a zustand persist store when another tab writes the same key.
 * Fixes stale admin lists / support tickets after register in a second tab.
 */
export function syncPersistAcrossTabs(store: {
  persist: {
    getOptions: () => { name?: string }
    rehydrate: () => Promise<void> | void
  }
}): () => void {
  if (typeof window === 'undefined') return () => {}

  const key = store.persist.getOptions().name
  if (!key) return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key !== key || event.newValue == null) return
    void store.persist.rehydrate()
  }

  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/** localStorage wrapper — same as zustand default, typed for reuse. */
export const browserStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  setItem: (name, value) => localStorage.setItem(name, value),
  removeItem: (name) => localStorage.removeItem(name),
}
