/**
 * Visitor Session & IP Tracking Client
 * Sends a lightweight background ping when an attendee opens the site link.
 * Captured on the backend (Vercel & Supabase) with IP address and timestamp.
 */

(function () {
  'use strict';

  function trackVisit() {
    try {
      // Prevent duplicate pings within the same page session load
      if (window.__visitTracked) return;
      window.__visitTracked = true;

      const payload = JSON.stringify({
        page: window.location.pathname || '/',
        url: window.location.href,
        referrer: document.referrer || '',
        screen: `${window.screen.width || 0}x${window.screen.height || 0}`,
        timestamp: new Date().toISOString()
      });

      // Prefer navigator.sendBeacon for zero performance impact
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/track-visit', blob);
      } else {
        fetch('/api/track-visit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(function () {});
      }
    } catch (e) {
      // Silent error handling to avoid disrupting visitor experience
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(trackVisit, 100);
  } else {
    window.addEventListener('DOMContentLoaded', trackVisit, { once: true });
  }
})();
