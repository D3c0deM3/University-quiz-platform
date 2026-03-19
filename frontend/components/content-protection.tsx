'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

/**
 * ContentProtection — blocks screenshots, screen recording, and
 * navigates away from protected pages when the browser loses focus.
 *
 * Desktop: redirect to dashboard on focus loss.
 * Mobile:  detect screenshot (visibility change pattern) and force logout.
 *
 * Techniques:
 * 1. CSS: disable selection, printing, dragging
 * 2. JS polling: check focus on desktop
 * 3. KeyDown/KeyUp: intercept PrintScreen, devtools, copy, etc.
 * 4. Visibility/blur events: redirect (desktop) or logout (mobile)
 * 5. Context menu disabled
 * 6. Full-screen black overlay on trigger
 */

const PROTECTED_PATH_PREFIXES = [
  '/subjects',
  '/quizzes',
  '/materials',
  '/questions',
  '/search',
  '/quiz-history',
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
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
  const logout = useAuthStore((s) => s.logout);
  const isProtected = isProtectedPath(pathname);
  const overlayRef = useRef<HTMLDivElement>(null);
  const redirectingRef = useRef(false);
  // Track rapid visibility changes (screenshot pattern on mobile)
  const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAtRef = useRef<number>(0);

  /** Show full-screen overlay + blur body synchronously. */
  const showOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.style.display = 'flex';
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

  /** Show overlay and navigate to dashboard (desktop). */
  const protectAndRedirect = useCallback(() => {
    // UPDATED: Instead of navigating away (losing progress), just show overlay
    // router.push('/dashboard');
    showOverlay();
  }, [showOverlay, router]);

  /** Show overlay and force logout (mobile screenshot). */
  const protectAndLogout = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    showOverlay();
    logout();
  }, [showOverlay, logout]);

  // ── Polling: continuously check focus (desktop only) ──
  useEffect(() => {
    if (!isProtected) return;
    if (isMobileDevice()) return;
    redirectingRef.current = false;

    const interval = setInterval(() => {
      if (!document.hasFocus()) {
        protectAndRedirect();
        // Do not stop polling — continue monitoring focus state
        // clearInterval(interval);
      } else {
        // Optional: Ensure overlay is hidden if focused (redundant with handleFocus but safe)
        // hideOverlay(); 
      }
    }, 500); // Relaxed interval

    return () => clearInterval(interval);
  }, [isProtected, protectAndRedirect]);

  // ── Block keyboard shortcuts ──
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!isProtected) return;

      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showOverlay();
        try { navigator.clipboard?.writeText?.(''); } catch {}
        protectAndRedirect();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); return; }
      if (e.key === 'F12') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); return; }
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

  // ── Visibility change ──
  // Desktop: redirect on tab switch
  // Mobile: detect screenshot pattern (brief hidden→visible) and logout
  const handleVisibilityChange = useCallback(() => {
    if (!isProtected) return;

    if (isMobileDevice()) {
      if (document.hidden) {
        // Page went hidden — record timestamp and show overlay immediately
        hiddenAtRef.current = Date.now();
        showOverlay();
      } else {
        // Page became visible again
        const hiddenDuration = Date.now() - hiddenAtRef.current;

        // Screenshot on most mobile devices causes a very brief visibility change
        // (< 3 seconds). Longer durations indicate app switch which we also treat
        // as suspicious on protected pages.
        if (hiddenAtRef.current > 0) {
          if (hiddenDuration < 3000) {
            // Brief flash — likely screenshot. Force logout.
            protectAndLogout();
          } else {
            // Longer absence — app was switched away. Also force logout.
            protectAndLogout();
          }
        }
      }
    } else {
      // Desktop — show overlay on tab switch
      if (document.hidden) {
        protectAndRedirect();
      } else {
        // Desktop — tab became visible -> Hide overlay
        hideOverlay();
      }
    }
  }, [isProtected, showOverlay, protectAndRedirect, protectAndLogout, hideOverlay]);

  // Window blur — desktop only redirect, mobile logout
  const handleBlur = useCallback(() => {
    if (!isProtected) return;
    if (isMobileDevice()) {
      // On mobile, blur can fire when notification bar is pulled down
      // or when screenshot dialog appears. Show overlay immediately.
      showOverlay();
    } else {
      protectAndRedirect();
    }
  }, [isProtected, showOverlay, protectAndRedirect]);

  // Window focus — mobile: if overlay is showing after blur, trigger logout
  // Desktop: just hide the overlay so user can continue
  const handleFocus = useCallback(() => {
    if (!isProtected) return;
    
    if (isMobileDevice()) {
      // Mobile logic: If we showed the overlay due to blur and user came back,
      // it means they left the app (screenshot, app switcher, etc.) -> LOGOUT
      if (overlayRef.current && overlayRef.current.style.display === 'flex') { // Updated to flex
         protectAndLogout();
      }
    } else {
      // Desktop logic: User came back to the tab -> Hide overlay, continue
      hideOverlay();
    }
  }, [isProtected, protectAndLogout, hideOverlay]);

  // Register all event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKey, { capture: true });
    document.addEventListener('keyup', handleKey, { capture: true });
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKey, { capture: true });
      document.removeEventListener('keyup', handleKey, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (visibilityTimerRef.current) clearTimeout(visibilityTimerRef.current);
    };
  }, [handleKey, handleContextMenu, handleVisibilityChange, handleBlur, handleFocus]);

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
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '1.5rem',
          textAlign: 'center',
        }}
        aria-hidden="true"
      >
        <p>Please return to the browser to continue</p>
      </div>
    </>
  );
}
