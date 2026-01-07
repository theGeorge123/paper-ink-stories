export type PerformanceMetric = {
  name: string;
  value: number;
  unit?: string;
};

export type DemoTelemetryPayload = Record<string, unknown>;

const logMetric = (metric: PerformanceMetric): void => {
  const unitLabel = metric.unit ? ` ${metric.unit}` : '';
  console.info(`[performance] ${metric.name}: ${metric.value}${unitLabel}`);
};

const observeMetrics = (entryType: string, handler: (entry: PerformanceEntry) => void): void => {
  if (typeof PerformanceObserver === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(handler);
  });

  observer.observe({ type: entryType, buffered: true });
};

/**
 * Initialize lightweight performance metric logging in supported browsers.
 */
export const initPerformanceMonitoring = (): void => {
  if (typeof window === 'undefined' || typeof performance === 'undefined') return;

  observeMetrics('paint', (entry) => {
    if (entry.name === 'first-contentful-paint') {
      logMetric({ name: 'first-contentful-paint', value: entry.startTime, unit: 'ms' });
    }
  });

  observeMetrics('largest-contentful-paint', (entry) => {
    logMetric({ name: 'largest-contentful-paint', value: entry.startTime, unit: 'ms' });
  });

  observeMetrics('layout-shift', (entry) => {
    const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
    if (!layoutShift.hadRecentInput && typeof layoutShift.value === 'number') {
      logMetric({ name: 'cumulative-layout-shift', value: layoutShift.value });
    }
  });

  observeMetrics('first-input', (entry) => {
    const firstInput = entry as PerformanceEntry & { processingStart?: number; startTime?: number };
    if (typeof firstInput.processingStart === 'number' && typeof firstInput.startTime === 'number') {
      logMetric({ name: 'first-input-delay', value: firstInput.processingStart - firstInput.startTime, unit: 'ms' });
    }
  });
};

export const trackDemoEvent = (event: string, payload?: DemoTelemetryPayload): void => {
  if (typeof window === 'undefined') return;
  const details = payload ? ` ${JSON.stringify(payload)}` : '';
  console.info(`[demo] ${event}${details}`);
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    performance.mark(`demo:${event}`);
  }
};
