import type { DashboardCard } from '../types';

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function cardSvg(card: DashboardCard): string {
  const width = 720;
  const height = 320;
  const padding = 46;
  const data = card.data.slice(0, 20);
  const max = Math.max(...data.map((datum) => Math.abs(datum.value)), 1);
  const barWidth = Math.max(8, (width - padding * 2) / Math.max(data.length, 1) - 8);

  const bars = data
    .map((datum, index) => {
      const barHeight = (Math.abs(datum.value) / max) * (height - padding * 2);
      const x = padding + index * ((width - padding * 2) / Math.max(data.length, 1));
      const y = height - padding - barHeight;
      return `<g><rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="#2f6f59"/><title>${escapeHtml(
        `${datum.label}: ${datum.value}`,
      )}</title><text x="${x + barWidth / 2}" y="${height - 20}" text-anchor="middle">${escapeHtml(
        datum.label.slice(0, 10),
      )}</text></g>`;
    })
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(
    `${card.spec.title}. ${data.length} values.`,
  )}" xmlns="http://www.w3.org/2000/svg"><style>text{font:12px system-ui;fill:#40534b}</style><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#a9b8b1"/>${bars}</svg>`;
}

export function buildDashboardHtml(cards: DashboardCard[], generatedAt = new Date()): string {
  const cardsHtml = cards
    .map(
      (card) => `<article class="card">
  <p class="eyebrow">${escapeHtml(card.sourceName)}</p>
  <h2>${escapeHtml(card.spec.title)}</h2>
  ${cardSvg(card)}
  <details><summary>Reproducible query</summary><pre>${escapeHtml(card.query)}</pre></details>
</article>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>DataSkein dashboard</title>
<style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#10271f;background:#f4f1e9}
*{box-sizing:border-box}body{margin:0;padding:32px}main{max-width:1200px;margin:auto}
header{margin-bottom:32px}.eyebrow{text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;color:#587066}
h1{font-size:clamp(2rem,5vw,4rem);margin:.2em 0}h2{margin:.2em 0 1rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:20px}
.card{background:#fff;border:1px solid #d7ded9;border-radius:18px;padding:22px;box-shadow:0 12px 40px #17382b0d}
svg{display:block;width:100%;height:auto}details{margin-top:14px}pre{overflow:auto;background:#edf2ef;padding:12px;border-radius:8px}
footer{margin-top:28px;color:#587066;font-size:.85rem}@media(max-width:560px){body{padding:18px}.card{padding:16px}}
</style>
</head>
<body><main><header><p class="eyebrow">Local snapshot</p><h1>DataSkein dashboard</h1>
<p>Generated ${escapeHtml(generatedAt.toISOString())}. This file contains aggregate chart values and queries, not the original source files.</p></header>
<section class="grid">${cardsHtml}</section>
<footer>Exported with DataSkein. Open source at github.com/arturict/dataskein.</footer></main></body>
</html>`;
}
