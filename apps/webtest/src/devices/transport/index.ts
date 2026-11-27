import { createDesktopTransport } from './desktopTransport';
import type { HardwareTransport } from './types';
import { webTransport } from './webTransport';

export * from './types';

declare global {
  var backendUrl: string | undefined;
}

let activeTransport: HardwareTransport = webTransport;
let initPromise: Promise<HardwareTransport> | null = null;

async function waitForBackendUrl(timeoutMs = 1500): Promise<string | undefined> {
  if (globalThis.backendUrl) return globalThis.backendUrl;
  if (location.hostname !== 'mcm.invalid') return undefined;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (globalThis.backendUrl) return globalThis.backendUrl;
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  return globalThis.backendUrl;
}

export async function initTransport(): Promise<HardwareTransport> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const isLoopback = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname);
    const isWebView = location.hostname === 'mcm.invalid';
    if (!isWebView && !isLoopback) {
      activeTransport = webTransport;
      return activeTransport;
    }

    const injectedUrl = await waitForBackendUrl();
    const candidateBase = injectedUrl ? injectedUrl.replace(/\/$/, '') : '';

    if (isWebView && !candidateBase) {
      activeTransport = webTransport;
      return activeTransport;
    }

    try {
      const res = await fetch(`${candidateBase}/MaiChartManagerServlet/HardwareBridgeStatusApi`, {
        signal: AbortSignal.timeout(1200),
      });
      if (res.ok) {
        const status = (await res.json()) as { available?: boolean };
        if (status.available) {
          activeTransport = createDesktopTransport(candidateBase);
          return activeTransport;
        }
      }
    } catch {
      // Standalone web server or non-Windows backend: silently fall back to Web APIs
    }

    activeTransport = webTransport;
    return activeTransport;
  })();

  return initPromise;
}

export function getTransport(): HardwareTransport {
  return activeTransport;
}

export function isDesktopTransport(): boolean {
  return activeTransport.kind === 'desktop';
}
