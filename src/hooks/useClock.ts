import { useState, useEffect } from 'react';

/**
 * Centered Clock Hook
 * Provides a single source of truth for "now" across the application.
 * Syncs to the system clock with 1s resolution.
 */
export function useClock() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    // Determine the exact delay until the next full second to align the cycle
    const nowMs = Date.now();
    const delayToNextSecond = 1000 - (nowMs % 1000);

    const timeout = setTimeout(() => {
      setNow(Date.now());
      const interval = setInterval(() => {
        setNow(Date.now());
      }, 1000);

      return () => clearInterval(interval);
    }, delayToNextSecond);

    return () => clearTimeout(timeout);
  }, []);

  return now;
}
