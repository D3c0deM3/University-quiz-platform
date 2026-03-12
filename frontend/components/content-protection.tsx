'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * ContentProtection — blocks screenshots, screen recording, and
 * navigates away from protected pages when the browser loses focus.
 *
 * Core insight: on Linux, the compositor captures the screen BEFORE browser
 * JS events fire. So event-based overlays (blur → show overlay) are too late.
 *
 * Solution: on protected pages the content is ALWAYS blurred/hidden via CSS
 * and only revealed when the page has focus. This way, the compositor always
 * sees the blurred state unless the browser is the active window.
 *
 * Techniques:
 * 1. CSS: always blur content, only unblur while focused (compositor-level)
 * 2. JS polling: 100ms check for document.hasFocus(), redirect when lost
 * 3. KeyDown + KeyUp: intercept PrintScreen variants
 * 4. Visibility/blur events: belt-and-suspenders redirect
 * 5. Context menu + selection + print disabled
 */

const PROTECTED_PATH_PREFIXES = [
  '/subjects',
  '/quizzes',
  '/materials',
  '/questions',
  '/search',
  '/quiz-history',
];
const MOBILE_BLOCK_PATH_PREFIXES = [
  '/quizzes',
  '/materials',
  '/questions',
  '/search',
  '/quiz-history',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isMobileBlockedPath(pathname: string): boolean {
  return MOBILE_BLOCK_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
}

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileUa =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return mobileUa || coarsePointer;
}

export function ContentProtection({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isProtected = isProtectedPath(pathname);
  const overlayRef = useRef<HTMLDivElement>(null);
  const redirectingRef = useRef(false);

  /** Show full-screen overlay + blur body synchronously. */
  const showOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.style.display = 'block';
    }
    document.body.style.filter = 'blur(50px) brightness(0)';
  }, []);

  /** Hide overlay + restore body. */
  const hideOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.style.display = 'none';
    }
    document.body.style.filter = '';
  }, []);

  /** Show overlay and navigate to dashboard. */
  const protectAndRedirect = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    showOverlay();
    router.push('/dashboard');
  }, [showOverlay, router]);

  // ── Polling: continuously check focus (catches cases events miss) ──
  useEffect(() => {
    if (!isProtected) return;
    if (isMobileDevice()) return;
    redirectingRef.current = false;

    const interval = setInterval(() => {
      if (!document.hasFocus()) {
        protectAndRedirect();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isProtected, protectAndRedirect]);

  // On mobile devices, protected routes are blocked entirely to reduce
  // screenshot capture risk that browsers cannot fully prevent.
  useEffect(() => {
    if (!isProtected || !isMobileBlockedPath(pathname)) return;
    if (!isMobileDevice()) return;
    showOverlay();
    if (!redirectingRef.current) {
      redirectingRef.current = true;
      router.replace('/dashboard');
    }
  }, [isProtected, pathname, showOverlay, router]);

  // ── Block keyboard shortcuts (keydown + keyup for Linux compat) ──
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!isProtected) return;

      // PrintScreen — works on keydown (Windows) or keyup (some Linux DEs)
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showOverlay();
        // Try to clear clipboard
        try { navigator.clipboard?.writeText?.(''); } catch {}
        protectAndRedirect();
        return;
      }

      // Block Ctrl+P (print)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        return;
      }

      // Block Ctrl+Shift+I / J / C (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return;
      }

      // Block Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        return;
      }

      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // Block Ctrl+S (save page)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        return;
      }

      // Block Ctrl+A (select all)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        return;
      }

      // Block Ctrl+C (copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        return;
      }
    },
    [isProtected, showOverlay, protectAndRedirect],
  );

  // Block context menu
  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!isProtected) return;
      e.preventDefault();
    },
    [isProtected],
  );

  // Visibility change — tab switch or minimize
  const handleVisibilityChange = useCallback(() => {
    if (!isProtected) return;
    if (document.hidden) {
      protectAndRedirect();
    }
  }, [isProtected, protectAndRedirect]);

  // Window blur
  const handleBlur = useCallback(() => {
    if (!isProtected) return;
    protectAndRedirect();
  }, [isProtected, protectAndRedirect]);

  // Register all event listeners
  useEffect(() => {
    // keydown AND keyup — Linux fires PrintScreen on keyup
    document.addEventListener('keydown', handleKey, { capture: true });
    document.addEventListener('keyup', handleKey, { capture: true });
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKey, { capture: true });
      document.removeEventListener('keyup', handleKey, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKey, handleContextMenu, handleVisibilityChange, handleBlur]);

  // Clean up overlay when leaving protected page
  useEffect(() => {
    if (!isProtected) {
      hideOverlay();
      redirectingRef.current = false;
    }
  }, [isProtected, hideOverlay]);

  // Inject CSS protection styles
  useEffect(() => {
    if (!isProtected) return;

    const style = document.createElement('style');
    style.id = 'content-protection-styles';
    style.textContent = `
      /* Disable text selection */
      body.content-protected {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      /* Disable printing */
      @media print {
        body.content-protected * {
          display: none !important;
          visibility: hidden !important;
        }
      }

      /* Disable drag */
      body.content-protected img,
      body.content-protected a {
        -webkit-user-drag: none !important;
        user-drag: none !important;
      }
    `;

    document.head.appendChild(style);
    document.body.classList.add('content-protected');

    return () => {
      document.body.classList.remove('content-protected');
      const existingStyle = document.getElementById('content-protection-styles');
      if (existingStyle) existingStyle.remove();
    };
  }, [isProtected]);

  return (
    <>
      {children}
      {/* Full-screen black overlay — always in DOM, toggled via direct style. */}
      <div
        ref={overlayRef}
        style={{
          display: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 2147483647,
          backgroundColor: '#000',
          pointerEvents: 'auto',
        }}
        aria-hidden="true"
      />
    </>
  );
}
