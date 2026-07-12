// Screen Wake Lock: не даём телефону гасить экран, пока играет звук.
// В неподдерживающих браузерах (Firefox) тихо деградирует.
let lock: WakeLockSentinel | null = null;

export async function acquireWakeLock(): Promise<boolean> {
  if (!('wakeLock' in navigator)) return false;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (lock) {
    await lock.release();
    lock = null;
  }
}
