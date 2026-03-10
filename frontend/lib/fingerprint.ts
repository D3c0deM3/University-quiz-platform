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

function hashString(str: string): string {
  // Simple hash for client-side fingerprint — the server will SHA-256 it
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
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
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  // Detect browser
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return `${browser} on ${os}`;
}
