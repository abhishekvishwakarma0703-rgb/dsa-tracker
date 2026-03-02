import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, RotateCcw, ChevronRight, Tag, Lightbulb, Trash2, MessageCircle
} from 'lucide-react';

const DIFF = {
  Easy:   'text-green-600 bg-green-50  dark:bg-green-950/30  border-green-200',
  Medium: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200',
  Hard:   'text-red-600 bg-red-50    dark:bg-red-950/30    border-red-200',
};

export function ProblemCard({
  problem, sectionId,
  onToggleDone, onToggleRevision, onSelect, onDelete,
}) {
  const chatCount = problem.chat_count || 0;
  const hasUnread = problem.has_unread  || false;

  return (
    <div className={cn(
      'group flex items-center gap-3 rounded-xl border bg-card px-4 py-3',
      'hover:shadow-sm transition-all cursor-pointer',
      problem.done && 'opacity-70',
    )}>
      {/* Done toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleDone(sectionId, problem.id); }}
        className={cn(
          'shrink-0 rounded-full p-0.5 transition-colors',
          problem.done ? 'text-green-500 hover:text-green-600' : 'text-muted-foreground hover:text-green-500'
        )}
      >
        <CheckCircle2 className="h-5 w-5" />
      </button>

      {/* Title + badges */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(problem)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium', problem.done && 'line-through text-muted-foreground')}>
            {problem.title}
          </span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded border font-medium', DIFF[problem.difficulty] || 'text-muted-foreground')}>
            {problem.difficulty}
          </span>
          {problem.revision && (
            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-400">📌 Revision</Badge>
          )}
          {problem.tags?.slice(0, 2).map(t => (
            <Badge key={t.id} variant="secondary" className="text-xs gap-0.5">
              <Tag className="h-2.5 w-2.5" />{t.name}
            </Badge>
          ))}
        </div>
        {problem.insights?.length > 0 && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Lightbulb className="h-3 w-3" />{problem.insights.length} note{problem.insights.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Right-side actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Chat badge */}
        {chatCount > 0 && (
          <div className="relative flex items-center gap-1 text-xs text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
            <MessageCircle className="h-3.5 w-3.5" />
            {chatCount}
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
            )}
          </div>
        )}

        {/* Revision */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleRevision(sectionId, problem.id); }}
          className={cn(
            'rounded-lg p-1.5 transition-colors opacity-0 group-hover:opacity-100',
            problem.revision ? 'text-yellow-500 opacity-100' : 'text-muted-foreground hover:text-yellow-500'
          )}
          title="Mark for revision"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(sectionId, problem.id); }}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-colors"
          title="Remove from workspace"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Open */}
        <button
          onClick={() => onSelect(problem)}
          className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default ProblemCard;
