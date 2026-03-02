/**
 * AIUsageDashboard
 * ================
 * Shows today's AI request counts per model with progress bars.
 * Rendered inside AITutorPanel as a collapsible overlay.
 *
 * Props:
 *   onClose: () => void
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, X, Zap, Lock, RefreshCw, ExternalLink, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const BADGE_STYLES = {
  FREE: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  PAID: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
};

const PROVIDER_COLORS = {
  gemini:    'bg-blue-500',
  anthropic: 'bg-violet-500',
};

function ProgressBar({ pct, warn }) {
  const pctClamped = Math.min(pct ?? 0, 100);
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          pctClamped > 90 ? 'bg-destructive' :
          pctClamped > 70 ? 'bg-warning' : 'bg-emerald-500'
        )}
        style={{ width: `${pctClamped}%` }}
      />
    </div>
  );
}

function ModelRow({ m, isActive, onSelect }) {
  const pct    = m.pct_used ?? 0;
  const isOver = m.daily_limit && m.count >= m.daily_limit;
  const isPaid = m.badge === 'PAID';

  return (
    <div
      onClick={() => !isOver && onSelect(m.model)}
      className={cn(
        'rounded-xl border p-3 transition-all cursor-pointer select-none',
        isActive  ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground/40',
        isOver    && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* top row */}
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('w-2 h-2 rounded-full shrink-0', PROVIDER_COLORS[m.provider] ?? 'bg-muted-foreground')} />
        <span className="text-xs font-semibold flex-1 truncate">{m.label}</span>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', BADGE_STYLES[m.badge])}>
          {m.badge}
        </span>
        {isActive && <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />}
        {isOver   && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
      </div>

      {/* usage bar (free models only) */}
      {!isPaid && m.daily_limit && (
        <>
          <ProgressBar pct={pct} />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {m.count} / {m.daily_limit.toLocaleString()} today
            </span>
            <span className={cn('text-[10px] font-medium', pct > 90 ? 'text-destructive' : 'text-muted-foreground')}>
              {pct}%
            </span>
          </div>
        </>
      )}

      {/* paid notice */}
      {isPaid && (
        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
          <Lock className="h-2.5 w-2.5" />
          Requires ANTHROPIC_API_KEY in .env
          {m.count > 0 && <span className="ml-auto">{m.count} calls today</span>}
        </p>
      )}

      {isOver && (
        <p className="text-[10px] text-destructive mt-1 font-medium">Daily limit reached — resets at midnight</p>
      )}
    </div>
  );
}

export function AIUsageDashboard({ currentModel, onModelChange, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch(`${API}/tutor/usage`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(`Backend error: ${e}`); setLoading(false); });
  };

  useEffect(load, []);

  const handleSelect = (modelId) => {
    onModelChange(modelId);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background/97 backdrop-blur-sm rounded-inherit overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <Zap className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-semibold">AI Usage & Model</p>
          <p className="text-[10px] text-muted-foreground">{data?.date ?? 'Today'} · Click a model to switch</p>
        </div>
        <button
          onClick={load}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
            <Loader2 className="h-4 w-4 animate-spin" />Loading usage data…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
            <br />Make sure the backend is running.
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Total today */}
            <div className="rounded-xl border bg-muted/40 px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total AI calls today</span>
              <span className="text-sm font-bold tabular-nums">{data.total_today}</span>
            </div>

            {/* Per-model rows */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pt-1">
              Select active model
            </p>
            {data.by_model.map(m => (
              <ModelRow
                key={m.model}
                m={m}
                isActive={m.model === currentModel}
                onSelect={handleSelect}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t shrink-0">
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-primary hover:underline flex items-center gap-1"
        >
          <ExternalLink className="h-2.5 w-2.5" />
          Get free Gemini API key at aistudio.google.com
        </a>
      </div>
    </div>
  );
}
