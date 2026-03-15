/**
 * Hardware-based device fingerprinting.
 *
 * Generates a stable fingerprint from actual device characteristics
 * rather than a random localStorage UUID. This means the same physical
 * device will produce the same fingerprint even after clearing browser
 * data or using incognito mode.
 *
 * Components used:
 * - Canvas rendering (GPU/font rendering differences)
 * - WebGL renderer/vendor info
 * - Screen resolution + color depth
 * - Hardware concurrency (CPU cores)
 * - Device memory
 * - Platform + language + timezone
 * - Touch capability
 * - Audio context sample rate
 */

let cachedFingerprint: string | null = null;

/**
 * Simple string hashing (FNV-1a 32-bit).
 * Consistent across sessions — no crypto dependency.
 */
function fnv1aHash(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Canvas fingerprint — renders specific shapes/text and hashes the result.
 * Different GPUs, font stacks, and AA implementations produce different pixels.
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    // Draw text with specific font stack
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('UniTest fp', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('UniTest fp', 4, 17);

    // Draw arc
    ctx.beginPath();
    ctx.arc(50, 25, 10, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    return fnv1aHash(canvas.toDataURL());
  } catch {
    return 'canvas-err';
  }
}

/**
 * WebGL fingerprint — GPU vendor + renderer string.
 */
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';

    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';

    const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
    return `${vendor}~${renderer}`;
  } catch {
    return 'webgl-err';
  }
}

/**
 * Audio context sample rate — varies by device audio hardware.
 */
function getAudioFingerprint(): string {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return 'no-audio';
    const ctx = new AudioCtx();
    const rate = ctx.sampleRate;
    ctx.close().catch(() => {});
    return String(rate);
  } catch {
    return 'audio-err';
  }
}

/**
 * Collects all hardware signals and produces a stable device fingerprint.
 */
export function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';

  // Return cached value to avoid re-computing every request
  if (cachedFingerprint) return cachedFingerprint;

  const components: string[] = [
    // Hardware signals
    getCanvasFingerprint(),
    getWebGLFingerprint(),
    getAudioFingerprint(),
    `${screen.width}x${screen.height}x${screen.colorDepth}`,
    String(navigator.hardwareConcurrency || 0),
    String((navigator as any).deviceMemory || 0),
    // Platform signals
    navigator.platform || '',
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    // Touch capability
    String(navigator.maxTouchPoints || 0),
  ];

  cachedFingerprint = components.join('|');
  return cachedFingerprint;
}

/**
 * Returns a human-readable device name based on user agent.
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Unknown';

  const ua = navigator.userAgent;

  // Try to extract specific mobile model
  const androidModel = ua.match(/;\s*([^;)]+)\s*Build\//);
  if (androidModel) return androidModel[1].trim();

  if (ua.includes('iPhone')) return 'iPhone';
  if (ua.includes('iPad')) return 'iPad';
  if (ua.includes('Android')) return 'Android Device';
  if (ua.includes('Mac')) return 'Mac Device';
  if (ua.includes('Windows')) return 'Windows Device';
  if (ua.includes('Linux')) return 'Linux Device';
  return 'Unknown Device';
}
