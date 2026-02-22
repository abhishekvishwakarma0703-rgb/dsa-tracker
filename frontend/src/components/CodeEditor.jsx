/**
 * CodeEditor — Full-screen IDE
 * • Resizable left/right panels via drag handle
 * • Fetches real LeetCode problem description + starter code
 * • Python execution via Pyodide (WASM, runs in browser — no backend needed)
 * • JavaScript execution via local eval
 * • Backend API submission (preserved from original)
 * • Rich test case management with add/remove
 * • AI-powered progressive hints in the Hints tab
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { AITutorPanel, AIHintTab } from '@/components/AITutorPanel';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProblemDescription } from '@/components/ProblemDescription';
import { useLeetcodeBackend } from '@/hooks/useLeetcodeBackend';
import { usePyodide } from '@/hooks/usePyodide';
import { getStarterCode, parseTestCases } from '@/services/leetcodeService';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';
import {
  ArrowLeft, Play, Plus, X, CheckCircle2, XCircle, FlaskConical,
  ExternalLink, Code2, AlertCircle, Loader2, Tag, Lightbulb,
  RefreshCw, ChevronDown, ChevronUp, RotateCcw,
  GripVertical,
} from 'lucide-react';

const DIFF_VARIANT = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

const LANGUAGES = [
  { value: 'python3',    label: 'Python 3'   },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java',       label: 'Java'       },
  { value: 'cpp',        label: 'C++'        },
];

const DEFAULT_PYTHON = `class Solution:
    def solve(self, nums):
        # Write your solution here
        pass
`;

const DEFAULT_JS = `/**
 * @param {number[]} nums
 * @return {number}
 */
var solve = function(nums) {
    // Write your solution here
};`;

// Min/max panel width as percent of total split container
const MIN_PCT = 20;
const MAX_PCT = 80;
const DEFAULT_PCT = 42;

// ── Resizable divider ─────────────────────────────────────────────────────────
function ResizeDivider({ onDrag }) {
  const dragging = useRef(false);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (me) => {
      if (!dragging.current) return;
      onDrag(me.clientX);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [onDrag]);

  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        'relative flex items-center justify-center shrink-0 z-10',
        'w-2 cursor-col-resize select-none group',
        'bg-border hover:bg-primary/30 transition-colors duration-150',
      )}
      title="Drag to resize panels"
    >
      {/* Visual grip pill */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center">
        <div className={cn(
          'w-1 h-10 rounded-full flex flex-col items-center justify-center gap-0.5',
          'bg-border group-hover:bg-primary/50 transition-colors duration-150',
        )}>
          <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Description content wrapping fix */}
      <style>{`
        .desc-content { min-width: 0; width: 100%; overflow: hidden; }
        .desc-content * { max-width: 100%; box-sizing: border-box; }
        .desc-content pre,
        .desc-content code { white-space: pre-wrap; word-break: break-all; overflow-wrap: break-word; }
        .desc-content pre { overflow-x: auto; max-width: 100%; }
        .desc-content p, .desc-content li, .desc-content span { overflow-wrap: break-word; word-break: break-word; }
        .desc-content table { display: block; overflow-x: auto; max-width: 100%; }
        .desc-content img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lcTestCaseToEditable(testCase) {
  return {
    id:          Math.random().toString(36).slice(2),
    inputStr:    testCase.inputStr || '',
    expected:    testCase.expected,
    expectedStr: testCase.expected !== undefined ? JSON.stringify(testCase.expected) : '',
  };
}

function runJavaScript(code, testCases) {
  const results = [];
  for (let idx = 0; idx < testCases.length; idx++) {
    const tc = testCases[idx];
    try {
      const lines = tc.inputStr.trim().split('\n').filter(Boolean);
      const args  = lines.map(l => { try { return JSON.parse(l); } catch { return l; } });
      // eslint-disable-next-line no-new-func
      const wrapper = new Function(`
        "use strict";
        ${code}
        if (typeof solve !== 'undefined') return solve;
        if (typeof solution !== 'undefined') return solution;
        throw new Error('No function named "solve" or "solution" found');
      `);
      const fn     = wrapper();
      const result = fn(...args);
      let expected;
      try { expected = JSON.parse(tc.expectedStr); } catch { expected = tc.expectedStr; }
      const passed = JSON.stringify(result) === JSON.stringify(expected);
      results.push({ id: idx, input: tc.inputStr, expected: tc.expectedStr, output: JSON.stringify(result), passed, error: null });
    } catch (err) {
      results.push({ id: idx, input: tc.inputStr, expected: tc.expectedStr || '', output: '', passed: false, error: err.message });
    }
  }
  return results;
}

