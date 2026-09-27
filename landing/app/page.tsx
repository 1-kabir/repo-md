import CopyButton from "../components/copy-button";

const INSTALL_CMD = "npx @i_kabir/repo-md init";

export default function Home() {
  return (
    <>
      <header className="header">
        <div className="wrap header-inner">
          <a href="#" className="wordmark">
            repo-md
          </a>
          <nav className="nav" aria-label="Main">
            <a href="#how">how it works</a>
            <a href="#spec">the spec</a>
            <a href="#install">install</a>
            <a
              className="nav-gh"
              href="https://github.com/1-kabir/repo-md"
              target="_blank"
              rel="noopener noreferrer"
            >
              github ↗
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* ── hero ─────────────────────────────────────────── */}
        <section className="hero">
          <div className="wrap">
            <p className="hero-eyebrow">&lt;!-- REPO.MD:START --&gt;</p>
            <h1>
              One <span className="machine">file</span> tells agents
              <br />
              where everything is.
            </h1>
            <p className="sub">
              repo-md walks your repository and writes <strong>REPO.md</strong>{" "}
              — a token-budgeted map of structure, tech stacks, and entry
              points. Coding agents read one file instead of exploring your
              tree with a dozen tool calls.
            </p>

            <div className="install-chip">
              <span className="dollar">$</span>
              <code>{INSTALL_CMD}</code>
              <CopyButton text={INSTALL_CMD} />
            </div>

            <div className="hero-meta">
              <span>485 tokens on a sample repo</span>
              <span>works with 5 agent CLIs</span>
              <span>MIT, zero config</span>
            </div>

            <div className="hero-stage">
              <div className="window" aria-label="Terminal showing repo-md init">
                <div className="window-bar">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                  <span className="window-title">zsh — your-repo</span>
                </div>
                <pre>
                  <span className="tl tl-1 prompt-line">
                    <span className="g">$</span> npx @i_kabir/repo-md init
                    <span className="caret" />
                  </span>
                  <span className="tl tl-2">📂 Indexing /your-repo …</span>
                  <span className="tl tl-3">
                    ✅ REPO.md written <span className="d">(485 tokens, 1938 chars)</span>
                  </span>
                  <span className="tl tl-4">
                    💉 Injected pointer into: <span className="g">AGENTS.md, CLAUDE.md</span>
                  </span>
                  <span className="tl tl-5 prompt-line">
                    <span className="g">$</span>
                    <span className="caret" />
                  </span>
                </pre>
              </div>

              <div className="window" aria-label="Example REPO.md output">
                <div className="window-bar">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                  <span className="window-title">REPO.md</span>
                </div>
                <pre>
                  <span className="tl tl-1 g"># REPO.md — your-repo</span>
                  <span className="tl tl-2 g">
                    &lt;!-- REPO.MD:STRUCTURE:START --&gt;
                  </span>
                  <span className="tl tl-3">
                    ├── <span className="g">api/</span>        — Node+Express, API layer
                  </span>
                  <span className="tl tl-4">
                    │   └── index.ts   <span className="d">— entry point</span>
                  </span>
                  <span className="tl tl-5">
                    ├── <span className="g">frontend/</span>   — Node+Vite
                  </span>
                  <span className="tl tl-6">
                    └── <span className="g">src/</span>        — source
                  </span>
                  <span className="tl tl-7 g">
                    &lt;!-- REPO.MD:STRUCTURE:END --&gt;
                  </span>
                  <span className="tl tl-8 d">## Stack · ## Entry Points · ## Updated…</span>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* ── how it works ─────────────────────────────────── */}
        <section className="section" id="how">
          <div className="wrap">
            <p className="eyebrow">&lt;!-- REPO.MD:HOW:START --&gt;</p>
            <h2 className="h2">Three commands. That’s the whole workflow.</h2>
            <p className="lede">
              The structural index is generated locally in seconds. AI passes
              are optional and only ever touch REPO.md.
            </p>

            <div className="steps">
              <div className="step">
                <span className="step-num">01 · init</span>
                <h3>Map the repository</h3>
                <p>
                  Walks the file tree — respecting .gitignore, .bobignore, and
                  nested ignores — detects per-folder stacks, and writes
                  REPO.md under a hard token budget.
                </p>
                <span className="code-hint">npx @i_kabir/repo-md init</span>
              </div>
              <div className="step">
                <span className="step-num">02 · inject</span>
                <h3>Point agents at it</h3>
                <p>
                  Adds a short “read REPO.md first” block into AGENTS.md and
                  CLAUDE.md. Idempotent by design: run it daily, still exactly
                  one block, your text untouched.
                </p>
                <span className="code-hint">runs automatically after init</span>
              </div>
              <div className="step">
                <span className="step-num">03 · keep fresh</span>
                <h3>Update only what changed</h3>
                <p>
                  update re-indexes, diffs against the existing file, and
                  rewrites only the sections that moved. An agent skill can do
                  this live inside Bob IDE.
                </p>
                <span className="code-hint">npx @i_kabir/repo-md update</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── comparison ───────────────────────────────────── */}
        <section className="section">
          <div className="wrap">
            <p className="eyebrow">&lt;!-- REPO.MD:VS:START --&gt;</p>
            <h2 className="h2">How it relates to the files you already have.</h2>
            <p className="lede">
              REPO.md doesn’t replace your agent instructions — it completes
              them.
            </p>

            <div className="compare">
              <div className="compare-row">
                <div className="cell-head" />
                <div className="cell-head">AGENTS.md</div>
                <div className="cell-head col-repo">REPO.md</div>
                <div className="cell-head">Repomix</div>
              </div>
              <div className="compare-row">
                <div className="cell-label">answers</div>
                <div>how should you behave?</div>
                <div className="col-repo">where is everything?</div>
                <div>what does every file say?</div>
              </div>
              <div className="compare-row">
                <div className="cell-label">contents</div>
                <div>conventions, commands, style rules</div>
                <div className="col-repo">structure · stacks · entry points</div>
                <div>your entire codebase, concatenated</div>
              </div>
              <div className="compare-row">
                <div className="cell-label">size</div>
                <div>hand-written, varies</div>
                <div className="col-repo">hard budget: ~1,800 tokens</div>
                <div>scales with repo size</div>
              </div>
              <div className="compare-row">
                <div className="cell-label">kept fresh</div>
                <div>by hand</div>
                <div className="col-repo">by update + the agent skill</div>
                <div>re-run the packer</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── stats ────────────────────────────────────────── */}
        <section className="section">
          <div className="wrap">
            <p className="eyebrow">&lt;!-- REPO.MD:STATS:START --&gt;</p>
            <h2 className="h2">The token math is the point.</h2>
            <p className="lede">
              Every exploratory tool call an agent makes is context you pay
              for, twice. Real numbers from a sample repo, measured with{" "}
              <code style={{ fontFamily: "var(--font-machine)", fontSize: "0.9em" }}>
                repo-md stats
              </code>
              :
            </p>

            <div className="stats-band" style={{ marginTop: 40 }}>
              <div className="stat">
                <div className="stat-num">485</div>
                <div className="stat-label">
                  tokens for the full map — structure, stacks, entry points
                </div>
              </div>
              <div className="stat">
                <div className="stat-num">27%</div>
                <div className="stat-label">
                  of the default 1,800-token budget used
                </div>
              </div>
              <div className="stat">
                <div className="stat-num">1 → ~8</div>
                <div className="stat-label">
                  one read replaces the read/list calls a blind agent makes
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── spec ─────────────────────────────────────────── */}
        <section className="section" id="spec">
          <div className="wrap">
            <p className="eyebrow">&lt;!-- REPO.MD:SPEC:START --&gt;</p>
            <h2 className="h2">A convention, not a dump.</h2>
            <p className="lede">
              Every REPO.md has the same five marker-delimited sections, so any
              agent — and any teammate — knows exactly what’s where. Content
              outside the markers is yours and is never touched.
            </p>

            <div className="spec-grid">
              <div>
                <div className="spec-item">
                  <span className="spec-name">
                    STRUCTURE <span className="dim">— the tree</span>
                  </span>
                  <p>
                    Compact ASCII tree with one-line purpose tags. ≤6 words per
                    annotation, no sentences.
                  </p>
                </div>
                <div className="spec-item">
                  <span className="spec-name">
                    STACK <span className="dim">— per-folder tech</span>
                  </span>
                  <p>
                    package.json, go.mod, Cargo.toml, requirements.txt, and
                    framework dirs become labels like Node+Express+Prisma.
                  </p>
                </div>
                <div className="spec-item">
                  <span className="spec-name">
                    ENTRY POINTS <span className="dim">— start here</span>
                  </span>
                  <p>
                    index, main, app, server, cli files, listed relative to
                    root.
                  </p>
                </div>
              </div>
              <div>
                <div className="spec-item">
                  <span className="spec-name">
                    CONVENTIONS <span className="dim">— enriched by AI</span>
                  </span>
                  <p>
                    Starts empty; the optional agent pass fills in naming,
                    patterns, and tooling notes. Hand-editable forever after.
                  </p>
                </div>
                <div className="spec-item">
                  <span className="spec-name">
                    UPDATED <span className="dim">— freshness stamp</span>
                  </span>
                  <p>
                    Timestamp, git branch and HEAD, uncommitted changes, recent
                    commits — so an agent knows how stale the map is.
                  </p>
                </div>
                <div className="spec-item">
                  <span className="spec-name">
                    MARKERS <span className="dim">— the contract</span>
                  </span>
                  <p>
                    update rewrites only between markers. Your notes outside
                    them survive every regeneration.
                  </p>
                </div>
              </div>
            </div>

            <div className="chips" aria-label="Supported agents">
              <span className="chip">
                <b>Bob</b> Shell
              </span>
              <span className="chip">
                <b>Claude</b> Code
              </span>
              <span className="chip">
                <b>OpenCode</b>
              </span>
              <span className="chip">
                <b>Codex</b>
              </span>
              <span className="chip">
                <b>Antigravity</b>
              </span>
              <span className="chip">+ any agent that reads markdown</span>
            </div>
          </div>
        </section>

        {/* ── install ──────────────────────────────────────── */}
        <section className="section install-band" id="install">
          <div className="wrap">
            <p className="eyebrow">&lt;!-- REPO.MD:INSTALL:START --&gt;</p>
            <h2 className="h2">Run it against any repo.</h2>
            <p className="lede">
              No install, no config file, no account. One command maps the
              repo you’re in.
            </p>

            <div className="window">
              <div className="window-bar">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
                <span className="window-title">get started</span>
              </div>
              <pre>
                <div className="install-row">
                  <code>
                    <span className="d"># map the current repo + inject pointers</span>
                    {"\n"}
                    <span className="g">$</span> npx @i_kabir/repo-md init
                  </code>
                  <CopyButton text="npx @i_kabir/repo-md init" />
                </div>
                <div className="install-row">
                  <code>
                    <span className="d"># refresh after structural changes</span>
                    {"\n"}
                    <span className="g">$</span> npx @i_kabir/repo-md update
                  </code>
                  <CopyButton text="npx @i_kabir/repo-md update" />
                </div>
                <div className="install-row">
                  <code>
                    <span className="d"># install the maintenance skill for Bob IDE</span>
                    {"\n"}
                    <span className="g">$</span> npx @i_kabir/repo-md skill --install
                  </code>
                  <CopyButton text="npx @i_kabir/repo-md skill --install" />
                </div>
                <div className="install-row">
                  <code>
                    <span className="d"># or install globally</span>
                    {"\n"}
                    <span className="g">$</span> npm i -g @i_kabir/repo-md
                  </code>
                  <CopyButton text="npm i -g @i_kabir/repo-md" />
                </div>
              </pre>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-inner">
          <span className="updated">
            <span className="g">&lt;!-- REPO.MD:UPDATED:START --&gt;</span>
            <br />
            updated 2026-09-27 · v0.1.1 · MIT
          </span>
          <div className="footer-links">
            <a
              href="https://github.com/1-kabir/repo-md"
              target="_blank"
              rel="noopener noreferrer"
            >
              github
            </a>
            <a
              href="https://www.npmjs.com/package/@i_kabir/repo-md"
              target="_blank"
              rel="noopener noreferrer"
            >
              npm
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
