import React, { useState, useEffect } from 'react';
import { useProblems } from '@/context/ProblemsContext';
import { ProblemCard } from './ProblemCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2, RotateCcw, BookOpen } from 'lucide-react';

export function ProblemSection({ section, onSelectProblem, isExpanded: externalExpanded }) {
  const { getSectionStats } = useProblems();
  const [isExpanded, setIsExpanded] = useState(
    typeof externalExpanded === 'boolean' ? externalExpanded : false
  );

  useEffect(() => {
    if (typeof externalExpanded === 'boolean') {
      setIsExpanded(externalExpanded);
    }
  }, [externalExpanded]);

  const stats = getSectionStats(section.id);
  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className={cn(
      'rounded-xl border bg-card transition-all duration-200',
      isExpanded && 'shadow-sm'
    )}>
      {/* Section Header */}
      <button
        className="w-full text-left p-5 flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        {/* Expand icon */}
        <div className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
          {isExpanded
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />
          }
        </div>

        {/* Title & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-sm leading-tight">{section.name || section.id}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{stats.done}/{stats.total}</span>
              {progress === 100 && (
                <Badge variant="success" className="text-[10px] py-0 px-1.5">Complete!</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <Progress
              value={progress}
              className="h-1.5 flex-1 max-w-48"
              indicatorClassName={cn(
                progress === 100 && 'bg-success',
                progress > 50 && progress < 100 && 'bg-primary',
                progress <= 50 && 'bg-primary/70'
              )}
            />
          </div>
        </div>

        {/* Stats badges */}
        <div className="flex items-center gap-2 shrink-0">
          {stats.done > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="h-3 w-3" />
              {stats.done}
            </span>
          )}
          {stats.revision > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-xs text-warning">
              <RotateCcw className="h-3 w-3" />
              {stats.revision}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            {stats.total}
          </span>
        </div>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t">
          {section.problems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No problems in this section yet.
            </div>
          ) : (
            <div className="grid gap-2 pt-4">
              {section.problems.map((problem) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  sectionId={section.id}
                  onSelect={onSelectProblem}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
