import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useLeetcodeData } from '@/hooks/useLeetcodeData';
import { usePyodide } from '@/hooks/usePyodide';
import { cn } from '@/lib/utils';

const PYTHON_LANGS = ['python3', 'python'];

const LC = {
  bg: '#1a1a1a', sidebar: '#282828', panel: '#1e1e1e',
  border: '#3e3e3e', borderLight: '#2d2d2d',
  text: '#eff1f6', textMuted: '#8d8d8d', textDim: '#565656',
  accent: '#ffa116', green: '#00b8a3', greenDark: '#00876e',
  red: '#ef4743', blue: '#60a5fa',
};

const LANG_MAP = {
  python3:'python', python:'python', javascript:'javascript', typescript:'typescript',
  cpp:'cpp', java:'java', c:'c', csharp:'csharp', golang:'go',
  kotlin:'kotlin', swift:'swift', rust:'rust', ruby:'ruby',
};

const LANG_DISPLAY = {
  python3:'Python 3', python:'Python', javascript:'JavaScript', typescript:'TypeScript',
  cpp:'C++', java:'Java', c:'C', csharp:'C#', golang:'Go',
  kotlin:'Kotlin', swift:'Swift', rust:'Rust', ruby:'Ruby',
};

// ── Skeleton shimmer injection ──────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('lc-styles')) {
  const s = document.createElement('style');
  s.id = 'lc-styles';
  s.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes lc-shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }
    .lc-skeleton {
      background: #2a2a2a;
      background-image: linear-gradient(90deg, #2a2a2a 0px, #333 200px, #2a2a2a 400px);
      background-size: 600px 100%;
      animation: lc-shimmer 1.4s infinite linear;
      border-radius: 4px;
    }
    .leetcode-desc pre  { background:#2d2d2d; border-radius:6px; padding:12px 16px; overflow-x:auto; margin:12px 0; }
    .leetcode-desc code { background:#2d2d2d; padding:2px 5px; border-radius:4px; font-family:monospace; font-size:13px; }
    .leetcode-desc p    { margin-bottom:10px; }
    .leetcode-desc ul, .leetcode-desc ol { padding-left:20px; margin-bottom:10px; }
    .leetcode-desc li   { margin-bottom:4px; }
    .leetcode-desc img  { max-width:100%; border-radius:6px; margin:8px 0; }
    .leetcode-desc strong { color:#eff1f6; }
    .leetcode-desc sup  { font-size:10px; }
  `;
  document.head.appendChild(s);
}

// ── Skeleton: mirrors exact CodeEditor layout ───────────────────────────────
function CodeEditorSkeleton({ onBack }) {
  const Bone = ({ w, h, style = {} }) => (
    <div className="lc-skeleton" style={{ width: w, height: h, borderRadius: 4, ...style }} />
  );

  return (
    <div style={{ background: LC.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      className="flex flex-col h-screen overflow-hidden">

      {/* Navbar skeleton */}
      <nav style={{ background: LC.sidebar, borderBottom: `1px solid ${LC.border}`, height: 44 }}
        className="flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ color: LC.textMuted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Problem List
          </button>
          <div style={{ width: 1, height: 16, background: LC.border }} />
          <Bone w={180} h={14} />
          <Bone w={44} h={18} style={{ borderRadius: 999 }} />
        </div>
        <div className="flex items-center gap-2">
          <Bone w={72} h={30} style={{ borderRadius: 6 }} />
          <Bone w={80} h={30} style={{ borderRadius: 6 }} />
        </div>
        <Bone w={160} h={12} />
      </nav>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — description skeleton */}
        <div style={{ width: '42%', borderRight: `1px solid ${LC.border}`, background: LC.sidebar, display: 'flex', flexDirection: 'column' }}>
          {/* Tab bar */}
          <div style={{ borderBottom: `1px solid ${LC.border}`, height: 42, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24 }}>
            <Bone w={80} h={13} />
            <Bone w={50} h={13} />
          </div>

          {/* Content */}
          <div style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Title */}
            <Bone w={260} h={20} />
            {/* Difficulty + tags row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Bone w={48} h={20} style={{ borderRadius: 999 }} />
              <Bone w={72} h={20} style={{ borderRadius: 999 }} />
            </div>
            {/* Description lines */}
            <Bone w="95%" h={13} />
            <Bone w="88%" h={13} />
            <Bone w="76%" h={13} />
            <Bone w="92%" h={13} />
            <Bone w="60%" h={13} />

            {/* Example block */}
            <div style={{ background: LC.panel, borderRadius: 8, padding: 16, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Bone w={90} h={12} />
              <Bone w="80%" h={32} style={{ borderRadius: 6 }} />
              <Bone w={90} h={12} />
              <Bone w="50%" h={32} style={{ borderRadius: 6 }} />
            </div>

            {/* More lines */}
            <Bone w="90%" h={13} style={{ marginTop: 8 }} />
            <Bone w="70%" h={13} />
            <Bone w="83%" h={13} />

            {/* Constraints */}
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Bone w={100} h={12} />
              <Bone w="55%" h={12} />
              <Bone w="48%" h={12} />
              <Bone w="60%" h={12} />
            </div>

            {/* Topic tags */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${LC.borderLight}`, display: 'flex', gap: 6 }}>
              <Bone w={64} h={22} style={{ borderRadius: 999 }} />
              <Bone w={80} h={22} style={{ borderRadius: 999 }} />
              <Bone w={56} h={22} style={{ borderRadius: 999 }} />
            </div>
          </div>
        </div>

        {/* RIGHT — editor skeleton */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Language bar */}
          <div style={{ background: LC.sidebar, borderBottom: `1px solid ${LC.border}`, height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 12 }}>
            <Bone w={100} h={26} style={{ borderRadius: 5 }} />
            <div style={{ marginLeft: 'auto' }}>
              <Bone w={220} h={11} />
            </div>
          </div>

          {/* Editor area — line number gutter + code lines */}
          <div style={{ flex: 1, background: LC.panel, padding: '16px 0', overflow: 'hidden', display: 'flex', gap: 0 }}>
            {/* Line numbers */}
            <div style={{ width: 48, display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px', alignItems: 'flex-end', flexShrink: 0 }}>
              {Array.from({ length: 18 }).map((_, i) => (
                <Bone key={i} w={16} h={11} style={{ opacity: 0.4 }} />
              ))}
            </div>
            {/* Code lines — varying widths for realism */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 24 }}>
              {[120, 200, 80, 180, 240, 160, 100, 220, 140, 190, 0, 170, 130, 210, 90, 155, 0, 110].map((w, i) => (
                w === 0
                  ? <div key={i} style={{ height: 11 }} />
                  : <Bone key={i} w={w} h={11} style={{ opacity: 0.5 }} />
              ))}
            </div>
          </div>

          {/* Drag handle */}
          <div style={{ height: 5, background: LC.borderLight, flexShrink: 0 }} />

          {/* Bottom panel skeleton */}
          <div style={{ height: 260, background: LC.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Tabs */}
            <div style={{ borderBottom: `1px solid ${LC.border}`, height: 40, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 24 }}>
              <Bone w={70} h={13} />
              <Bone w={90} h={13} />
            </div>
            {/* Test case content */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Bone w={72} h={30} style={{ borderRadius: 6 }} />
                <Bone w={72} h={30} style={{ borderRadius: 6 }} />
                <Bone w={72} h={30} style={{ borderRadius: 6 }} />
              </div>
              <Bone w={50} h={12} />
              <Bone w="70%" h={36} style={{ borderRadius: 6 }} />
              <Bone w={50} h={12} />
              <Bone w="50%" h={36} style={{ borderRadius: 6 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main CodeEditor ─────────────────────────────────────────────────────────
export function CodeEditor({ problem, onBack }) {
  const slug  = problem?.leetcode_slug;
  const title = problem?.title;

  const [language,      setLanguage]      = useState('python3');
  const [code,          setCode]          = useState('');
  const [activeTestIdx, setActiveTestIdx] = useState(0);
  const [bottomTab,     setBottomTab]     = useState('testcase');
  const [results,       setResults]       = useState(null);
  const [running,       setRunning]       = useState(false);
  const [runError,      setRunError]      = useState(null);
  const [bottomHeight,  setBottomHeight]  = useState(260);
  const [descTab,       setDescTab]       = useState('description');
  const dragging   = useRef(false);
  const dragStart  = useRef(0);
  const heightStart = useRef(0);

  const { data, loading, error, starterCode, testCases } = useLeetcodeData(title, slug, language);
  const { status: pyStatus, load: loadPyodide, runPython } = usePyodide();

  useEffect(() => { if (starterCode) setCode(starterCode); }, [starterCode]);
  useEffect(() => { setResults(null); setRunError(null); }, [language]);
  useEffect(() => {
    if (PYTHON_LANGS.includes(language) && pyStatus === 'idle') loadPyodide();
  }, [language]);

  const onMouseDown = (e) => {
    dragging.current = true;
    dragStart.current = e.clientY;
    heightStart.current = bottomHeight;
    const move = (e) => {
      if (!dragging.current) return;
      setBottomHeight(Math.max(140, Math.min(500, heightStart.current + (dragStart.current - e.clientY))));
    };
    const up = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  };

  const handleRun = async () => {
    if (!testCases.length || running) return;
    setRunning(true); setRunError(null); setResults(null); setBottomTab('result');
    try {
      if (PYTHON_LANGS.includes(language)) {
        setResults(await runPython(code, testCases));
      } else {
        setRunError('Browser execution only supports Python. Switch to Python 3 to run.');
      }
    } catch (e) { setRunError(e.message || 'Execution failed'); }
    finally { setRunning(false); }
  };

  // Show skeleton while loading
  if (loading) return <CodeEditorSkeleton onBack={onBack} />;

  if (error || !data) return (
    <div style={{ background: LC.bg }} className="flex flex-col items-center justify-center h-screen gap-4">
      <span style={{ color: LC.red, fontSize: 14 }}>{error || 'Problem not found'}</span>
      <button onClick={onBack} style={{ color: LC.textMuted, fontSize: 13 }}>← Back to problems</button>
    </div>
  );

  const passedCount = results ? results.filter(r => r.passed).length : 0;
  const allPassed   = results && passedCount === results.length;
  const isPython    = PYTHON_LANGS.includes(language);
  const pyLoading   = pyStatus === 'loading';

  return (
    <div style={{ background: LC.bg, fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      className="flex flex-col h-screen overflow-hidden select-none">

      {/* ── NAVBAR ── */}
      <nav style={{ background: LC.sidebar, borderBottom: `1px solid ${LC.border}`, height: 44 }}
        className="flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            style={{ color: LC.textMuted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            className="hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Problem List
          </button>
          <div style={{ width: 1, height: 16, background: LC.border }} />
          <span style={{ color: LC.text, fontSize: 13, fontWeight: 500 }}>{data.title}</span>
          <DifficultyBadge d={data.difficulty} />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleRun} disabled={running || pyLoading}
            style={{
              background: running || pyLoading ? LC.borderLight : 'transparent',
              border: `1px solid ${LC.border}`,
              color: running || pyLoading ? LC.textDim : LC.text,
              borderRadius: 6, padding: '5px 14px', fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: running || pyLoading ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
            }}>
            {running ? <><Spinner /> Running</> : pyLoading ? <><Spinner /> Initializing Python...</> : <><RunIcon /> Run</>}
          </button>
          <button disabled style={{ background: LC.green, color: '#fff', borderRadius: 6, padding: '5px 14px', fontSize: 13, fontWeight: 500, opacity: 0.5, cursor: 'not-allowed' }}>
            Submit
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span style={{ color: LC.textDim, fontSize: 12 }}>
            {isPython ? '🐍 Python execution enabled' : '⚠ Switch to Python to run'}
          </span>
        </div>
      </nav>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT */}
        <div style={{ width: '42%', borderRight: `1px solid ${LC.border}`, background: LC.sidebar, display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: `1px solid ${LC.border}`, display: 'flex', padding: '0 16px' }}>
            {['description', 'hints'].map(t => (
              <button key={t} onClick={() => setDescTab(t)}
                style={{ padding: '10px 16px 9px', fontSize: 13, fontWeight: 500, color: descTab === t ? LC.text : LC.textMuted, borderBottom: `2px solid ${descTab === t ? LC.accent : 'transparent'}`, textTransform: 'capitalize', transition: 'color 0.15s' }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="leetcode-desc">
            {descTab === 'description' ? (
              <>
                <h1 style={{ color: LC.text, fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{data.title}</h1>
                <div style={{ color: LC.text, fontSize: 14, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: data.contentHtml || '' }} />
                {data.topicTags?.length > 0 && (
                  <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${LC.borderLight}` }}>
                    <div style={{ color: LC.textMuted, fontSize: 12, marginBottom: 8 }}>Topics</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {data.topicTags.map(tag => (
                        <span key={tag} style={{ background: '#3e3e3e', color: LC.text, fontSize: 12, padding: '3px 10px', borderRadius: 999 }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: LC.textMuted, fontSize: 14 }}>
                {data.hints?.length > 0
                  ? data.hints.map((h, i) => <HintItem key={i} idx={i} text={h} />)
                  : 'No hints available for this problem.'}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: LC.sidebar, borderBottom: `1px solid ${LC.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', height: 40 }}>
            <select value={language} onChange={e => { setLanguage(e.target.value); setResults(null); }}
              style={{ background: LC.panel, color: LC.text, border: `1px solid ${LC.border}`, borderRadius: 5, padding: '3px 8px', fontSize: 13, cursor: 'pointer' }}>
              {data.codeSnippets?.map(s => (
                <option key={s.langSlug} value={s.langSlug}>{LANG_DISPLAY[s.langSlug] || s.langSlug}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Editor height="100%" theme="vs-dark" language={LANG_MAP[language] || 'plaintext'}
              value={code} onChange={val => setCode(val ?? '')}
              options={{ fontSize: 14, fontFamily: "'Fira Code','JetBrains Mono',Consolas,monospace", fontLigatures: true, minimap: { enabled: false }, automaticLayout: true, wordWrap: 'off', scrollBeyondLastLine: false, padding: { top: 16, bottom: 16 }, lineNumbers: 'on', renderLineHighlight: 'all', bracketPairColorization: { enabled: true }, tabSize: 4 }}
            />
          </div>

          <div onMouseDown={onMouseDown}
            style={{ height: 5, background: LC.border, cursor: 'row-resize', flexShrink: 0, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = LC.accent}
            onMouseLeave={e => e.currentTarget.style.background = LC.border}
          />

          <div style={{ height: bottomHeight, background: LC.sidebar, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ borderBottom: `1px solid ${LC.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', height: 40 }}>
              {[
                { id: 'testcase', label: 'Testcase' },
                { id: 'result', label: results ? `Test Result ${allPassed ? '✓' : `${passedCount}/${results.length}`}` : 'Test Result' },
              ].map(t => (
                <button key={t.id} onClick={() => setBottomTab(t.id)}
                  style={{ padding: '0 16px', height: 40, fontSize: 13, fontWeight: 500, color: bottomTab === t.id ? LC.text : LC.textMuted, borderBottom: `2px solid ${bottomTab === t.id ? LC.accent : 'transparent'}`, transition: 'color 0.15s' }}>
                  {t.label}
                </button>
              ))}
              {results && (
                <span style={{ marginLeft: 'auto', background: allPassed ? '#00b8a320' : '#ef474320', color: allPassed ? LC.green : LC.red, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999 }}>
                  {allPassed ? '✓ Accepted' : `✗ ${passedCount}/${results.length} passed`}
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {bottomTab === 'testcase'
                ? <TestcasePanel testCases={testCases} activeIdx={activeTestIdx} onSelect={setActiveTestIdx} />
                : <ResultPanel testCases={testCases} results={results} activeIdx={activeTestIdx} onSelect={setActiveTestIdx} running={running} runError={runError} isPython={isPython} />
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components (unchanged) ──────────────────────────────────────────────
function TestcasePanel({ testCases, activeIdx, onSelect }) {
  if (!testCases.length) return <div style={{ color: LC.textMuted, fontSize: 13, padding: 20 }}>No test cases found.</div>;
  const tc = testCases[activeIdx];
  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {testCases.map((_, i) => (
          <button key={i} onClick={() => onSelect(i)}
            style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: activeIdx === i ? '#3e3e3e' : 'transparent', color: activeIdx === i ? LC.text : LC.textMuted, border: `1px solid ${activeIdx === i ? '#5a5a5a' : LC.borderLight}`, transition: 'all 0.15s', cursor: 'pointer' }}>
            Case {i + 1}
          </button>
        ))}
      </div>
      {tc && tc.inputStr.split('\n').filter(Boolean).map((line, i) => {
        const [label, ...val] = line.split(' = ');
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <div style={{ color: LC.textMuted, fontSize: 12, marginBottom: 4 }}>{val.length ? label.trim() : `Input ${i + 1}`}</div>
            <div style={{ background: LC.panel, border: `1px solid ${LC.borderLight}`, borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: LC.text }}>
              {val.length ? val.join(' = ') : line}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResultPanel({ testCases, results, activeIdx, onSelect, running, runError, isPython }) {
  if (running) return <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20, color: LC.textMuted, fontSize: 14 }}><Spinner /> Running test cases...</div>;
  if (!isPython && !results) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: '#ffa11615', border: '1px solid #ffa11640', borderRadius: 8, padding: '12px 16px', color: LC.accent, fontSize: 13 }}>
        ⚠ In-browser execution only supports Python 3. Switch language to run test cases.
      </div>
    </div>
  );
  if (runError) return <div style={{ padding: 20 }}><div style={{ background: '#ef474315', border: `1px solid ${LC.red}40`, borderRadius: 8, padding: '12px 16px', color: LC.red, fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{runError}</div></div>;
  if (!results) return <div style={{ color: LC.textMuted, fontSize: 13, padding: 20 }}>Click <strong style={{ color: LC.text }}>Run</strong> to execute your code against the test cases.</div>;

  const tc = testCases[activeIdx];
  const res = results[activeIdx];
  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {results.map((r, i) => (
          <button key={i} onClick={() => onSelect(i)}
            style={{ padding: '5px 14px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: activeIdx === i ? '#3e3e3e' : 'transparent', color: activeIdx === i ? LC.text : LC.textMuted, border: `1px solid ${activeIdx === i ? '#5a5a5a' : LC.borderLight}`, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.passed ? LC.green : LC.red, display: 'inline-block', flexShrink: 0 }} />
            Case {i + 1}
          </button>
        ))}
      </div>
      {tc && res && (
        <>
          <div style={{ color: res.passed ? LC.green : LC.red, fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
            {res.passed ? '✓ Accepted' : '✗ Wrong Answer'}
          </div>
          {res.error && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: LC.textMuted, fontSize: 12, marginBottom: 4 }}>Error</div>
              <div style={{ background: '#ef474312', border: `1px solid ${LC.red}40`, borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#ff8080', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{res.error}</div>
            </div>
          )}
          <ResultRow label="Input" value={tc.inputStr} />
          <ResultRow label="Expected Output" value={String(tc.expected)} />
          <ResultRow label="Your Output" value={res.output !== '' ? res.output : '(empty)'} highlight={res.passed ? 'green' : 'red'} />
          {res.stdout && <ResultRow label="Stdout (print statements)" value={res.stdout.trimEnd()} />}
        </>
      )}
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  const bg     = highlight === 'green' ? '#00b8a312' : highlight === 'red' ? '#ef474312' : LC.panel;
  const border = highlight === 'green' ? `${LC.green}40` : highlight === 'red' ? `${LC.red}40` : LC.borderLight;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: LC.textMuted, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 13, color: LC.text, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function HintItem({ idx, text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8, border: `1px solid ${LC.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: LC.panel, color: LC.textMuted, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Hint {idx + 1}
        <span style={{ fontSize: 14, fontWeight: 300 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ padding: '10px 14px', background: LC.sidebar, color: LC.text, fontSize: 13, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: text }} />}
    </div>
  );
}

function DifficultyBadge({ d }) {
  const colors = { Easy: LC.green, Medium: LC.accent, Hard: LC.red };
  return <span style={{ color: colors[d] || LC.textMuted, fontSize: 13, fontWeight: 600 }}>{d}</span>;
}

function RunIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>;
}

function Spinner() {
  return <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid #555', borderTopColor: LC.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}