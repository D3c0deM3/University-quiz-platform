/**
 * Generates a soft device fingerprint from browser properties.
 * This is NOT meant to be a hard block — it's a risk signal.
 * 
 * Components:
 * - Generated device ID (persisted in localStorage when available)
 * - Browser family (user agent)
 * - OS / platform
 * - Timezone
 * - Language
 *
 * Volatile values (like screen size/orientation) are intentionally excluded
 * to prevent false fingerprint changes on mobile devices.
 */

let memoryDeviceId: string | null = null;

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateDeviceId(): string {
  const key = '__device_id';

  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = createId();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    // Ignore storage-denied contexts (private mode / strict browsers).
  }

  if (!memoryDeviceId) {
    memoryDeviceId = createId();
  }
  return memoryDeviceId;
}

export function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const components = [
    getOrCreateDeviceId(),
    navigator.userAgent,
    navigator.platform || '',
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  ];

  return components.join('|');
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;
  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('Mac')) return 'Mac Device';
  if (ua.includes('Windows')) return 'Windows Device';
  if (ua.includes('Linux')) return 'Linux Device';
  return 'Unknown Device';
}
