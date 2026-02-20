/**
 * DSA Visualization Component
 * Pure JS/CSS animations — zero cost, zero LLM, zero external API.
 * Renders deterministic step-by-step algorithm animations.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipBack, SkipForward, ChevronRight, RotateCcw } from 'lucide-react';

const ALGO_TYPES = [
  { id: 'array', label: 'Array Traversal', emoji: '📊' },
  { id: 'sliding_window', label: 'Sliding Window', emoji: '🪟' },
  { id: 'binary_search', label: 'Binary Search', emoji: '🔍' },
  { id: 'bubble_sort', label: 'Bubble Sort', emoji: '🫧' },
  { id: 'linked_list', label: 'Linked List', emoji: '🔗' },
  { id: 'binary_tree', label: 'Binary Tree BFS', emoji: '🌳' },
];

// ─── Local deterministic generators (mirrors backend) ─────────────────────────

function genArraySteps(arr) {
  const steps = [{ type: 'init', array: [...arr], highlight: [], message: 'Initial array' }];
  for (let i = 0; i < arr.length; i++) {
    steps.push({ type: 'visit', array: [...arr], highlight: [i], pointer: i, message: `Visit index ${i} → value = ${arr[i]}` });
  }
  steps.push({ type: 'done', array: [...arr], highlight: [], message: 'Traversal complete!' });
  return steps;
}

function genSlidingWindowSteps(arr, k = 3) {
  const n = arr.length; k = Math.min(k, n);
  let sum = arr.slice(0, k).reduce((a, b) => a + b, 0);
  const steps = [{ type: 'init', array: [...arr], window: [0, k - 1], sum, message: `Window [0..${k - 1}], sum=${sum}` }];
  let maxSum = sum;
  for (let i = 1; i <= n - k; i++) {
    sum = sum - arr[i - 1] + arr[i + k - 1];
    maxSum = Math.max(maxSum, sum);
    steps.push({ type: 'slide', array: [...arr], window: [i, i + k - 1], sum, maxSum, removed: arr[i - 1], added: arr[i + k - 1], message: `Remove ${arr[i-1]}, add ${arr[i+k-1]} → sum=${sum}` });
  }
  steps.push({ type: 'done', array: [...arr], window: [n - k, n - 1], sum, maxSum, message: `Done! Max sum = ${maxSum}` });
  return steps;
}

function genBinarySearchSteps(arr, target) {
  let lo = 0, hi = arr.length - 1;
  const steps = [];
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    steps.push({ type: 'compare', array: [...arr], lo, hi, mid, target, range: Array.from({length: hi - lo + 1}, (_, i) => lo + i), highlight: [mid], message: `lo=${lo}, hi=${hi}, mid=${mid}, arr[${mid}]=${arr[mid]}` });
    if (arr[mid] === target) {
      steps.push({ type: 'found', array: [...arr], lo, hi, mid, target, highlight: [mid], message: `✅ Found ${target} at index ${mid}!` });
      return steps;
    } else if (arr[mid] < target) { lo = mid + 1; steps[steps.length-1].direction = 'right'; }
    else { hi = mid - 1; steps[steps.length-1].direction = 'left'; }
  }
  steps.push({ type: 'not_found', array: [...arr], message: `❌ ${target} not found` });
  return steps;
}

function genBubbleSortSteps(arr) {
  const a = [...arr], steps = [], n = a.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      steps.push({ type: 'compare', array: [...a], comparing: [j, j+1], sorted: n - i, message: `Compare a[${j}]=${a[j]} and a[${j+1}]=${a[j+1]}` });
      if (a[j] > a[j+1]) {
        [a[j], a[j+1]] = [a[j+1], a[j]];
        steps.push({ type: 'swap', array: [...a], swapped: [j, j+1], sorted: n - i, message: `Swap → now [${a[j]}, ${a[j+1]}]` });
      }
    }
  }
  steps.push({ type: 'done', array: [...a], sorted: 0, message: '✅ Sorted!' });
  return steps;
}

function genLinkedListSteps(values) {
  const steps = [{ type: 'init', nodes: [...values], current: null, message: 'Linked list initialized' }];
  for (let i = 0; i < values.length; i++) {
    steps.push({ type: 'traverse', nodes: [...values], current: i, next: i + 1 < values.length ? i + 1 : null, message: `Visit node [${i}]: value=${values[i]}` + (i + 1 < values.length ? ` → next` : ' → null') });
  }
  steps.push({ type: 'done', nodes: [...values], current: null, message: '✅ Traversal complete!' });
  return steps;
}

function genBinaryTreeSteps(values) {
  const steps = [{ type: 'init', nodes: [...values], visited: [], queue: [0], current: null, message: 'BFS from root' }];
  const queue = [0], visited = [];
  while (queue.length) {
    const idx = queue.shift();
    if (idx >= values.length || values[idx] == null) continue;
    visited.push(idx);
    const left = 2 * idx + 1, right = 2 * idx + 2;
    const children = [];
    if (left < values.length && values[left] != null) { queue.push(left); children.push(left); }
    if (right < values.length && values[right] != null) { queue.push(right); children.push(right); }
    steps.push({ type: 'visit', nodes: [...values], visited: [...visited], queue: [...queue], current: idx, children, message: `Visit [${idx}] = ${values[idx]}` + (children.length ? ` → enqueue [${children.map(c=>values[c]).join(', ')}]` : '') });
  }
  steps.push({ type: 'done', nodes: [...values], visited: [...visited], current: null, message: '✅ BFS complete!' });
  return steps;
}

function getSteps(algoId, inputData) {
  const defaults = {
    array: [4, 2, 7, 1, 9, 3, 6, 5],
    sliding_window: [1, 4, 2, 9, 5, 3, 7, 2],
    binary_search: [1, 3, 5, 7, 9, 11, 13, 15],
    bubble_sort: [64, 34, 25, 12, 22, 11],
    linked_list: [10, 20, 30, 40, 50],
    binary_tree: [1, 2, 3, 4, 5, 6, 7],
  };
  const d = inputData || defaults[algoId];
  switch (algoId) {
    case 'array': return genArraySteps(d);
    case 'sliding_window': return genSlidingWindowSteps(Array.isArray(d) ? d : d.array || defaults.sliding_window, d?.k || 3);
    case 'binary_search': return genBinarySearchSteps(Array.isArray(d) ? d : d.array || defaults.binary_search, d?.target ?? 7);
    case 'bubble_sort': return genBubbleSortSteps(d);
    case 'linked_list': return genLinkedListSteps(d);
    case 'binary_tree': return genBinaryTreeSteps(d);
    default: return [];
  }
}

// ─── Renderers ────────────────────────────────────────────────

function ArrayBar({ value, index, highlight, sorted, swapped, comparing, range, window: win, max }) {
  const heightPct = Math.max(10, (value / (max || 1)) * 80);
  const isHighlighted = highlight?.includes(index);
  const isSorted = sorted !== undefined && index >= sorted;
  const isSwapped = swapped?.includes(index);
  const isComparing = comparing?.includes(index);
  const isInRange = range?.includes(index);
  const isInWindow = win && index >= win[0] && index <= win[1];

  return (
    <div className="flex flex-col items-center gap-1 flex-1 max-w-16">
      <span className={cn(
        'text-xs font-mono font-bold transition-colors',
        isHighlighted && 'text-primary',
        isSorted && 'text-emerald-500',
        isSwapped && 'text-orange-500',
        !isHighlighted && !isSorted && !isSwapped && 'text-muted-foreground'
      )}>{value}</span>
      <div
        className={cn(
          'w-full rounded-t transition-all duration-300',
          isSwapped && 'bg-orange-400',
          isComparing && !isSwapped && 'bg-yellow-400',
          isHighlighted && !isSwapped && !isComparing && 'bg-primary',
          isInWindow && !isHighlighted && !isSwapped && 'bg-violet-400',
          isSorted && !isHighlighted && 'bg-emerald-400',
          isInRange && !isHighlighted && !isSorted && !isInWindow && 'bg-blue-300',
          !isHighlighted && !isSorted && !isSwapped && !isComparing && !isInWindow && !isInRange && 'bg-muted'
        )}
        style={{ height: `${heightPct}%` }}
      />
      <span className="text-[9px] text-muted-foreground">{index}</span>
    </div>
  );
}

function ArrayViz({ step, maxVal }) {
  const arr = step?.array || [];
  const max = maxVal || Math.max(...arr, 1);
  return (
    <div className="flex items-end gap-1 h-40 w-full px-2">
      {arr.map((v, i) => (
        <ArrayBar key={i} value={v} index={i} max={max}
          highlight={step?.highlight || (step?.pointer !== undefined ? [step.pointer] : [])}
          sorted={step?.sorted}
          swapped={step?.swapped}
          comparing={step?.comparing}
          range={step?.range}
          window={step?.window}
        />
      ))}
    </div>
  );
}

function LinkedListViz({ step }) {
  const nodes = step?.nodes || [];
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-4 px-2">
      {nodes.map((v, i) => (
        <React.Fragment key={i}>
          <div className={cn(
            'flex flex-col items-center transition-all duration-300',
          )}>
            <div className={cn(
              'w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all',
              step?.current === i && 'border-primary bg-primary/10 scale-110 shadow-lg',
              step?.visited?.includes(i) && step?.current !== i && 'border-emerald-400 bg-emerald-50',
              step?.current !== i && !step?.visited?.includes(i) && 'border-border bg-card'
            )}>
              {v}
            </div>
            <span className="text-[9px] text-muted-foreground mt-1">[{i}]</span>
          </div>
          {i < nodes.length - 1 && (
            <div className="flex items-center">
              <div className={cn(
                'h-0.5 w-6 transition-colors',
                step?.current === i ? 'bg-primary' : 'bg-muted-foreground/30'
              )} />
              <ChevronRight className="h-3 w-3 -ml-1 text-muted-foreground/50" />
            </div>
          )}
          {i === nodes.length - 1 && (
            <div className="flex items-center gap-1 ml-1">
              <div className="h-0.5 w-4 bg-muted-foreground/30" />
              <span className="text-xs text-muted-foreground font-mono">null</span>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function BinaryTreeViz({ step }) {
  const nodes = step?.nodes || [];
  const levels = Math.ceil(Math.log2(nodes.length + 1));

  const renderLevel = (levelIdx) => {
    const start = Math.pow(2, levelIdx) - 1;
    const end = Math.min(Math.pow(2, levelIdx + 1) - 1, nodes.length);
    const levelNodes = [];
    for (let i = start; i < end; i++) {
      levelNodes.push({ idx: i, val: nodes[i] });
    }
    if (levelNodes.every(n => n.val == null)) return null;

    return (
      <div key={levelIdx} className="flex justify-center gap-4 my-2">
        {levelNodes.map(({ idx, val }) => (
          <div key={idx} className="flex flex-col items-center">
            {val != null ? (
              <div className={cn(
                'w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300',
                step?.current === idx && 'border-primary bg-primary/10 scale-110 shadow-md',
                step?.visited?.includes(idx) && step?.current !== idx && 'border-emerald-400 bg-emerald-50',
                step?.queue?.includes(idx) && !step?.visited?.includes(idx) && 'border-yellow-400 bg-yellow-50',
                !step?.visited?.includes(idx) && step?.current !== idx && !step?.queue?.includes(idx) && 'border-border bg-card'
              )}>
                {val}
              </div>
            ) : (
              <div className="w-10 h-10" />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto py-2">
      {Array.from({ length: levels }, (_, i) => renderLevel(i))}
      <div className="flex justify-center gap-4 mt-2 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-primary/40 inline-block" />Current</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-300 inline-block" />Visited</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-300 inline-block" />In Queue</span>
      </div>
    </div>
  );
}

// ─── Main Visualization Component ────────────────────────────

export function Visualization({ problem }) {
  const [algoType, setAlgoType] = useState('array');
  const [steps, setSteps] = useState([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800); // ms per step
  const timerRef = useRef(null);

  const currentStep = steps[stepIdx] || null;
  const maxVal = steps.length ? Math.max(...(steps[0]?.array || steps[0]?.nodes || [1]), 1) : 1;

  // Generate steps when algoType changes
  useEffect(() => {
    const generated = getSteps(algoType);
    setSteps(generated);
    setStepIdx(0);
    setPlaying(false);
  }, [algoType]);

  // Auto-play
  useEffect(() => {
    if (!playing) { clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setStepIdx(prev => {
        if (prev >= steps.length - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(timerRef.current);
  }, [playing, speed, steps.length]);

  const reset = () => { setStepIdx(0); setPlaying(false); };

  const renderViz = () => {
    if (!currentStep) return null;
    const isTreeType = algoType === 'binary_tree';
    const isListType = algoType === 'linked_list';

    if (isTreeType) return <BinaryTreeViz step={currentStep} />;
    if (isListType) return <LinkedListViz step={currentStep} />;
    return <ArrayViz step={currentStep} maxVal={maxVal} />;
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Algorithm selector */}
      <div className="flex gap-1.5 flex-wrap p-3 border-b bg-muted/20">
        {ALGO_TYPES.map(a => (
          <button
            key={a.id}
            onClick={() => setAlgoType(a.id)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all gap-1 flex items-center',
              algoType === a.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-muted-foreground hover:bg-muted'
            )}
          >
            <span>{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* Visualization area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Message */}
        <div className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{currentStep?.message || '—'}</span>
            <span className="text-xs text-muted-foreground font-mono">
              Step {stepIdx + 1} / {steps.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${steps.length > 1 ? (stepIdx / (steps.length - 1)) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4">
          {renderViz()}
        </div>

        {/* Step info cards */}
        {currentStep && (
          <div className="flex gap-2 flex-wrap px-4 pb-3">
            {currentStep.sum !== undefined && (
              <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Window Sum: </span>
                <span className="font-bold text-violet-700">{currentStep.sum}</span>
              </div>
            )}
            {currentStep.maxSum !== undefined && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
                <span className="text-xs text-muted-foreground">Max Sum: </span>
                <span className="font-bold text-emerald-700">{currentStep.maxSum}</span>
              </div>
            )}
            {currentStep.direction && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5">
                <span className="text-xs">Go {currentStep.direction === 'right' ? '→ right' : '← left'}</span>
              </div>
            )}
            {currentStep.type === 'found' && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 animate-bounce">
                <span className="text-xs font-bold text-emerald-700">🎯 Target Found!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={reset}><RotateCcw className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setStepIdx(i => Math.max(0, i - 1))} disabled={stepIdx === 0}><SkipBack className="h-3.5 w-3.5" /></Button>
          <Button size="sm" className="h-8 px-3 gap-1.5" onClick={() => setPlaying(p => !p)} disabled={stepIdx >= steps.length - 1 && !playing}>
            {playing ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Play</>}
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setStepIdx(i => Math.min(steps.length - 1, i + 1))} disabled={stepIdx >= steps.length - 1}><SkipForward className="h-3.5 w-3.5" /></Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Speed:</span>
          <input type="range" min="200" max="2000" step="100" value={2200 - speed}
            onChange={e => setSpeed(2200 - +e.target.value)}
            className="w-20 h-2 accent-primary" />
          <span className="text-xs text-muted-foreground">{speed >= 1500 ? 'Slow' : speed >= 700 ? 'Medium' : 'Fast'}</span>
        </div>
      </div>
    </div>
  );
}
