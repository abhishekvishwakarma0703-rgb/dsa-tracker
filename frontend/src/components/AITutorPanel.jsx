import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Lightbulb, Code2, BookOpen, Send, Trash2,
  Loader2, Bot, User, Eye, AlertTriangle, Zap,
  Lock, ChevronDown, ChevronRight, Sparkles, CheckCircle2, X,
} from 'lucide-react';
import { AIUsageDashboard } from '@/components/AIUsageDashboard';
import apiClient from '@/services/apiClient'; // Ensure this path is correct for your project

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

// Babel-safe: never write literal ``` in JSX source
const FENCE = '`'.repeat(3);
const CODE_BLOCK_RE = new RegExp(FENCE + '(\\w*)\\n?([\\s\\S]*?)' + FENCE, 'g');

// --- Helper Functions ---
function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(CODE_BLOCK_RE, (_, lang, code) =>
      `<pre class="tutor-code-block"><code class="lang-${lang}">${escHtml(code.trim())}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="tutor-inline-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^[-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^### (.+)$/gm, '<h3 class="tutor-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="tutor-h2">$1</h2>')
    .replace(/\n\n/g, '</p><p class="tutor-p">')
    .replace(/\n/g, '<br/>');
}

const HINT_LEVELS = [
  { n: 1, label: 'Nudge', tagline: 'A gentle push in the right direction', icon: '💡', bgClass: 'bg-emerald-500/10 border-emerald-500/30', textClass: 'text-emerald-600 dark:text-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300', dotClass: 'bg-emerald-400', gradClass: 'from-emerald-500 to-teal-500', dividerClass: 'bg-emerald-500/20', nextClass: 'text-emerald-600 dark:text-emerald-400' },
  { n: 2, label: 'Technique', tagline: 'Name the approach and why it works', icon: '🔧', bgClass: 'bg-amber-500/10 border-amber-500/30', textClass: 'text-amber-600 dark:text-amber-400', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300', dotClass: 'bg-amber-400', gradClass: 'from-amber-500 to-orange-500', dividerClass: 'bg-amber-500/20', nextClass: 'text-amber-600 dark:text-amber-400' },
  { n: 3, label: 'Roadmap', tagline: 'Full step-by-step plan with complexity', icon: '🗺️', bgClass: 'bg-rose-500/10 border-rose-500/30', textClass: 'text-rose-600 dark:text-rose-400', badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300', dotClass: 'bg-rose-400', gradClass: 'from-rose-500 to-pink-500', dividerClass: 'bg-rose-500/20', nextClass: 'text-rose-600 dark:text-rose-400' },
];

// --- Sub-Components ---
// ── AIHintTab — Standalone export for CodeEditor ────────────────────────────
export function AIHintTab({ problem, code, language }) {
  const [activeModel] = useState(DEFAULT_MODEL);
  
  // Use the same session logic as AITutorPanel for consistency
  const user = apiClient.getUser();
  const slug = problem?.leetcode_slug || 'unknown';
  const sessionId = user ? `user-${user.id}-${slug}` : `guest-${slug}`;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Subtle Tab Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/10 shrink-0">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <Lightbulb className="h-3 w-3 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold">AI-Powered Hints</p>
          <p className="text-[10px] text-muted-foreground">Level-by-level progressive guidance</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
          <Zap className="h-2.5 w-2.5" />
          {activeModel.replace('gemini-', 'g-')}
        </div>
      </div>

      {/* Scrollable Hint Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        <ProgressiveHintCards
          sessionId={sessionId}
          slug={slug}
          code={code}
          language={language}
          activeModel={activeModel}
        />
        
        {/* Helper Tip */}
        <div className="mt-6 p-3 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/5">
          <p className="text-[11px] text-muted-foreground leading-relaxed text-center">
            Getting hints here won't spoil the solution immediately. 
            We provide just enough info to keep you moving! 🚀
          </p>
        </div>
      </div>

      <TutorStyles />
    </div>
  );
}
function ProgressiveHintCards({ sessionId, slug, code, language, activeModel }) {
  const [hints, setHints] = useState({ 1: null, 2: null, 3: null });
  const [expanded, setExpanded] = useState(null);
  const [maxUnlocked, setMaxUnlocked] = useState(0);

  const fetchHint = useCallback(async (level) => {
    if (hints[level]?.done || hints[level]?.loading) return;
    setHints(prev => ({ ...prev, [level]: { text: '', loading: true, done: false } }));
    setExpanded(level);

    const lv = HINT_LEVELS[level - 1];
    const message = `Give me a Level ${level} hint — ${lv.tagline}.`;

    try {
      const res = await apiClient.tutorChat(sessionId, message, slug, code, language, 'hint', level, activeModel);
      setHints(prev => ({ ...prev, [level]: { text: res.reply, loading: false, done: true } }));
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
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1.5 items-center">
          {HINT_LEVELS.map(l => (
            <div key={l.n} className={cn(
              'rounded-full transition-all duration-500',
              hints[l.n]?.done ? cn('w-2.5 h-2.5', l.dotClass) : 'w-1.5 h-1.5 bg-muted-foreground/20'
            )} />
          ))}
        </div>
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-all duration-700 ease-out rounded-full"
            style={{ width: `${(maxUnlocked / 3) * 100}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground font-medium tabular-nums">{maxUnlocked}/3</span>
      </div>

      {HINT_LEVELS.map((lv) => {
        const hint = hints[lv.n];
        const unlocked = isUnlockable(lv.n);
        const isOpen = expanded === lv.n;
        const isDone = hint?.done === true;
        const isLoading = hint?.loading === true;

        return (
          <div key={lv.n} className={cn('rounded-xl border transition-all duration-300 overflow-hidden', unlocked ? lv.bgClass : 'bg-muted/20 border-muted/40 opacity-55', isOpen && isDone && 'shadow-md')}>
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
              onClick={() => {
                if (!unlocked) return;
                if (!hint) { fetchHint(lv.n); return; }
                setExpanded(isOpen ? null : lv.n);
              }}
              disabled={!unlocked}
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0', unlocked ? `bg-gradient-to-br ${lv.gradClass} shadow-sm` : 'bg-muted')}>
                {unlocked ? lv.icon : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', unlocked ? lv.textClass : 'text-muted-foreground')}>Level {lv.n} — {lv.label}</span>
                  {isDone && <CheckCircle2 className={cn('h-3 w-3 shrink-0', lv.textClass)} />}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lv.tagline}</p>
              </div>
              <div className="shrink-0">
                {isLoading ? <Loader2 className={cn('h-3.5 w-3.5 animate-spin', lv.textClass)} /> : !unlocked ? <Lock className="h-3 w-3 text-muted-foreground/40" /> : !hint ? <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full', lv.badgeClass)}>Reveal</span> : isOpen ? <ChevronDown className={cn('h-3.5 w-3.5', lv.textClass)} /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
            </button>
            {!unlocked && <p className="px-4 pb-2.5 -mt-1 text-[10px] text-muted-foreground">Unlock Level {lv.n - 1} first.</p>}
            {isLoading && <div className="px-4 pb-3.5 space-y-2 animate-pulse">{[1, 0.85, 0.7, 0.9, 0.6].map((w, i) => <div key={i} className="h-2.5 bg-muted-foreground/10 rounded" style={{ width: `${w * 100}%` }} />)}</div>}
            {isDone && isOpen && (
              <div className="px-4 pb-3.5 hint-reveal">
                <div className="flex items-center gap-2 mb-3"><div className={cn('h-px flex-1', lv.dividerClass)} /><span className={cn('text-[10px] font-semibold', lv.textClass)}>{lv.icon} {lv.label} Hint</span><div className={cn('h-px flex-1', lv.dividerClass)} /></div>
                <div className="text-sm tutor-response leading-relaxed" dangerouslySetInnerHTML={{ __html: `<p class="tutor-p">${renderMarkdown(hint.text)}</p>` }} />
                {lv.n < 3 && (
                  <div className="mt-3.5 pt-3 border-t border-dashed border-muted flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Still stuck?</p>
                    <button onClick={() => hints[lv.n + 1]?.done ? setExpanded(lv.n + 1) : fetchHint(lv.n + 1)} className={cn('text-[11px] font-semibold flex items-center gap-1', HINT_LEVELS[lv.n].nextClass)} disabled={hints[lv.n + 1]?.loading}>
                      {hints[lv.n + 1]?.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} {hints[lv.n+1]?.done ? `View Level ${lv.n+1}` : 'Get stronger hint'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isNote = msg.role === 'system_note';
  if (isNote) return <div className="flex justify-center my-1"><span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{msg.content}</span></div>;

  return (
    <div className={cn("flex gap-2 mb-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-1 shadow-sm"><Bot className="h-3.5 w-3.5 text-white" /></div>}
      <div className={cn("max-w-[85%]", isUser ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" : "bg-card border rounded-2xl rounded-tl-sm shadow-sm", "px-3.5 py-2.5 text-sm")}>
        <div className="tutor-response" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
      </div>
      {isUser && <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1"><User className="h-3.5 w-3.5 text-primary" /></div>}
    </div>
  );
}

// --- Main Panel Component ---

export function AITutorPanel({ problem, code, language }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [solutionConfirm, setSolutionConfirm] = useState(false);
  const [activeModel, setActiveModel] = useState(DEFAULT_MODEL);
  const [showDashboard, setShowDashboard] = useState(false);
  const bottomRef = useRef(null);

  const user = apiClient.getUser();
  const slug = problem?.leetcode_slug || 'unknown';
  const sessionId = user ? `user-${user.id}-${slug}` : `guest-${slug}`;

  useEffect(() => {
    const loadHistory = async () => {
      setHistLoading(true);
      try {
        const hist = await apiClient.getTutorHistory(sessionId);
        if (hist?.length) {
          setMessages(hist.map(m => ({ role: m.role, content: m.content, msg_type: m.msg_type || 'chat' })));
        } else {
          setMessages([{ role: 'assistant', content: `Hey! I'm **Mentor**. How can I help with **${problem?.title}**?`, msg_type: 'chat' }]);
        }
      } catch (err) {
        setMessages([{ role: 'assistant', content: "Failed to load chat history." }]);
      } finally {
        setHistLoading(false);
      }
    };
    loadHistory();
  }, [sessionId, problem?.title]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading, showHints]);

  const sendToTutor = useCallback(async ({ message, msgType = 'chat', hintLvl = 1, displayMsg = null }) => {
    if (loading) return;
    setMessages(prev => [...prev, { role: 'user', content: displayMsg || message, msg_type: msgType }]);
    setLoading(true);
    setShowHints(false);
    setSolutionConfirm(false);

    try {
      const res = await apiClient.tutorChat(sessionId, message, slug, code || '', language || 'python3', msgType, hintLvl, activeModel);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply, msg_type: msgType }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }, [loading, sessionId, slug, code, language, activeModel]);

  const handleSend = () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    sendToTutor({ message: text });
  };

  const handleClear = async () => {
    try { await apiClient.clearTutorHistory(sessionId); } catch (_) {}
    setMessages([{ role: 'assistant', content: `Chat cleared for **${problem?.title}**.` }]);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20 shrink-0">
        <Bot className="h-4 w-4 text-violet-500" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">Mentor AI</p>
          <p className="text-[10px] text-muted-foreground truncate">{problem?.title}</p>
        </div>
        <button onClick={() => setShowDashboard(!showDashboard)} className="px-2 py-0.5 rounded-full border text-[10px] flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
          <Zap className="h-2.5 w-2.5" /> {activeModel.replace('gemini-', 'g-')}
        </button>
        <button onClick={handleClear} className="p-1 hover:bg-muted rounded text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>

      {showDashboard && <AIUsageDashboard currentModel={activeModel} onModelChange={setActiveModel} onClose={() => setShowDashboard(false)} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin">
        {histLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {showHints && !loading && (
          <div className="bg-card border rounded-2xl p-3 my-2 shadow-sm hint-reveal">
            <div className="flex items-center gap-2 mb-3 border-b pb-2">
              <Lightbulb className="h-3.5 w-3.5 text-warning" /><span className="text-xs font-bold">Progressive Hints</span>
              <button onClick={() => setShowHints(false)} className="ml-auto"><X className="h-3 w-3" /></button>
            </div>
            <ProgressiveHintCards sessionId={sessionId} slug={slug} code={code} language={language} activeModel={activeModel} />
          </div>
        )}
        {loading && <div className="flex gap-2 animate-pulse"><Bot className="h-4 w-4" /><div className="h-8 w-24 bg-muted rounded-2xl" /></div>}
        <div ref={bottomRef} />
      </div>

      {/* Actions & Input */}
      <div className="p-3 border-t space-y-3">
        {!loading && (
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => setShowHints(true)} className="flex flex-col items-center gap-1 p-2 border rounded-lg hover:bg-warning/5 hover:text-warning transition-colors"><Lightbulb className="h-4 w-4" /><span className="text-[10px]">Hints</span></button>
            <button onClick={() => sendToTutor({ message: 'Review my code', msgType: 'review' })} className="flex flex-col items-center gap-1 p-2 border rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"><Code2 className="h-4 w-4" /><span className="text-[10px]">Review</span></button>
            <button onClick={() => sendToTutor({ message: 'Explain this problem', msgType: 'explain' })} className="flex flex-col items-center gap-1 p-2 border rounded-lg hover:bg-success/5 hover:text-success transition-colors"><BookOpen className="h-4 w-4" /><span className="text-[10px]">Explain</span></button>
            <button onClick={() => setSolutionConfirm(true)} className="flex flex-col items-center gap-1 p-2 border rounded-lg hover:bg-destructive/5 hover:text-destructive transition-colors"><Eye className="h-4 w-4" /><span className="text-[10px]">Solution</span></button>
          </div>
        )}
        {solutionConfirm && (
           <div className="bg-destructive/10 border border-destructive/20 p-2 rounded-lg flex items-center justify-between">
              <span className="text-[11px] font-bold text-destructive">Reveal solution?</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setSolutionConfirm(false)}>Cancel</Button>
                <Button size="sm" variant="destructive" className="h-6 text-[10px]" onClick={() => sendToTutor({ message: 'Give solution', msgType: 'solution' })}>Confirm</Button>
              </div>
           </div>
        )}
        <div className="flex gap-2">
          <textarea
            className="flex-1 bg-muted/50 border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
            placeholder="Ask a question..."
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          />
          <Button size="icon" className="rounded-xl shrink-0" onClick={handleSend} disabled={loading || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
      <TutorStyles />
    </div>
  );
}

function TutorStyles() {
  return (
    <style>{`
      .tutor-response p { margin-bottom: 0.5rem; }
      .tutor-response ul { padding-left: 1rem; list-style: disc; margin-bottom: 0.5rem; }
      .tutor-code-block { background: #1e1e1e; color: #d4d4d4; padding: 0.75rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.8rem; margin: 0.5rem 0; overflow-x: auto; }
      .tutor-inline-code { background: hsl(var(--muted)); padding: 0.1rem 0.3rem; border-radius: 0.2rem; font-family: monospace; }
      .hint-reveal { animation: fadeIn 0.3s ease-out; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
    `}</style>
  );
}