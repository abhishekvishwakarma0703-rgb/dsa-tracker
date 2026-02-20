import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { ArrowLeft, Copy, Check, Clock, Zap, BookOpen, Target, Scale } from 'lucide-react';

export function SolutionView({ problem, onBack }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (problem.solution?.code) {
      await navigator.clipboard.writeText(problem.solution.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!problem.solution) {
    return (
      <div className="p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-lg mb-2">Solution Not Available</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Solution details are coming soon for this problem.
        </p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to Problem
        </Button>
      </div>
    );
  }

  const solution = problem.solution;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="font-semibold text-base">{problem.title}</h2>
          <p className="text-xs text-muted-foreground">Solution Guide</p>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 max-w-2xl">
          {/* Problem Description */}
          {problem.description && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
                <BookOpen className="h-4 w-4 text-primary" />
                Problem Description
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed rounded-lg bg-muted/40 p-4 border">
                {problem.description}
              </p>
            </section>
          )}

          {/* Approach */}
          {solution.approach && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
                <Target className="h-4 w-4 text-primary" />
                Approach
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed rounded-lg bg-muted/40 p-4 border">
                {solution.approach}
              </p>
            </section>
          )}

          {/* Key Points */}
          {solution.keyPoints?.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
                <Zap className="h-4 w-4 text-warning" />
                Key Points
              </h3>
              <ul className="space-y-2">
                {solution.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="shrink-0 rounded-full bg-primary/10 text-primary w-5 h-5 flex items-center justify-center text-xs font-medium mt-0.5">
                      {idx + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Code Solution */}
          {solution.code && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <span className="text-primary">{`</>`}</span>
                  Code Solution
                </h3>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <pre className="rounded-xl border bg-zinc-950 dark:bg-zinc-900 p-4 text-sm font-mono text-zinc-100 overflow-auto scrollbar-thin">
                <code>{solution.code}</code>
              </pre>
            </section>
          )}

          {/* Complexity */}
          {solution.complexity && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
                <Clock className="h-4 w-4 text-primary" />
                Complexity Analysis
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Time</div>
                  <code className="text-sm font-mono font-semibold text-primary">{solution.complexity.time}</code>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Space</div>
                  <code className="text-sm font-mono font-semibold text-primary">{solution.complexity.space}</code>
                </div>
              </div>
              {solution.complexity.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{solution.complexity.description}</p>
              )}
            </section>
          )}

          {/* Trade-offs */}
          {solution.tradeoffs?.length > 0 && (
            <section>
              <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
                <Scale className="h-4 w-4 text-primary" />
                Trade-offs
              </h3>
              <ul className="space-y-2">
                {solution.tradeoffs.map((tradeoff, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/40 mt-0.5">•</span>
                    {tradeoff}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
