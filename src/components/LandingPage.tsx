import { useEffect } from 'react';
import workspaceScreenshot from '../../docs/assets/workspace.png';
import { startLandingAnalytics } from '../lib/landingAnalytics';
import { Brand } from './Brand';
import './landing.css';

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 7c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
      />
    </svg>
  );
}

const workflowSteps = [
  {
    number: '01',
    label: 'Open',
    title: 'Drop in the awkward export.',
    copy: 'CSV, TSV, JSON, JSONL, NDJSON, Parquet, and DuckDB files open directly in your browser. DuckDB catalogs attach read-only and only base tables can be inspected.',
  },
  {
    number: '02',
    label: 'Shape',
    title: 'Build a recipe you can read.',
    copy: 'Profile columns, filter rows, sort results, select fields, and join another dataset. Every step remains visible and inspectable as SQL.',
  },
  {
    number: '03',
    label: 'Share',
    title: 'Export the answer and the method.',
    copy: 'Take away a formula-safe CSV, a portable SQL recipe, or a standalone HTML dashboard. No cloud workspace is required to keep the result useful.',
  },
];

const faqs = [
  {
    question: 'What does DuckDB file support include?',
    answer:
      'Open a local .duckdb file to list schemas, tables, and views. Base tables can be inspected with a 250-row preview. Views are listed but not executed, and there is no SQL console or database write path.',
  },
  {
    question: 'Does DataSkein upload my files?',
    answer:
      'No. Local files are registered with DuckDB-Wasm inside your browser. The workspace has no upload endpoint, account system, analytics, cookies, or remote data connector. The separate public landing page uses cookie-free aggregate analytics and never receives file contents.',
  },
  {
    question: 'How large can a file be?',
    answer:
      'The current release accepts files up to 1 GB each and renders a capped, virtualized preview so a large result does not turn into thousands of browser elements.',
  },
  {
    question: 'Can I reproduce the work later?',
    answer:
      'Yes. Filters, sorts, selected columns, and joins form an ordered recipe. You can inspect and export the generated SQL alongside the result.',
  },
  {
    question: 'Is it really free and open source?',
    answer:
      'Yes. DataSkein is released under the MIT License. There is no paid tier, account, or usage meter.',
  },
];

