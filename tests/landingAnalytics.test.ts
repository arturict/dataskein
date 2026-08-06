import { describe, expect, it, vi } from 'vitest';

import {
  createLandingEventTracker,
  sanitizeUmamiPayload,
  startLandingAnalytics,
} from '../src/lib/landingAnalytics';

describe('landing analytics event contract', () => {
  it('emits only bounded CTA values', () => {
    const send = vi.fn();
    const tracker = createLandingEventTracker(send);

    tracker.cta('explore-sample', 'hero', 'sample');
    tracker.cta('arbitrary', 'hero', 'sample');

    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith('landing-cta', {
      action: 'explore-sample',
      location: 'hero',
      target: 'sample',
    });
  });

  it('emits section, scroll, and engaged thresholds exactly once', () => {
    const send = vi.fn();
    const tracker = createLandingEventTracker(send);

    tracker.section('privacy');
    tracker.section('privacy');
    tracker.section('unknown');
    tracker.scroll(76);
    tracker.scroll(100);
    tracker.scroll(100);
    tracker.engaged(60);
    tracker.engaged(120);

    expect(send.mock.calls).toEqual([
      ['landing-section-view', { section: 'privacy' }],
      ['landing-scroll-depth', { depth: 25 }],
      ['landing-scroll-depth', { depth: 50 }],
      ['landing-scroll-depth', { depth: 75 }],
      ['landing-scroll-depth', { depth: 100 }],
      ['landing-engaged-time', { seconds: 30 }],
      ['landing-engaged-time', { seconds: 60 }],
      ['landing-engaged-time', { seconds: 120 }],
    ]);
  });

  it('wires the privacy-conscious landing runtime and cleans up listeners', () => {
    vi.useFakeTimers();
    document.head.innerHTML = '';
    document.body.innerHTML = `
      <section data-analytics-section="privacy"></section>
      <a data-analytics-action="open-app" data-analytics-location="nav" data-analytics-target="app">
        <span>Open app</span>
      </a>
    `;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 500 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });

    let intersectionCallback: IntersectionObserverCallback = () => undefined;
    const disconnect = vi.fn();
    const observe = vi.fn();
    class FakeIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = '';
      readonly thresholds = [0.35];

      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }

      disconnect = disconnect;
      observe = observe;
      takeRecords = () => [];
      unobserve = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);

    const cleanup = startLandingAnalytics({
      websiteId: 'test-website-id',
      scriptUrl: 'https://umami.example/script.js',
    });
    const script = document.querySelector<HTMLScriptElement>(
      'script[data-dataskein-landing-analytics]',
    );
    expect(script).toHaveAttribute('data-website-id', 'test-website-id');
    expect(script).toHaveAttribute('data-do-not-track', 'true');
    expect(script).toHaveAttribute('data-domains', 'dataskein.vercel.app');
    expect(script).toHaveAttribute('data-before-send', 'dataskeinUmamiBeforeSend');
    expect(observe).toHaveBeenCalledOnce();

    const track = vi.fn();
    const browser = window as Window & {
      umami?: { track: (name: string, data: Record<string, string | number>) => void };
    };
    browser.umami = { track };
    script?.dispatchEvent(new Event('load'));

    const section = document.querySelector<HTMLElement>('[data-analytics-section]');
    intersectionCallback(
      [{ isIntersecting: true, target: section } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    document.querySelector('span')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.scrollY = 500;
    window.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(120_000);

    expect(track).toHaveBeenCalledWith('landing-section-view', { section: 'privacy' });
    expect(track).toHaveBeenCalledWith('landing-cta', {
      action: 'open-app',
      location: 'nav',
      target: 'app',
    });
    expect(track).toHaveBeenCalledWith('landing-scroll-depth', { depth: 100 });
    expect(track).toHaveBeenCalledWith('landing-engaged-time', { seconds: 120 });

    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    delete browser.umami;
  });

  it('keeps only safe standard UTM values and strips referrer paths', () => {
    const navigatorLike = { doNotTrack: '0', globalPrivacyControl: false } as unknown as Navigator;
    expect(
      sanitizeUmamiPayload(
        {
          payload: {
            url: '/?utm_source=reddit&utm_campaign=oss_launch&email=secret%40example.com&utm_term=bad value',
            referrer: 'https://www.reddit.com/r/selfhosted/comments/private-thread?user=42',
          },
        },
        navigatorLike,
        'https://dataskein.vercel.app',
      ),
    ).toEqual({
      payload: {
        url: '/?utm_source=reddit&utm_campaign=oss_launch',
        referrer: 'https://www.reddit.com',
      },
    });
  });

  it('fails closed for Global Privacy Control', () => {
    const navigatorLike = { globalPrivacyControl: true } as unknown as Navigator;
    expect(sanitizeUmamiPayload({ url: '/?utm_source=reddit' }, navigatorLike)).toBe(false);
  });
});
