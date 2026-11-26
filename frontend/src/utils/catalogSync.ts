const CATALOG_SYNC_CHANNEL = 'imanya_catalog_sync';
const CATALOG_SYNC_STORAGE_KEY = 'imanya_catalog_updated_at';

/**
 * Broadcasts a catalog update signal across browser tabs/windows and within the same tab.
 * Used when Admin creates, edits, or deletes a product or discount so customer views
 * immediately re-fetch authoritative pricing and discount state.
 */
export const notifyCatalogUpdated = (): void => {
  const timestamp = String(Date.now());

  try {
    localStorage.setItem(CATALOG_SYNC_STORAGE_KEY, timestamp);
  } catch {
    // Ignore storage quota / private mode issues
  }

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CATALOG_SYNC_CHANNEL);
      channel.postMessage({ type: 'CATALOG_UPDATED', timestamp });
      channel.close();
    }
  } catch {
    // Ignore BroadcastChannel unavailability
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('imanya:catalog-updated', { detail: { timestamp } }));
  }
};

/**
 * Subscribes to catalog update notifications from same-tab events, cross-tab BroadcastChannel,
 * and localStorage storage events. Returns an unsubscribe cleanup callback.
 */
export const subscribeCatalogUpdated = (onUpdate: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (e: StorageEvent) => {
    if (e.key === CATALOG_SYNC_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleCustomEvent = () => {
    onUpdate();
  };

  let channel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(CATALOG_SYNC_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === 'CATALOG_UPDATED') {
          onUpdate();
        }
      };
    }
  } catch {
    channel = null;
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener('imanya:catalog-updated', handleCustomEvent);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('imanya:catalog-updated', handleCustomEvent);
    if (channel) {
      channel.close();
    }
  };
};
