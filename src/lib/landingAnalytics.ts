type EventData = Record<string, string | number>;
type UmamiPayload = Record<string, unknown>;

type UmamiWindow = Window & {
  umami?: {
    track: (name: string, data: EventData) => void;
  };
  dataskeinUmamiBeforeSend?: (type: string, payload: UmamiPayload) => UmamiPayload | false;
};

type LandingEventTracker = {
  cta: (action: string, location: string, target: string) => void;
  section: (section: string) => void;
  scroll: (percentage: number) => void;
  engaged: (seconds: number) => void;
};

const allowedCtas = new Set([
  'explore-sample|hero|sample',
  'explore-sample|final|sample',
  'open-app|hero|app',
  'open-app|nav|app',
  'read-threat-model|privacy|threat-model',
  'view-release|hero|releases',
  'view-source|final|github',
]);
const allowedSections = new Set(['product', 'workflow', 'privacy', 'principles', 'faq', 'final']);
const scrollThresholds = [25, 50, 75, 100] as const;
const engagedThresholds = [30, 60, 120] as const;
const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
const safeUtmValue = /^[A-Za-z0-9._~-]{1,64}$/u;

function privacySignalEnabled(navigatorLike: Navigator): boolean {
  return (
    navigatorLike.doNotTrack === '1' ||
    (navigatorLike as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

function sanitizeUrl(value: string, baseUrl: string): string {
  try {
    const source = new URL(value, baseUrl);
    const safe = new URLSearchParams();
    for (const key of utmKeys) {
      const candidate = source.searchParams.get(key);
      if (candidate && safeUtmValue.test(candidate)) safe.set(key, candidate);
    }
    const query = safe.toString();
    return query ? `/?${query}` : '/';
  } catch {
    return '/';
  }
}

function sanitizeRecord(record: UmamiPayload, baseUrl: string): UmamiPayload {
  const sanitized = { ...record };
  if (typeof sanitized.url === 'string') sanitized.url = sanitizeUrl(sanitized.url, baseUrl);
  if (typeof sanitized.referrer === 'string') {
    try {
      sanitized.referrer = new URL(sanitized.referrer, baseUrl).origin;
    } catch {
      sanitized.referrer = '';
    }
  }
  return sanitized;
}

export function sanitizeUmamiPayload(
  payload: UmamiPayload,
  navigatorLike: Navigator = navigator,
  baseUrl: string = window.location.origin,
): UmamiPayload | false {
  if (privacySignalEnabled(navigatorLike)) return false;
  const sanitized = sanitizeRecord(payload, baseUrl);
  if (
    sanitized.payload &&
    typeof sanitized.payload === 'object' &&
    !Array.isArray(sanitized.payload)
  ) {
    sanitized.payload = sanitizeRecord(sanitized.payload as UmamiPayload, baseUrl);
  }
  return sanitized;
}

export function createLandingEventTracker(
  send: (name: string, data: EventData) => void,
): LandingEventTracker {
  const seen = new Set<string>();
  const once = (key: string, name: string, data: EventData) => {
    if (seen.has(key)) return;
    seen.add(key);
    send(name, data);
  };

  return {
    cta(action, location, target) {
      if (allowedCtas.has(`${action}|${location}|${target}`)) {
        send('landing-cta', { action, location, target });
      }
    },
    section(section) {
      if (allowedSections.has(section)) {
        once(`section:${section}`, 'landing-section-view', { section });
      }
    },
    scroll(percentage) {
      for (const depth of scrollThresholds) {
        if (percentage >= depth) once(`scroll:${depth}`, 'landing-scroll-depth', { depth });
      }
    },
    engaged(seconds) {
      for (const threshold of engagedThresholds) {
        if (seconds >= threshold) {
          once(`engaged:${threshold}`, 'landing-engaged-time', { seconds: threshold });
        }
      }
    },
  };
}

export function startLandingAnalytics({
  websiteId,
  scriptUrl,
}: {
  websiteId: string;
  scriptUrl: string;
}): () => void {
  if (!websiteId || !scriptUrl || privacySignalEnabled(navigator)) return () => undefined;

  const browser = window as UmamiWindow;
  const queued: Array<[string, EventData]> = [];
  const send = (name: string, data: EventData) => {
    if (privacySignalEnabled(navigator)) return;
    if (browser.umami) browser.umami.track(name, data);
    else if (queued.length < 32) queued.push([name, data]);
  };
  const tracker = createLandingEventTracker(send);

  let script = document.querySelector<HTMLScriptElement>(
    'script[data-dataskein-landing-analytics]',
  );
  const flush = () => {
    if (!browser.umami || privacySignalEnabled(navigator)) return;
    for (const [name, data] of queued.splice(0)) browser.umami.track(name, data);
  };
  if (!script) {
    browser.dataskeinUmamiBeforeSend = (_type, payload) => sanitizeUmamiPayload(payload);
    script = document.createElement('script');
    script.defer = true;
    script.src = scriptUrl;
    script.dataset.websiteId = websiteId;
    script.dataset.doNotTrack = 'true';
    script.dataset.domains = 'dataskein.vercel.app';
    script.dataset.beforeSend = 'dataskeinUmamiBeforeSend';
    script.dataset.dataskeinLandingAnalytics = 'true';
    document.head.append(script);
  }
  script.addEventListener('load', flush);
  flush();

  const handleClick = (event: MouseEvent) => {
    const element = (event.target as Element | null)?.closest<HTMLElement>(
      '[data-analytics-action]',
    );
    if (!element) return;
    tracker.cta(
      element.dataset.analyticsAction ?? '',
      element.dataset.analyticsLocation ?? '',
      element.dataset.analyticsTarget ?? '',
    );
  };
  document.addEventListener('click', handleClick);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          tracker.section((entry.target as HTMLElement).dataset.analyticsSection ?? '');
        }
      }
    },
    { threshold: 0.35 },
  );
  document
    .querySelectorAll<HTMLElement>('[data-analytics-section]')
    .forEach((section) => observer.observe(section));

  const handleScroll = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    tracker.scroll(available <= 0 ? 100 : (window.scrollY / available) * 100);
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  let engagedSeconds = 0;
  const interval = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      engagedSeconds += 1;
      tracker.engaged(engagedSeconds);
    }
  }, 1000);

  return () => {
    script?.removeEventListener('load', flush);
    document.removeEventListener('click', handleClick);
    window.removeEventListener('scroll', handleScroll);
    window.clearInterval(interval);
    observer.disconnect();
  };
}
