import { Brand } from './Brand';

const GitHubIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
    <path
      fill="currentColor"
      d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 7c.85 0 1.71.11 2.51.34 1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85V21c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
    />
  </svg>
);

export function LandingPage() {
  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <a href="/" className="brand-link">
          <Brand />
        </a>
        <nav aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="https://github.com/arturict/dataskein">GitHub</a>
          <a className="button button-small button-dark" href="/app">
            Open workspace
          </a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Local-first data exploration</p>
            <h1>
              Follow the thread
              <br />
              in your data.
            </h1>
            <p className="hero-lede">
              Open messy CSV, JSON, and Parquet exports. Profile them, join them, shape them, and
              make the answer visible without uploading the source files.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="/app?sample=1">
                Try the sample
                <span aria-hidden="true">↗</span>
              </a>
              <a className="button button-ghost" href="https://github.com/arturict/dataskein">
                <GitHubIcon />
                View source
              </a>
            </div>
            <ul className="trust-list" aria-label="Product properties">
              <li>
                <span aria-hidden="true">✓</span> No account
              </li>
              <li>
                <span aria-hidden="true">✓</span> No upload
              </li>
              <li>
                <span aria-hidden="true">✓</span> MIT licensed
              </li>
            </ul>
          </div>

          <div
            className="hero-visual"
            role="img"
            aria-label="A visual data recipe from source rows to a chart"
          >
            <div className="visual-window">
              <div className="window-bar">
                <span />
                <span />
                <span />
                <strong>quarterly-sales.csv</strong>
                <em>local</em>
              </div>
              <div className="visual-canvas">
                <div className="visual-source">
                  <p>Source profile</p>
                  <strong>24,891</strong>
                  <small>rows · 8 columns</small>
                  <div className="mini-columns">
                    <span style={{ '--fill': '82%' } as React.CSSProperties}>region</span>
                    <span style={{ '--fill': '56%' } as React.CSSProperties}>revenue</span>
                    <span style={{ '--fill': '74%' } as React.CSSProperties}>quarter</span>
                  </div>
                </div>
                <div className="thread-line thread-one" />
                <div className="thread-line thread-two" />
                <ol className="visual-recipe">
                  <li>
                    <span>1</span>
                    Filter <strong>status = won</strong>
                  </li>
                  <li>
                    <span>2</span>
                    Join <strong>region targets</strong>
                  </li>
                  <li>
                    <span>3</span>
                    Sort <strong>revenue ↓</strong>
                  </li>
                </ol>
                <div className="visual-chart">
                  <div className="chart-heading">
                    <span>Revenue by region</span>
                    <em>Dashboard</em>
                  </div>
                  <div className="bar-chart" aria-hidden="true">
                    <i style={{ height: '48%' }} />
                    <i style={{ height: '78%' }} />
                    <i style={{ height: '58%' }} />
                    <i style={{ height: '92%' }} />
                    <i style={{ height: '67%' }} />
                  </div>
                </div>
              </div>
            </div>
            <p className="visual-caption">
              The recipe stays readable. The original files stay on your device.
            </p>
          </div>
        </section>

        <section className="signal-strip" aria-label="Supported workflow">
          <span>CSV</span>
          <span>JSON / JSONL</span>
          <span>PARQUET</span>
          <span>DUCKDB-WASM</span>
          <span>SQL RECIPE</span>
          <span>STATIC EXPORT</span>
        </section>

        <section className="story-section" id="how-it-works">
          <div className="section-intro">
            <p className="eyebrow">A smaller, sharper workflow</p>
            <h2>From raw export to a result you can explain.</h2>
            <p>
              DataSkein is not a BI platform and it is not another spreadsheet. It is a focused
              workbench for the recurring moment between “I have these files” and “here is the
              answer.”
            </p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-number">01</span>
              <h3>See the shape first</h3>
              <p>
                Detect types, missing values, distinct counts, ranges, and malformed inputs before
                you build on a bad assumption.
              </p>
              <div className="feature-art profile-art" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </article>
            <article>
              <span className="feature-number">02</span>
              <h3>Keep every step visible</h3>
              <p>
                Filters, sorts, column choices, and joins form an ordered recipe. The generated SQL
                is always there when you need to inspect or rerun it.
              </p>
              <div className="feature-art recipe-art" aria-hidden="true">
                <i>filter</i>
                <i>join</i>
                <i>sort</i>
              </div>
            </article>
            <article>
              <span className="feature-number">03</span>
              <h3>Export without a trap</h3>
              <p>
                Download formula-safe CSV, portable SQL, or a standalone dashboard snapshot. No
                cloud workspace is required to keep the result useful.
              </p>
              <div className="feature-art export-art" aria-hidden="true">
                <span>CSV</span>
                <span>SQL</span>
                <span>HTML</span>
              </div>
            </article>
          </div>
        </section>

        <section className="privacy-section" id="privacy">
          <div className="privacy-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="eyebrow eyebrow-light">Private by default</p>
            <h2>The useful kind of boring.</h2>
            <p>
              Files are registered with an in-browser DuckDB worker. DataSkein has no account,
              analytics, server-side query endpoint, or remote database connector. Network policy is
              locked to the application itself.
            </p>
            <a href="https://github.com/arturict/dataskein/blob/main/SECURITY.md">
              Read the security model <span aria-hidden="true">→</span>
            </a>
          </div>
          <dl>
            <div>
              <dt>0</dt>
              <dd>source files uploaded</dd>
            </div>
            <div>
              <dt>1</dt>
              <dd>local query worker</dd>
            </div>
            <div>
              <dt>100%</dt>
              <dd>inspectable recipe</dd>
            </div>
          </dl>
        </section>

        <section className="final-cta">
          <p className="eyebrow">Open source · no signup</p>
          <h2>Bring the awkward export.</h2>
          <p>DataSkein will help you see what is actually in it.</p>
          <a className="button button-primary" href="/app">
            Open DataSkein <span aria-hidden="true">↗</span>
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <Brand />
        <p>Built by Artur Ferreira in Switzerland. No tracking, no cookies.</p>
        <nav aria-label="Footer navigation">
          <a href="https://github.com/arturict/dataskein">GitHub</a>
          <a href="https://github.com/arturict/dataskein/releases">Releases</a>
          <a href="https://github.com/arturict/dataskein/blob/main/LICENSE">MIT License</a>
        </nav>
      </footer>
    </div>
  );
}