// ─── Test Case Row ─────────────────────────────────────────────────────────
function TestCaseRow({ testCase, index, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <span className="text-xs font-medium text-muted-foreground">Case {index + 1}</span>
        <div className="flex-1" />
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        <button className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
          onClick={e => { e.stopPropagation(); onRemove(); }}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t pt-2">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium block mb-1">
              Input (one value per line)
            </label>
            <textarea
              className="code-textarea w-full rounded-md border bg-muted/30 p-2 text-xs min-h-[52px] focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              value={testCase.inputStr}
              onChange={e => onChange({ ...testCase, inputStr: e.target.value })}
              placeholder={'[2, 7, 11, 15]\n9'}
              spellCheck={false}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium block mb-1">
              Expected (JSON)
            </label>
            <input
              className="code-textarea w-full rounded-md border bg-muted/30 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              value={testCase.expectedStr}
              onChange={e => onChange({ ...testCase, expectedStr: e.target.value })}
              placeholder='[0, 1] or true or 42'
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Result Row ────────────────────────────────────────────────────────────
function ResultRow({ result }) {
  const [expanded, setExpanded] = useState(!result.passed);
  return (
    <div
      className={cn('rounded-xl border p-4 cursor-pointer',
        result.passed ? 'border-success/30 bg-success/5' : 'border-destructive/30 bg-destructive/5')}
      onClick={() => setExpanded(v => !v)}
    >
      <div className="flex items-center gap-2">
        {result.passed
          ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
          : <XCircle      className="h-4 w-4 text-destructive shrink-0" />}
        <span className="text-sm font-medium">Test {result.id + 1}</span>
        <Badge variant={result.passed ? 'success' : 'destructive'} className="ml-auto text-[10px] py-0 px-1.5">
          {result.passed ? 'PASS' : 'FAIL'}
        </Badge>
        {expanded
          ? <ChevronUp   className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      {expanded && (
        <div className="mt-3 text-xs font-mono space-y-1.5">
          {result.error ? (
            <pre className="text-destructive bg-destructive/10 rounded p-2 whitespace-pre-wrap text-[11px] overflow-auto max-h-32">
              {result.error}
            </pre>
          ) : (
            <>
              <div className="grid grid-cols-[80px_1fr] gap-x-2">
                <span className="text-muted-foreground">Input</span>
                <code className="break-all">{result.input}</code>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-x-2">
                <span className="text-muted-foreground">Expected</span>
                <code className={cn('break-all', result.passed ? 'text-success' : 'text-muted-foreground')}>{result.expected}</code>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-x-2">
                <span className="text-muted-foreground">Got</span>
                <code className={cn('break-all', result.passed ? 'text-success' : 'text-destructive')}>{result.output}</code>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LeetCode static hints collapsible ─────────────────────────────────────
function LCStaticHints({ hints, loading }) {
  const [open, setOpen] = useState(false);
  if (!loading && !hints?.length) return null;
  return (
    <div className="mt-4 rounded-xl border border-dashed overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <Lightbulb className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium text-muted-foreground flex-1">
          LeetCode Official Hints {hints?.length ? `(${hints.length})` : ''}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
               : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t">
          {loading ? (
            <p className="text-xs text-muted-foreground pt-3">Loading…</p>
          ) : (
            hints.map((hint, i) => (
              <details key={i} className="group rounded-lg border mt-2">
                <summary className="flex items-center gap-2 p-3 cursor-pointer list-none">
                  <Lightbulb className="h-3.5 w-3.5 text-warning shrink-0" />
                  <span className="text-xs font-medium flex-1">Hint {i + 1}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-4 pb-3 text-sm text-muted-foreground border-t pt-2">
                  <div dangerouslySetInnerHTML={{ __html: hint }} />
                </div>
              </details>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function CodeEditor({ problem, onBack }) {
  const toast                     = useToast();
  const [language, setLanguage]   = useState('python3');
  const [code, setCode]           = useState('');
  const [testCases, setTestCases] = useState([]);
  const [results, setResults]     = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [descTab, setDescTab]     = useState('description');

  // ── Resizable panel state ──────────────────────────────────────────────
  const [leftPct, setLeftPct]   = useState(DEFAULT_PCT); // left panel width %
  const splitRef                = useRef(null);           // ref on the split container

  const handleDividerDrag = useCallback((clientX) => {
    if (!splitRef.current) return;
    const { left, width } = splitRef.current.getBoundingClientRect();
    const rawPct = ((clientX - left) / width) * 100;
    setLeftPct(Math.min(MAX_PCT, Math.max(MIN_PCT, rawPct)));
  }, []);

  const codeInitialized = useRef(false);
  const starterCodeRef  = useRef('');

  const { data: lcData, loading: lcLoading, error: lcError } = useLeetcodeBackend(problem.title);
  const { status: pyStatus, load: loadPy, runPython }        = usePyodide();

  // Populate starter code
  useEffect(() => {
    if (lcData) {
      let starter =
        (language === 'python3' && lcData.backendStarterCode)
          ? lcData.backendStarterCode
          : (getStarterCode(lcData.codeSnippets, language) || '');
      if (!starter) starter = language === 'python3' ? DEFAULT_PYTHON : DEFAULT_JS;
      starterCodeRef.current = starter;
      setCode(starter);
      if (!codeInitialized.current) {
        const lc = parseTestCases(lcData.exampleTestcases, lcData.examples);
        if (lc.length > 0) setTestCases(lc.map(lcTestCaseToEditable));
        codeInitialized.current = true;
      }
    } else if (!lcLoading) {
      const def = language === 'python3' ? DEFAULT_PYTHON : DEFAULT_JS;
      starterCodeRef.current = def;
      setCode(def);
    }
  }, [lcData, language, lcLoading]);

  useEffect(() => {
    if (language === 'python3' && pyStatus === 'idle') loadPy();
  }, [language, pyStatus, loadPy]);

  const handleRun = useCallback(async () => {
    if (testCases.length === 0) { toast('Add at least one test case first', 'error'); return; }
    setIsRunning(true);
    setResults([]);
    try {
      let finalResults = null;
      try {
        const res = await apiClient.testSolution(problem.id, code, language);
        if (res?.results?.length) finalResults = res.results;
      } catch { /* fallback */ }

      if (!finalResults) {
        if (language === 'python3') {
          if (pyStatus !== 'ready') { toast('Python runtime loading, please wait…', 'info'); await loadPy(); }
          const normalizedTcs = testCases.map(tc => ({
            inputStr: tc.inputStr,
            expected: (() => { try { return JSON.parse(tc.expectedStr); } catch { return tc.expectedStr; } })(),
          }));
          finalResults = await runPython(code, normalizedTcs);
        } else if (language === 'javascript') {
          finalResults = runJavaScript(code, testCases);
        } else {
          toast(`In-browser execution not available for ${language}`, 'error');
          setIsRunning(false);
          return;
        }
      }
      setResults(finalResults);
      setActiveTab('results');
      const p = finalResults.filter(r => r.passed).length;
      toast(`${p}/${finalResults.length} tests passed`, p === finalResults.length ? 'success' : 'error');
    } catch (err) {
      toast('Error: ' + err.message, 'error');
    } finally {
      setIsRunning(false);
    }
  }, [code, language, testCases, problem.id, pyStatus, loadPy, runPython, toast]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient.submitSolution(problem.id, code, language, 'demo-user');
      toast('Submitted! 🎉', 'success');
      if (res?.results) { setResults(res.results); setActiveTab('results'); }
    } catch (err) {
      toast('Submit failed: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [code, language, problem.id, toast]);

  const passed    = results.filter(r => r.passed).length;
  const allPassed = results.length > 0 && passed === results.length;

  const TABS = [
    { id: 'code',    label: 'Code' },
    { id: 'tests',   label: `Tests (${testCases.length})` },
    { id: 'results', label: results.length > 0 ? `Results ${passed}/${results.length}` : 'Results' },
  ];

  const DESC_TABS = [
    { id: 'description', label: 'Description' },
    { id: 'hints',       label: '✦ AI Hints'  },
    { id: 'tutor',       label: '✦ Mentor'     },
  ];

  const isFullHeightTab = descTab === 'tutor' || descTab === 'hints';

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-sm truncate max-w-[180px] sm:max-w-xs">{problem.title}</h2>
          <Badge variant={DIFF_VARIANT[lcData?.difficulty || problem.difficulty] || 'secondary'} className="shrink-0">
            {lcData?.difficulty || problem.difficulty}
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
            value={language}
            onChange={e => { setLanguage(e.target.value); codeInitialized.current = false; }}
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>

          {language === 'python3' && (
            <span className={cn('hidden sm:flex items-center gap-1 text-xs', {
              'text-muted-foreground':           pyStatus === 'idle',
              'text-warning':                    pyStatus === 'loading',
              'text-success':                    pyStatus === 'ready',
              'text-destructive cursor-pointer': pyStatus === 'error',
            })} onClick={pyStatus === 'error' ? loadPy : undefined}>
              {pyStatus === 'loading' && <Loader2     className="h-3 w-3 animate-spin" />}
              {pyStatus === 'ready'   && <CheckCircle2 className="h-3 w-3" />}
              {pyStatus === 'error'   && <AlertCircle  className="h-3 w-3" />}
              {{ idle: 'Python: not loaded', loading: 'Loading…', ready: 'Python ✓', error: 'Retry' }[pyStatus]}
            </span>
          )}

          <Button size="sm" variant="outline" onClick={handleRun}
            disabled={isRunning || (language === 'python3' && pyStatus === 'loading')}>
            {isRunning
              ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</>
              : <><Play    className="h-4 w-4" />Run</>}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? <><Loader2     className="h-4 w-4 animate-spin" />…</>
              : <><FlaskConical className="h-4 w-4" />Submit</>}
          </Button>
          {lcData?.link && (
            <a href={lcData.link} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Resizable Split Layout ───────────────────────────────────────── */}
      <div ref={splitRef} className="flex-1 flex overflow-hidden">

        {/* LEFT: Problem Panel — width driven by leftPct */}
        <div
          className="shrink-0 border-r flex flex-col bg-card overflow-hidden min-w-0"
          style={{ width: `${leftPct}%`, minWidth: 0 }}
        >
          {/* Tab bar */}
          <div className="flex border-b px-4 shrink-0 overflow-x-auto">
            {DESC_TABS.map(tab => (
              <button key={tab.id} onClick={() => setDescTab(tab.id)}
                className={cn(
                  'py-2.5 px-3 text-xs font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                  (tab.id === 'tutor' || tab.id === 'hints')
                    ? descTab === tab.id
                      ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                      : 'border-transparent text-muted-foreground hover:text-violet-500'
                    : descTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                )}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable tabs */}
          {!isFullHeightTab && (
            <ScrollArea className="flex-1 min-w-0">
              <div className="p-5 w-full min-w-0 break-words">

                {descTab === 'description' && (
                  <>
                    {lcLoading && (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" /><Skeleton className="h-20 w-full mt-4 rounded-lg" />
                        <Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                    )}
                    {!lcLoading && lcError && (
                      <div className="rounded-lg border border-dashed p-5 text-center">
                        <AlertCircle className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">Couldn't fetch from LeetCode</p>
                        <p className="text-xs text-muted-foreground mb-3">{lcError}</p>
                        <a className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          href={`https://leetcode.com/problems/${problem.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}/`}
                          target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />View on LeetCode
                        </a>
                      </div>
                    )}
                    {!lcLoading && lcData && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {lcData.topicTags?.slice(0, 4).map(t => (
                            <Badge key={t.slug || t.name} variant="secondary" className="text-xs font-normal">
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                        <div className="desc-content min-w-0 w-full overflow-hidden">
                          <ProblemDescription html={lcData.contentHtml} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {descTab === 'tags' && (
                  <div className="space-y-3">
                    {!lcData?.topicTags?.length ? (
                      <p className="text-sm text-muted-foreground">{lcLoading ? 'Loading…' : 'No topics found.'}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {lcData.topicTags.map(t => (
                          <Badge key={t.slug || t.name} variant="outline" className="text-sm gap-1.5">
                            <Tag className="h-3 w-3 text-muted-foreground" />{t.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* AI Hints tab */}
          {descTab === 'hints' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <AIHintTab
                problem={{ ...problem, title: lcData?.title || problem.title }}
                code={code}
                language={language}
              />
              {(lcLoading || lcData?.hints?.length > 0) && (
                <div className="px-4 pb-4 border-t shrink-0 overflow-y-auto max-h-56">
                  <LCStaticHints hints={lcData?.hints} loading={lcLoading} />
                </div>
              )}
            </div>
          )}

          {/* Mentor AI tab */}
          {descTab === 'tutor' && (
            <AITutorPanel
              problem={{ ...problem, title: lcData?.title || problem.title }}
              code={code}
              language={language}
            />
          )}
        </div>

        {/* ── Drag handle ────────────────────────────────────────────────── */}
        <ResizeDivider onDrag={handleDividerDrag} />

        {/* RIGHT: Editor + Tests + Results — takes remaining width */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Right tab bar */}
          <div className="flex border-b px-4 shrink-0 bg-card">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('py-2.5 px-3 text-xs font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground')}>
                {tab.id === 'code'  && <Code2        className="h-3.5 w-3.5" />}
                {tab.id === 'tests' && <FlaskConical  className="h-3.5 w-3.5" />}
                {tab.label}
                {tab.id === 'results' && results.length > 0 && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    allPassed ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive')}>
                    {passed}/{results.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Code tab */}
          {activeTab === 'code' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <MonacoEditor
                  height="100%"
                  language={{ python3: 'python', javascript: 'javascript', java: 'java', cpp: 'cpp' }[language] || 'python'}
                  theme={document.documentElement.classList.contains('dark') ? 'vs-dark' : 'vs'}
                  value={code}
                  onChange={val => setCode(val ?? '')}
                  options={{
                    automaticLayout:          true,
                    fontSize:                 14,
                    fontFamily:               "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
                    fontLigatures:            true,
                    minimap:                  { enabled: true, scale: 1 },
                    scrollBeyondLastLine:     false,
                    wordWrap:                 'on',
                    tabSize:                  4,
                    insertSpaces:             true,
                    autoIndent:               'full',
                    lineNumbers:              'on',
                    glyphMargin:              false,
                    folding:                  true,
                    renderLineHighlight:      'gutter',
                    scrollbar:                { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                    padding:                  { top: 12, bottom: 12 },
                    suggestOnTriggerCharacters: true,
                    quickSuggestions:         true,
                    bracketPairColorization:  { enabled: true },
                  }}
                />
              </div>
              <div className="flex items-center gap-2 px-3 pb-3 pt-2 border-t shrink-0">
                <Button size="sm" variant="ghost" className="text-muted-foreground" title="Reset to starter code"
                  onClick={() => { if (starterCodeRef.current) setCode(starterCodeRef.current); }}>
                  <RotateCcw className="h-3.5 w-3.5" />Reset
                </Button>
                {language === 'python3' && pyStatus === 'idle' && (
                  <Button size="sm" variant="ghost" onClick={loadPy}>
                    <RefreshCw className="h-3.5 w-3.5" />Load Python Runtime
                  </Button>
                )}
                {language === 'python3' && pyStatus === 'loading' && (
                  <span className="flex items-center gap-1.5 text-xs text-warning">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading Pyodide (~10MB)…
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleRun}
                    disabled={isRunning || (language === 'python3' && pyStatus === 'loading')}>
                    {isRunning
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Running…</>
                      : <><Play    className="h-4 w-4" />Run ({testCases.length})</>}
                  </Button>
                  <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                    <FlaskConical className="h-4 w-4" />{isSubmitting ? 'Submitting…' : 'Submit'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tests tab */}
          {activeTab === 'tests' && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {testCases.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {lcLoading ? 'Loading test cases from LeetCode…' : 'No test cases yet.'}
                    </p>
                  </div>
                ) : (
                  testCases.map((tc, idx) => (
                    <TestCaseRow
                      key={tc.id} testCase={tc} index={idx}
                      onChange={updated => setTestCases(prev => prev.map(t => t.id === tc.id ? updated : t))}
                      onRemove={() => setTestCases(prev => prev.filter(t => t.id !== tc.id))}
                    />
                  ))
                )}
                <Button variant="outline" size="sm" className="w-full"
                  onClick={() => setTestCases(prev => [...prev, { id: Math.random().toString(36).slice(2), inputStr: '', expectedStr: '' }])}>
                  <Plus className="h-4 w-4" />Add Test Case
                </Button>
                {lcData?.examples?.length > 0 && (
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                    onClick={() => {
                      const lc = parseTestCases(lcData.exampleTestcases, lcData.examples);
                      setTestCases(lc.map(lcTestCaseToEditable));
                    }}>
                    <RefreshCw className="h-3.5 w-3.5" />Reload LeetCode examples
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Results tab */}
          {activeTab === 'results' && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {results.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Play className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Run your code to see test results</p>
                  </div>
                ) : (
                  <>
                    <div className={cn('rounded-xl border p-4 flex items-center gap-4',
                      allPassed ? 'border-success/40 bg-success/10' : 'border-destructive/30 bg-destructive/5')}>
                      {allPassed
                        ? <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
                        : <XCircle      className="h-8 w-8 text-destructive shrink-0" />}
                      <div>
                        <div className="font-semibold text-sm">
                          {allPassed ? 'All tests passed! 🎉' : `${passed} of ${results.length} passed`}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {passed} passed · {results.length - passed} failed
                        </div>
                      </div>
                    </div>
                    {results.map(result => <ResultRow key={result.id} result={result} />)}
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}