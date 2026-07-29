import { describe, expect, it } from 'vitest';

import vercelConfig from '../vercel.json';

describe('production hosting configuration', () => {
  it('serves both the workspace root and nested workspace routes from the SPA shell', () => {
    expect(vercelConfig.rewrites).toEqual(
      expect.arrayContaining([
        { source: '/app', destination: '/index.html' },
        { source: '/app/:path*', destination: '/index.html' },
      ]),
    );
  });
});
