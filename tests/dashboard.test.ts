import { describe, expect, it } from 'vitest';
import { buildDashboardHtml, escapeHtml } from '../src/lib/dashboard';
import type { DashboardCard } from '../src/types';

describe('standalone dashboard export', () => {
  it('escapes untrusted titles, labels, source names, and SQL', () => {
    const card: DashboardCard = {
      id: '1',
      sourceName: '<img src=x onerror=alert(1)>',
      query: "SELECT '<script>alert(1)</script>'",
      spec: {
        id: 'chart',
        title: '<script>alert(1)</script>',
        type: 'bar',
        dimension: 'name',
        measure: 'value',
        aggregation: 'sum',
      },
      data: [{ label: '<svg onload=alert(1)>', value: 10 }],
    };
    const html = buildDashboardHtml([card], new Date('2026-07-29T12:00:00Z'));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<svg onload=');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('2026-07-29T12:00:00.000Z');
  });

  it('escapes all five HTML-sensitive characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('preserves line and area semantics and renders a signed zero baseline', () => {
    const base: DashboardCard = {
      id: '1',
      sourceName: 'sales.csv',
      query: 'SELECT 1',
      spec: {
        id: 'chart',
        title: 'Change',
        type: 'line',
        dimension: 'month',
        measure: 'change',
        aggregation: 'sum',
      },
      data: [
        { label: 'Jan', value: -10 },
        { label: 'Feb', value: 20 },
      ],
    };

    const line = buildDashboardHtml([base]);
    expect(line).toContain('<polyline');
    expect(line).not.toContain('<rect');
    expect(line).toContain('y1="');

    const area = buildDashboardHtml([{ ...base, spec: { ...base.spec, type: 'area' } }]);
    expect(area).toContain('<polygon');
    expect(area).toContain('<polyline');
  });
});
