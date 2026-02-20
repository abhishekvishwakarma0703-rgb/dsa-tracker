import React, { useState, useEffect } from 'react';
import { useProblems } from '@/context/ProblemsContext';
import { ProblemCard } from './ProblemCard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2, RotateCcw, BookOpen, Plus } from 'lucide-react';
import { AddFromMasterModal } from './AddFromMasterModal';

export function ProblemSection({ section, onSelectProblem, isExpanded: externalExpanded }) {
  const { getSectionStats, refetchProblems } = useProblems(); // ✏️ CHANGED: added refetchProblems
  const [showAddModal, setShowAddModal] = useState(false);
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
      {/* ✏️ CHANGED: header row is now a flex container so Add button sits inline */}
      <div className="flex items-center">
        {/* Section Header button — takes all space except Add button */}
        <button
          className="flex-1 text-left p-5 flex items-center gap-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
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

        {/* ✏️ CHANGED: Add button outside the toggle button — no more ml-auto positioning issue */}
        <button
          onClick={e => { e.stopPropagation(); setShowAddModal(true); }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 mr-3 rounded hover:bg-muted shrink-0"
          title="Add problem to this section"
        >
          <Plus className="h-3.5 w-3.5" />
          Add 
        </button>
      </div>

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
                  onSelect={(p, sid, mode) => onSelectProblem?.(p, sid, mode)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ✏️ CHANGED: sectionId passed so modal skips dropdown and adds directly to this section */}
      {showAddModal && (
        <AddFromMasterModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          sections={null}
          sectionId={section.id}
          onAdded={() => { refetchProblems?.(); setShowAddModal(false); }}
        />
      )}
    </div>
  );
}