export function LandingPage() {
  useEffect(
    () =>
      startLandingAnalytics({
        websiteId:
          import.meta.env.VITE_UMAMI_WEBSITE_ID ??
          (window.location.hostname === 'dataskein.vercel.app' && window.location.pathname === '/'
            ? '18623db1-2e71-4174-b8ea-57a574dff271'
            : ''),
        scriptUrl: import.meta.env.VITE_UMAMI_SCRIPT_URL ?? 'https://umami.arturf.ch/script.js',
      }),
    [],
  );

  return (
    <div className="showcase">
      <header className="showcase-nav">
        <a href="/" className="brand-link" aria-label="DataSkein home">
          <Brand />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#privacy">Privacy</a>
          <a href="https://github.com/arturict/dataskein">GitHub</a>
        </nav>
        <a
          className="showcase-nav-cta"
          href="/app"
          data-analytics-action="open-app"
          data-analytics-location="nav"
          data-analytics-target="app"
        >
          Open app
          <ArrowIcon />
        </a>
      </header>

      <main id="main-content">
        <section className="showcase-hero">
          <div className="hero-aura" aria-hidden="true" />
          <div className="hero-grid" aria-hidden="true" />
          <div className="showcase-hero-copy">
            <a
              className="release-pill"
              href="https://github.com/arturict/dataskein/releases"
              data-analytics-action="view-release"
              data-analytics-location="hero"
              data-analytics-target="releases"
            >
              <span>New</span>
              Open source and MIT licensed
              <ArrowIcon />
            </a>
            <p className="showcase-kicker">Local-first data exploration</p>
            <h1>
              From awkward files to <em>reproducible</em> answers.
            </h1>
            <p className="showcase-hero-lede">
              Open CSV, JSON, Parquet, and DuckDB tables in your browser. Profile, filter, join,
              chart, and export while the source files stay on your device.
            </p>
            <div className="showcase-actions">
              <a
                className="showcase-button showcase-button-primary"
                href="/app?sample=1"
                data-analytics-action="explore-sample"
                data-analytics-location="hero"
                data-analytics-target="sample"
              >
                Explore the sample
                <ArrowIcon />
              </a>
              <a
                className="showcase-button showcase-button-secondary"
                href="/app"
                data-analytics-action="open-app"
                data-analytics-location="hero"
                data-analytics-target="app"
              >
                Open your files
              </a>
            </div>
            <ul className="showcase-trust" aria-label="Product properties">
              <li>
                <span aria-hidden="true">●</span> No signup
              </li>
              <li>
                <span aria-hidden="true">●</span> Zero file uploads
              </li>
              <li>
                <span aria-hidden="true">●</span> Runs on DuckDB-Wasm
              </li>
            </ul>
          </div>

          <div className="product-stage">
            <div className="product-orbit product-orbit-one" aria-hidden="true" />
            <div className="product-orbit product-orbit-two" aria-hidden="true" />
            <div className="product-frame">
              <div className="product-frame-bar">
                <div aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p>dataskein.vercel.app/app</p>
                <strong>
                  <i aria-hidden="true" />
                  Local session
                </strong>
              </div>
              <img
                src={workspaceScreenshot}
                alt="DataSkein workspace showing a visible filter and join recipe for quarterly sales data"
                width="1440"
                height="1000"
              />
            </div>
            <div className="stage-card stage-card-private">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>0 bytes uploaded</strong>
                <small>Source files stay local</small>
              </div>
            </div>
            <div className="stage-card stage-card-recipe">
              <span>3</span>
              <div>
                <strong>Visible stages</strong>
                <small>Open → filter → join</small>
              </div>
            </div>
          </div>
        </section>

        <section className="format-ribbon" aria-label="Supported formats and capabilities">
          <p>Built for the files between systems</p>
          <div>
            <span>.csv</span>
            <span>.tsv</span>
            <span>.json</span>
            <span>.jsonl</span>
            <span>.ndjson</span>
            <span>.parquet</span>
            <span>.duckdb</span>
          </div>
        </section>

        <section className="product-section" id="product" data-analytics-section="product">
          <div className="section-heading section-heading-centered">
            <p className="showcase-kicker">One focused workbench</p>
            <h2>Understand the file before you trust the answer.</h2>
            <p>
              DataSkein covers the short, important path from an unfamiliar export to a result you
              can inspect, explain, and take with you.
            </p>
          </div>

          <div className="product-bento">
            <article className="bento-card bento-profile">
              <div className="bento-copy">
                <span>Profile</span>
                <h3>See the shape at a glance.</h3>
                <p>
                  Types, nulls, distinct values, ranges, and samples reveal bad assumptions before
                  they reach the chart.
                </p>
              </div>
              <div className="profile-demo" aria-hidden="true">
                <div className="demo-topline">
                  <strong>revenue</strong>
                  <span>DOUBLE</span>
                </div>
                <div className="profile-stat-row">
                  <div>
                    <small>Nulls</small>
                    <strong>0</strong>
                  </div>
                  <div>
                    <small>Distinct</small>
                    <strong>12</strong>
                  </div>
                  <div>
                    <small>Range</small>
                    <strong>42k–91k</strong>
                  </div>
                </div>
                <div className="distribution">
                  {[38, 56, 42, 72, 63, 89, 54, 68, 47, 78, 58, 82].map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </article>

            <article className="bento-card bento-recipe">
              <div className="bento-copy">
                <span>Transform</span>
                <h3>Keep the method in plain sight.</h3>
                <p>
                  Point-and-click steps stay ordered, editable, and backed by SQL. The work never
                  disappears into a hidden cell chain.
                </p>
              </div>
              <ol className="recipe-demo" aria-label="Example transformation recipe">
                <li>
                  <span>0</span>
                  <div>
                    <strong>Open source</strong>
                    <small>quarterly-sales.csv</small>
                  </div>
                </li>
                <li>
                  <span>1</span>
                  <div>
                    <strong>Filter</strong>
                    <small>status equals won</small>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>Left join</strong>
                    <small>region-targets.csv on region</small>
                  </div>
                </li>
              </ol>
            </article>

            <article className="bento-card bento-chart">
              <div className="bento-copy">
                <span>Explain</span>
                <h3>Turn a result into a useful view.</h3>
                <p>
                  Build a quick chart, pin a small dashboard, then export it as standalone HTML with
                  the aggregate values and query context included.
                </p>
              </div>
              <div className="chart-demo" aria-hidden="true">
                <div>
                  <p>Won revenue by region</p>
                  <span>4 groups</span>
                </div>
                <div className="chart-bars">
                  <i style={{ height: '58%' }}>
                    <span>$82k</span>
                  </i>
                  <i style={{ height: '82%' }}>
                    <span>$116k</span>
                  </i>
                  <i style={{ height: '68%' }}>
                    <span>$96k</span>
                  </i>
                  <i style={{ height: '94%' }}>
                    <span>$133k</span>
                  </i>
                </div>
                <div className="chart-labels">
                  <span>North</span>
                  <span>South</span>
                  <span>East</span>
                  <span>West</span>
                </div>
              </div>
            </article>

            <article className="bento-card bento-export">
              <div className="bento-copy">
                <span>Take it with you</span>
                <h3>Exports that do not create a new dependency.</h3>
              </div>
              <div className="export-stack">
                <div>
                  <strong>CSV</strong>
                  <span>Formula-safe rows</span>
                  <i>↗</i>
                </div>
                <div>
                  <strong>SQL</strong>
                  <span>Portable recipe</span>
                  <i>↗</i>
                </div>
                <div>
                  <strong>HTML</strong>
                  <span>Standalone dashboard</span>
                  <i>↗</i>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="workflow-section" id="workflow" data-analytics-section="workflow">
          <div className="section-heading">
            <p className="showcase-kicker">A short path to clarity</p>
            <h2>File in. Method visible. Answer out.</h2>
          </div>
          <div className="workflow-grid">
            {workflowSteps.map((step) => (
              <article key={step.number}>
                <div>
                  <span>{step.number}</span>
                  <small>{step.label}</small>
                </div>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
          <div className="workflow-line" aria-hidden="true">
            <span>Local files</span>
            <i />
            <span>DuckDB-Wasm</span>
            <i />
            <span>Portable exports</span>
          </div>
        </section>

        <section className="privacy-section-new" id="privacy" data-analytics-section="privacy">
          <div className="privacy-glow" aria-hidden="true" />
          <div className="privacy-copy">
            <p className="showcase-kicker">Private by architecture</p>
            <h2>Your data has no trip to make.</h2>
            <p>
              Queries run in one local browser worker. The workspace has no analytics or file
              telemetry; this public landing page sends cookie-free, aggregate usage events to our
              self-hosted Umami instance and never receives your source files.
            </p>
            <a
              href="https://github.com/arturict/dataskein/blob/main/docs/THREAT_MODEL.md"
              data-analytics-action="read-threat-model"
              data-analytics-location="privacy"
              data-analytics-target="threat-model"
            >
              Read the threat model
              <ArrowIcon />
            </a>
          </div>
          <div className="privacy-diagram" role="img" aria-label="Local-only data flow">
            <div>
              <span className="diagram-icon">01</span>
              <strong>Your files</strong>
              <small>Chosen from this device</small>
            </div>
            <i aria-hidden="true">
              <ArrowIcon />
            </i>
            <div>
              <span className="diagram-icon">02</span>
              <strong>Browser worker</strong>
              <small>DuckDB-Wasm queries locally</small>
            </div>
            <i aria-hidden="true">
              <ArrowIcon />
            </i>
            <div>
              <span className="diagram-icon">03</span>
              <strong>Your export</strong>
              <small>Written back to this device</small>
            </div>
          </div>
          <dl className="privacy-facts">
            <div>
              <dt>0</dt>
              <dd>accounts</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>workspace trackers</dd>
            </div>
            <div>
              <dt>0</dt>
              <dd>file uploads</dd>
            </div>
            <div>
              <dt>1 GB</dt>
              <dd>per-file limit</dd>
            </div>
          </dl>
        </section>

        <section className="principles-section" data-analytics-section="principles">
          <div className="section-heading">
            <p className="showcase-kicker">Deliberately not a platform</p>
            <h2>The useful middle between a viewer and BI.</h2>
            <p>
              DataSkein stays narrow so opening an export does not turn into setting up another
              system.
            </p>
          </div>
          <div className="principles-grid">
            <article>
              <span aria-hidden="true">01</span>
              <h3>No workspace administration</h3>
              <p>No account, team, connector, or cloud project before you can inspect a file.</p>
            </article>
            <article>
              <span aria-hidden="true">02</span>
              <h3>No spreadsheet archaeology</h3>
              <p>The ordered recipe and generated SQL show how the current result was produced.</p>
            </article>
            <article>
              <span aria-hidden="true">03</span>
              <h3>No locked-in result</h3>
              <p>CSV, SQL, and HTML exports remain useful without a DataSkein session.</p>
            </article>
          </div>
        </section>

        <section className="faq-section" data-analytics-section="faq">
          <div className="section-heading">
            <p className="showcase-kicker">Questions, answered</p>
            <h2>Short answers before you open a file.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((item, index) => (
              <details key={item.question}>
                <summary>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  {item.question}
                  <i aria-hidden="true">+</i>
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="showcase-final-cta" data-analytics-section="final">
          <div className="cta-thread cta-thread-one" aria-hidden="true" />
          <div className="cta-thread cta-thread-two" aria-hidden="true" />
          <p className="showcase-kicker">No signup. No upload. No lock-in.</p>
          <h2>Bring the awkward file.</h2>
          <p>See what is inside, keep track of what you changed, and take the answer with you.</p>
          <div className="showcase-actions">
            <a
              className="showcase-button showcase-button-accent"
              href="/app?sample=1"
              data-analytics-action="explore-sample"
              data-analytics-location="final"
              data-analytics-target="sample"
            >
              Explore the sample
              <ArrowIcon />
            </a>
            <a
              className="showcase-button showcase-button-dark-ghost"
              href="https://github.com/arturict/dataskein"
              data-analytics-action="view-source"
              data-analytics-location="final"
              data-analytics-target="github"
            >
              <GitHubIcon />
              View on GitHub
            </a>
          </div>
        </section>
      </main>

      <footer className="showcase-footer">
        <div>
          <Brand />
          <p>A local-first data workbench by Artur Ferreira.</p>
        </div>
        <nav aria-label="Footer navigation">
          <div>
            <strong>Product</strong>
            <a href="/app">Open app</a>
            <a href="/app?sample=1">Sample workspace</a>
            <a href="https://github.com/arturict/dataskein/releases">Releases</a>
          </div>
          <div>
            <strong>Open source</strong>
            <a href="https://github.com/arturict/dataskein">GitHub</a>
            <a href="https://github.com/arturict/dataskein/blob/main/ROADMAP.md">Roadmap</a>
            <a href="https://github.com/arturict/dataskein/blob/main/LICENSE">MIT License</a>
          </div>
          <div>
            <strong>Trust</strong>
            <a href="https://github.com/arturict/dataskein/blob/main/SECURITY.md">Security</a>
            <a href="https://github.com/arturict/dataskein/blob/main/docs/THREAT_MODEL.md">
              Threat model
            </a>
            <span>No workspace tracking; cookie-free landing analytics</span>
          </div>
        </nav>
        <p className="footer-note">Built in Switzerland · Source files stay on your device.</p>
      </footer>
    </div>
  );
}
