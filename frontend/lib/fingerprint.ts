/**
 * Generates a soft device fingerprint from browser properties.
 * This is NOT meant to be a hard block — it's a risk signal.
 * 
 * Components:
 * - Browser family (user agent)
 * - OS / platform
 * - Timezone
 * - Language
 * - Screen info (resolution, color depth)
 * - Generated device ID (persisted in localStorage)
 */

function getOrCreateDeviceId(): string {
  const key = '__device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

export function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const components = [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    navigator.hardwareConcurrency?.toString() || '',
    navigator.platform || '',
    getOrCreateDeviceId(),
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
