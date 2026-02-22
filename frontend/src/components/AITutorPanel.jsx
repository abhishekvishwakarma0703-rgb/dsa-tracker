/**
 * AITutorPanel + AIHintTab
 * ========================
 * AIHintTab  — exported standalone: used in CodeEditor's "Hints" tab.
 * AITutorPanel — full chat panel with inline progressive hints inside Mentor.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, Code2, BookOpen, Send, Trash2,
  Loader2, Bot, User, Eye, AlertTriangle, Zap,
  Lock, ChevronDown, ChevronRight, Sparkles, CheckCircle2, X,
} from 'lucide-react';
import { AIUsageDashboard } from '@/components/AIUsageDashboard';

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Babel-safe: never write literal ``` in JSX source
const FENCE         = '`'.repeat(3);
const CODE_BLOCK_RE = new RegExp(FENCE + '(\\w*)\\n?([\\s\\S]*?)' + FENCE, 'g');

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(CODE_BLOCK_RE, (_, lang, code) =>
      `<pre class="tutor-code-block"><code class="lang-${lang}">${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g,       '<code class="tutor-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,     '<em>$1</em>')
    .replace(/^[-] (.+)$/gm,    '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm,  '<li>$1</li>')
    .replace(/^### (.+)$/gm,    '<h3 class="tutor-h3">$1</h3>')
    .replace(/^## (.+)$/gm,     '<h2 class="tutor-h2">$1</h2>')
    .replace(/\n\n/g,            '</p><p class="tutor-p">')
    .replace(/\n/g,              '<br/>');
}

// ── Hint level definitions ────────────────────────────────────────────────────
const HINT_LEVELS = [
  {
    n: 1, label: 'Nudge', tagline: 'A gentle push in the right direction',
    icon: '💡',
    bgClass:      'bg-emerald-500/10 border-emerald-500/30',
    textClass:    'text-emerald-600 dark:text-emerald-400',
    badgeClass:   'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    dotClass:     'bg-emerald-400',
    gradClass:    'from-emerald-500 to-teal-500',
    dividerClass: 'bg-emerald-500/20',
    nextClass:    'text-emerald-600 dark:text-emerald-400',
  },
  {
    n: 2, label: 'Technique', tagline: 'Name the approach and why it works',
    icon: '🔧',
    bgClass:      'bg-amber-500/10 border-amber-500/30',
    textClass:    'text-amber-600 dark:text-amber-400',
    badgeClass:   'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    dotClass:     'bg-amber-400',
    gradClass:    'from-amber-500 to-orange-500',
    dividerClass: 'bg-amber-500/20',
    nextClass:    'text-amber-600 dark:text-amber-400',
  },
  {
    n: 3, label: 'Roadmap', tagline: 'Full step-by-step plan with complexity',
    icon: '🗺️',
    bgClass:      'bg-rose-500/10 border-rose-500/30',
    textClass:    'text-rose-600 dark:text-rose-400',
    badgeClass:   'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    dotClass:     'bg-rose-400',
    gradClass:    'from-rose-500 to-pink-500',
    dividerClass: 'bg-rose-500/20',
    nextClass:    'text-rose-600 dark:text-rose-400',
  },
];

// ── Shared progressive hint card list ────────────────────────────────────────
// Used by both AIHintTab (standalone) and InlineHintWidget (inside chat).
function ProgressiveHintCards({ sessionId, slug, code, language, activeModel }) {
  const [hints, setHints]             = useState({ 1: null, 2: null, 3: null });
  const [expanded, setExpanded]       = useState(null);
  const [maxUnlocked, setMaxUnlocked] = useState(0);

  const fetchHint = useCallback(async (level) => {
    if (hints[level]?.done || hints[level]?.loading) return;
    setHints(prev => ({ ...prev, [level]: { text: '', loading: true, done: false } }));
    setExpanded(level);

    const lv      = HINT_LEVELS[level - 1];
    const message = `Give me a Level ${level} hint — ${lv.tagline}.`;

    try {
      const res = await fetch(`${API}/tutor/chat`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id:   sessionId,
          message,
          problem_slug: slug,
          user_code:    code     || '',
          language:     language || 'python3',
          msg_type:     'hint',
          hint_level:   level,
          model:        activeModel,
        }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const { reply } = await res.json();
      setHints(prev => ({ ...prev, [level]: { text: reply, loading: false, done: true } }));
      setMaxUnlocked(prev => Math.max(prev, level));
    } catch (err) {
      setHints(prev => ({
        ...prev,
        [level]: { text: `Could not fetch hint: ${err.message}`, loading: false, done: true },
      }));
      setMaxUnlocked(prev => Math.max(prev, level));
    }
  }, [hints, sessionId, slug, code, language, activeModel]);

  const isUnlockable = (n) => n === 1 || hints[n - 1]?.done === true;

  return (
    <div className="space-y-2">
      {/* Progress header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1.5 items-center">
          {HINT_LEVELS.map(l => (
            <div key={l.n} className={cn(
              'rounded-full transition-all duration-500',
              hints[l.n]?.done
                ? cn('w-2.5 h-2.5', l.dotClass)
                : 'w-1.5 h-1.5 bg-muted-foreground/20'
            )} />
          ))}
        </div>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${(maxUnlocked / 3) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
          {maxUnlocked}/3
        </span>
      </div>

      {/* Level cards */}
      {HINT_LEVELS.map((lv) => {
        const hint      = hints[lv.n];
        const unlocked  = isUnlockable(lv.n);
        const isOpen    = expanded === lv.n;
        const isDone    = hint?.done    === true;
        const isLoading = hint?.loading === true;

        return (
          <div
            key={lv.n}
            className={cn(
              'rounded-xl border transition-all duration-300 overflow-hidden',
              unlocked ? lv.bgClass : 'bg-muted/20 border-muted/40 opacity-55',
              isOpen && isDone && 'shadow-md'
            )}
          >
            {/* Card trigger row */}
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
              onClick={() => {
                if (!unlocked) return;
                if (!hint) { fetchHint(lv.n); return; }
                setExpanded(isOpen ? null : lv.n);
              }}
              disabled={!unlocked}
            >
              {/* Emoji badge */}
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0',
                unlocked ? `bg-gradient-to-br ${lv.gradClass} shadow-sm` : 'bg-muted'
              )}>
                {unlocked ? lv.icon : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', unlocked ? lv.textClass : 'text-muted-foreground')}>
                    Level {lv.n} — {lv.label}
                  </span>
                  {isDone && <CheckCircle2 className={cn('h-3 w-3 shrink-0', lv.textClass)} />}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lv.tagline}</p>
              </div>

              <div className="shrink-0">
                {isLoading ? (
                  <Loader2 className={cn('h-3.5 w-3.5 animate-spin', lv.textClass)} />
                ) : !unlocked ? (
                  <Lock className="h-3 w-3 text-muted-foreground/40" />
                ) : !hint ? (
                  <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', lv.badgeClass)}>
                    Reveal
                  </span>
                ) : isOpen ? (
                  <ChevronDown className={cn('h-3.5 w-3.5', lv.textClass)} />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Locked notice */}
            {!unlocked && (
              <p className="px-4 pb-2.5 -mt-1 text-[10px] text-muted-foreground">
                Unlock Level {lv.n - 1} first to access this hint.
              </p>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="px-4 pb-3.5 space-y-2 animate-pulse">
                {[1, 0.85, 0.7, 0.9, 0.6].map((w, i) => (
                  <div key={i} className="h-2.5 bg-muted-foreground/10 rounded" style={{ width: `${w * 100}%` }} />
                ))}
              </div>
            )}

            {/* Collapsed teaser */}
            {isDone && !isOpen && (
              <p className="px-4 pb-2.5 -mt-1 text-[10px] text-muted-foreground line-clamp-1 italic opacity-70">
                {hint.text?.replace(/<[^>]+>/g, '').slice(0, 90)}…
              </p>
            )}

            {/* Expanded content */}
            {isDone && isOpen && (
              <div className="px-4 pb-3.5 hint-reveal">
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn('h-px flex-1', lv.dividerClass)} />
                  <span className={cn('text-[10px] font-semibold', lv.textClass)}>
                    {lv.icon} {lv.label} Hint
                  </span>
                  <div className={cn('h-px flex-1', lv.dividerClass)} />
                </div>

                <div
                  className="text-sm tutor-response leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: `<p class="tutor-p">${renderMarkdown(hint.text)}</p>` }}
                />

                {/* Next-level CTA */}
                {lv.n < 3 && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-muted flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Still stuck?</p>
                    {hints[lv.n + 1]?.done ? (
                      <button
                        onClick={() => setExpanded(lv.n + 1)}
                        className={cn('text-[11px] font-semibold flex items-center gap-1', HINT_LEVELS[lv.n].nextClass)}
                      >
                        View Level {lv.n + 1} <ChevronRight className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => fetchHint(lv.n + 1)}
                        disabled={hints[lv.n + 1]?.loading}
                        className={cn(
                          'text-[11px] font-semibold flex items-center gap-1 transition-opacity',
                          HINT_LEVELS[lv.n].nextClass,
                          hints[lv.n + 1]?.loading && 'opacity-40 pointer-events-none'
                        )}
                      >
                        <Sparkles className="h-3 w-3" />Get stronger hint
                      </button>
                    )}
                  </div>
                )}

                {lv.n === 3 && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-muted">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      All hints revealed — try coding it, or ask Mentor for the full solution.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer tip */}
      <div className="rounded-xl bg-muted/30 border border-dashed px-3.5 py-2.5 mt-1">
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          <span className="font-semibold">Pro tip:</span> Start at Level 1 and go deeper only when stuck.
          Struggling first builds stronger memory. 🧠
        </p>
      </div>
    </div>
  );
}

// ── Inline hint widget — used INSIDE the chat message stream ─────────────────
function InlineHintWidget({ sessionId, slug, code, language, activeModel, onDismiss }) {
  return (
    <div className="flex gap-2 mb-3 hint-reveal">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="flex-1 min-w-0 bg-card border rounded-2xl rounded-tl-sm shadow-sm overflow-hidden">
        {/* Widget header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
          <Lightbulb className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs font-semibold text-foreground">Progressive Hints</span>
          <span className="text-[10px] text-muted-foreground">· reveal level by level</span>
          <button
            onClick={onDismiss}
            className="ml-auto p-0.5 rounded hover:bg-muted text-muted-foreground/60 hover:text-muted-foreground"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <div className="p-3">
          <ProgressiveHintCards
            sessionId={sessionId}
            slug={slug}
            code={code}
            language={language}
            activeModel={activeModel}
          />
        </div>
      </div>
    </div>
  );
}

// ── AIHintTab — standalone export used in CodeEditor's "Hints" tab ────────────
export function AIHintTab({ problem, code, language }) {
  const [activeModel] = useState(DEFAULT_MODEL);

  const slug      = problem?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
  const sessionId = `demo-user-${slug}`;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-gradient-to-r from-violet-500/5 to-indigo-500/5 shrink-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Lightbulb className="h-3 w-3 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold">AI-Powered Hints</p>
          <p className="text-[10px] text-muted-foreground">Progressive · each level reveals more</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
          <Zap className="h-2.5 w-2.5" />
          {activeModel.replace('gemini-', 'g-')}
        </div>
      </div>

      {/* Scrollable hint cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <ProgressiveHintCards
          sessionId={sessionId}
          slug={slug}
          code={code}
          language={language}
          activeModel={activeModel}
        />
      </div>

      <TutorStyles />
    </div>
  );
}

// ── MessageBubble ─────────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isNote = msg.role === 'system_note';

  const typeIcon = {
    hint:     <Lightbulb className="h-3 w-3 text-warning" />,
    review:   <Code2     className="h-3 w-3 text-primary" />,
    explain:  <BookOpen  className="h-3 w-3 text-success" />,
    solution: <Eye       className="h-3 w-3 text-destructive" />,
    chat:     null,
  }[msg.msg_type] || null;

  if (isNote) {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{msg.content}</span>
      </div>
    );
  }

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 mb-3">
        <div className="max-w-[82%]">
          {typeIcon && (
            <div className="flex items-center gap-1 justify-end mb-0.5">
              {typeIcon}
              <span className="text-[10px] text-muted-foreground capitalize">{msg.msg_type}</span>
            </div>
          )}
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm leading-relaxed">
            {msg.content}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
          <User className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="max-w-[85%]">
        {typeIcon && (
          <div className="flex items-center gap-1 mb-0.5">
            {typeIcon}
            <span className="text-[10px] text-muted-foreground capitalize">{msg.msg_type}</span>
          </div>
        )}
        <div
          className="bg-card border rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm tutor-response shadow-sm"
          dangerouslySetInnerHTML={{ __html: `<p class="tutor-p">${renderMarkdown(msg.content)}</p>` }}
        />
      </div>
    </div>
  );
}

// ── Quick-action config ───────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'hint',     label: 'Hints',       icon: Lightbulb, color: 'hover:border-warning/50 hover:bg-warning/5 hover:text-warning' },
  { id: 'review',   label: 'Review Code', icon: Code2,     color: 'hover:border-primary/50 hover:bg-primary/5 hover:text-primary' },
  { id: 'explain',  label: 'Explain',     icon: BookOpen,  color: 'hover:border-success/50 hover:bg-success/5 hover:text-success' },
  { id: 'solution', label: 'Solution',    icon: Eye,       color: 'hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive' },
];

// ── Shared panel header ───────────────────────────────────────────────────────
function PanelHeader({ problem, activeModel, onToggleDashboard, onClear }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-gradient-to-r from-violet-500/10 to-indigo-500/10 shrink-0">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">Mentor AI</p>
        <p className="text-[10px] text-muted-foreground truncate">{problem?.title || 'No problem selected'}</p>
      </div>
      <button
        onClick={onToggleDashboard}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-600 shrink-0"
      >
        <Zap className="h-2.5 w-2.5" />
        {activeModel.replace('gemini-', 'g-').replace('claude-', 'c-')}
      </button>
      <button onClick={onClear} className="p-1 rounded hover:bg-muted text-muted-foreground" title="Clear chat">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Main AITutorPanel ─────────────────────────────────────────────────────────
export function AITutorPanel({ problem, code, language }) {
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [histLoading, setHistLoading]         = useState(true);
  const [showHints, setShowHints]             = useState(false);  // inline hint widget toggle
  const [solutionConfirm, setSolutionConfirm] = useState(false);
  const [activeModel, setActiveModel]         = useState(DEFAULT_MODEL);
  const [showDashboard, setShowDashboard]     = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const slug      = problem?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
  const sessionId = `demo-user-${slug}`;

  useEffect(() => {
    setHistLoading(true);
    setMessages([]);
    setShowHints(false);
    setSolutionConfirm(false);

    fetch(`${API}/tutor/history?session_id=${sessionId}`)
      .then(r => r.json())
      .then(hist => {
        if (Array.isArray(hist) && hist.length > 0) {
          setMessages(hist.map(m => ({
            role: m.role, content: m.content,
            msg_type: m.msg_type || 'chat', hint_level: m.hint_level || 0,
          })));
        } else {
          setMessages([{
            role: 'assistant',
            content: `Hey! I'm **Mentor**, your AI tutor for **${problem?.title || 'this problem'}**. Use the buttons below to get started!`,
            msg_type: 'chat',
          }]);
        }
      })
      .catch(() => setMessages([{
        role: 'assistant',
        content: `Hi! I'm **Mentor**. Couldn't connect to backend — make sure it's running.`,
        msg_type: 'chat',
      }]))
      .finally(() => setHistLoading(false));
  }, [sessionId, problem?.title]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, showHints]);

  const sendToTutor = useCallback(async ({ message, msgType = 'chat', hintLvl = 1, displayMsg = null }) => {
    if (loading) return;
    setMessages(prev => [...prev, { role: 'user', content: displayMsg || message, msg_type: msgType }]);
    setLoading(true);
    setShowHints(false);
    setSolutionConfirm(false);

    try {
      const res = await fetch(`${API}/tutor/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId, message,
          problem_slug: slug, user_code: code || '',
          language: language || 'python3', msg_type: msgType,
          hint_level: hintLvl, model: activeModel,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Server error ${res.status}`);
      const { reply } = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: reply, msg_type: msgType }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${err.message}. Check backend and API key.`,
        msg_type: 'chat',
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, slug, code, language, activeModel]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    sendToTutor({ message: text, msgType: 'chat' });
  };

  const handleQuickAction = (id) => {
    if (id === 'hint') {
      // Toggle the inline hint widget in the message stream
      setShowHints(v => !v);
      setSolutionConfirm(false);
    } else if (id === 'solution') {
      setSolutionConfirm(true);
      setShowHints(false);
    } else if (id === 'review') {
      setShowHints(false);
      setSolutionConfirm(false);
      sendToTutor({ message: 'Please review my current code.', msgType: 'review', displayMsg: 'Review my code' });
    } else if (id === 'explain') {
      setShowHints(false);
      setSolutionConfirm(false);
      sendToTutor({ message: 'Explain the concept/approach for this problem.', msgType: 'explain', displayMsg: 'Explain the concept' });
    }
  };

  const handleClear = async () => {
    try { await fetch(`${API}/tutor/history?session_id=${sessionId}`, { method: 'DELETE' }); } catch (_) {}
    setMessages([{
      role: 'assistant',
      content: `Fresh start! Ready to help with **${problem?.title}**.`,
      msg_type: 'chat',
    }]);
    setShowHints(false);
    setSolutionConfirm(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const headerProps = {
    problem, activeModel,
    onToggleDashboard: () => setShowDashboard(v => !v),
    onClear: handleClear,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <PanelHeader {...headerProps} />

      {showDashboard && (
        <AIUsageDashboard
          currentModel={activeModel}
          onModelChange={setActiveModel}
          onClose={() => setShowDashboard(false)}
        />
      )}

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {histLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-4 justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="bg-card border rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-muted-foreground">Thinking…</span>
            </div>
          </div>
        )}

        {/* ── Inline progressive hint widget ── */}
        {showHints && !loading && (
          <InlineHintWidget
            sessionId={sessionId}
            slug={slug}
            code={code}
            language={language}
            activeModel={activeModel}
            onDismiss={() => setShowHints(false)}
          />
        )}

        {/* Solution confirmation */}
        {solutionConfirm && !loading && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 my-2 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-destructive">Show full solution?</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Try it yourself first — you'll learn more.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => setSolutionConfirm(false)}>Not yet</Button>
              <Button
                size="sm" variant="destructive" className="flex-1 text-xs h-7"
                onClick={() => sendToTutor({ message: 'Show me the full solution.', msgType: 'solution', displayMsg: 'Show solution' })}
              >
                Yes, show it
              </Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {!loading && !solutionConfirm && (
        <div className="px-3 pb-2 grid grid-cols-4 gap-1.5 shrink-0">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.id}
              onClick={() => handleQuickAction(a.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-all text-muted-foreground',
                a.color,
                // Keep Hints button highlighted while widget is open
                a.id === 'hint' && showHints && 'border-warning/50 bg-warning/5 text-warning'
              )}
            >
              <a.icon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium leading-none">{a.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 px-3 pb-3 pt-1 border-t shrink-0">
        <textarea
          ref={inputRef}
          rows={1}
          className="flex-1 text-sm rounded-xl border bg-muted/30 px-3 py-2 focus:outline-none focus:ring-1 resize-none min-h-[36px] max-h-[96px]"
          placeholder="Ask me anything…"
          value={input}
          onChange={e => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button
          size="sm"
          className="self-end rounded-xl px-3 bg-gradient-to-br from-violet-500 to-indigo-600"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      <TutorStyles />
    </div>
  );
}

// ── Shared CSS ────────────────────────────────────────────────────────────────
function TutorStyles() {
  return (
    <style>{`
      .tutor-response { line-height: 1.65; }
      .tutor-response p.tutor-p { margin-bottom: 0.5em; }
      .tutor-response ul { padding-left: 1.25em; margin: 0.35em 0; }
      .tutor-response li { margin-bottom: 0.2em; }
      .tutor-h2 { font-size:0.9em; font-weight:700; margin:0.6em 0 0.3em; }
      .tutor-h3 { font-size:0.85em; font-weight:600; margin:0.5em 0 0.25em; }
      .tutor-code-block {
        background: hsl(var(--muted)); border: 1px solid hsl(var(--border));
        border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 0.5rem 0;
        overflow-x: auto; font-family: monospace; font-size: 0.78rem;
      }
      .tutor-inline-code {
        font-family: monospace; font-size: 0.82em;
        background: hsl(var(--muted)); border: 1px solid hsl(var(--border));
        padding: 0.1em 0.35em; border-radius: 0.25em;
      }
      .hint-reveal { animation: hintFadeIn 0.3s ease; }
      @keyframes hintFadeIn {
        from { opacity:0; transform:translateY(-6px); }
        to   { opacity:1; transform:translateY(0); }
      }
    `}</style>
  );
}