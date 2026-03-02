/**
 * SubmissionResult — shows test case pass/fail, complexity chart, and AI analysis.
 */
import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';
import {
  CheckCircle2, XCircle, Loader2, Zap, Database, Sparkles,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw
} from 'lucide-react';

// ── Simple complexity chart ──────────────────────────────────────────────────
const COMPLEXITY_ORDER = ['O(1)','O(log n)','O(n)','O(n log n)','O(n²)','O(n³)','O(2ⁿ)','O(n!)'];

function ComplexityBar({ label, value, type }) {
  const idx     = COMPLEXITY_ORDER.indexOf(value);
  const width   = idx >= 0 ? Math.round(((idx + 1) / COMPLEXITY_ORDER.length) * 100) : 50;
  const color   = width <= 37 ? 'bg-green-500' : width <= 62 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{value || '?'}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${width}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
        <span>O(1) — best</span>
        <span>O(n!) — worst</span>
      </div>
    </div>
  );
}

// ── Single test case row ─────────────────────────────────────────────────────
function TestCaseRow({ tc, index }) {
  const [open, setOpen] = useState(false);
  const passed = tc.passed;

  return (
    <div className={cn('rounded-lg border p-3 mb-2 text-sm', passed ? 'border-green-200 bg-green-50 dark:bg-green-950/20' : 'border-red-200 bg-red-50 dark:bg-red-950/20')}>
      <button className="w-full flex items-center justify-between gap-2" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2">
          {passed
            ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            : <XCircle      className="h-4 w-4 text-red-500   shrink-0" />}
          <span className="font-medium">Test Case {index + 1}</span>
          {passed ? <Badge variant="outline" className="text-green-600 border-green-400 text-xs">Passed</Badge>
                  : <Badge variant="outline" className="text-red-600   border-red-400   text-xs">Failed</Badge>}
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t pt-2">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Input</span>
            <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto">{String(tc.input)}</pre>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Expected</span>
            <pre className="mt-1 rounded bg-muted p-2 text-xs overflow-x-auto">{String(tc.expected)}</pre>
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase">Your Output</span>
            <pre className={cn('mt-1 rounded p-2 text-xs overflow-x-auto', passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
              {tc.output !== undefined ? String(tc.output) : '—'}
            </pre>
          </div>
          {tc.error && (
            <div>
              <span className="text-xs font-semibold text-red-500 uppercase">Error</span>
              <pre className="mt-1 rounded bg-red-100 dark:bg-red-900/30 p-2 text-xs overflow-x-auto text-red-700">{tc.error}</pre>
            </div>
          )}
          {tc.execution_time && (
            <div className="text-xs text-muted-foreground">Runtime: {tc.execution_time}ms</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function SubmissionResult({ result, problem, language, code, onGenerateTestCases }) {
  const [aiAnalysis,    setAiAnalysis]    = useState(null);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiError,       setAiError]       = useState(null);
  const [genLoading,    setGenLoading]    = useState(false);

  const testResults  = result?.test_results   || [];
  const passed       = result?.passed_test_cases ?? 0;
  const total        = result?.total_test_cases  ?? testResults.length;
  const hasTests     = total > 0;
  const allPassed    = hasTests && passed === total;

  useEffect(() => {
    if (code && language) runComplexityAnalysis();
  }, [result?.id]);

  async function runComplexityAnalysis() {
    if (!code) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await apiClient.analyzeComplexity(code, language, problem?.title || '');
      setAiAnalysis(data);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  async function handleGenerateTestCases() {
    if (!problem?.id) return;
    setGenLoading(true);
    try {
      await onGenerateTestCases();
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-4">

      {/* ── Summary banner ── */}
      <div className={cn('rounded-xl p-4 flex items-center justify-between',
        !hasTests ? 'bg-muted'
        : allPassed ? 'bg-green-50 dark:bg-green-950/30 border border-green-200'
        : 'bg-red-50 dark:bg-red-950/30 border border-red-200'
      )}>
        <div>
          <div className="text-lg font-bold">
            {!hasTests ? 'Submitted' : allPassed ? '🎉 All Tests Passed!' : `${passed}/${total} Tests Passed`}
          </div>
          <div className="text-sm text-muted-foreground">
            Version #{result?.version_number} • {result?.language}
          </div>
        </div>
        {hasTests && (
          <div className="text-2xl font-black">
            {Math.round((passed / total) * 100)}%
          </div>
        )}
      </div>

      {/* ── Complexity section ── */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" /> Complexity Analysis
          </h3>
          <Button variant="ghost" size="sm" onClick={runComplexityAnalysis} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        </div>

        {aiLoading && (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        )}

        {aiError && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {aiError}
          </div>
        )}

        {aiAnalysis && !aiLoading && (
          <div>
            <ComplexityBar label="Time Complexity"  value={aiAnalysis.time_complexity}  />
            <ComplexityBar label="Space Complexity" value={aiAnalysis.space_complexity} />

            {aiAnalysis.time_explanation && (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm space-y-2">
                <p><strong>Time:</strong> {aiAnalysis.time_explanation}</p>
                <p><strong>Space:</strong> {aiAnalysis.space_explanation}</p>
                {aiAnalysis.is_optimal === false && aiAnalysis.optimization_hint && (
                  <p className="text-yellow-600 dark:text-yellow-400">
                    <strong>💡 Tip:</strong> {aiAnalysis.optimization_hint}
                  </p>
                )}
                {aiAnalysis.is_optimal && (
                  <p className="text-green-600 dark:text-green-400">✅ This solution is optimal!</p>
                )}
              </div>
            )}
          </div>
        )}

        {!aiAnalysis && !aiLoading && (
          <div className="flex gap-4 text-sm">
            <span className="font-mono">Time: {result?.time_complexity || '—'}</span>
            <span className="font-mono">Space: {result?.space_complexity || '—'}</span>
          </div>
        )}
      </div>

      {/* ── Test cases ── */}
      <div className="rounded-xl border p-4">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Database className="h-4 w-4 text-blue-500" /> Test Cases
          {hasTests && (
            <Badge variant={allPassed ? 'default' : 'destructive'} className="ml-auto">
              {passed}/{total} passed
            </Badge>
          )}
        </h3>

        {!hasTests && (
          <div className="text-center py-6 text-muted-foreground">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm mb-3">No test cases for this problem yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateTestCases}
              disabled={genLoading || !problem?.id}
              className="gap-2"
            >
              {genLoading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
                : <><Sparkles className="h-4 w-4" /> Generate Test Cases (AI)</>
              }
            </Button>
          </div>
        )}

        {hasTests && (
          <ScrollArea className="max-h-96">
            {testResults.map((tc, i) => (
              <TestCaseRow key={i} tc={tc} index={i} />
            ))}
          </ScrollArea>
        )}
      </div>
    </div>
  );
}

export default SubmissionResult;
