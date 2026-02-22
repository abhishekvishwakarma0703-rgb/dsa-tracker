import React, { useState, useMemo } from 'react';
import { useProblems } from '@/context/ProblemsContext';
import { ProblemSection } from '@/components/ProblemSection';
import { ProblemDetailModal } from '@/components/ProblemDetailModal';
import { CodeEditor } from '@/components/CodeEditor';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Search, X, CheckCircle2, RotateCcw, BookOpen, TrendingUp,
  Filter, Sun, Moon, AlertCircle, RefreshCw
} from 'lucide-react';

function StatsCard({ icon: Icon, label, value, sub, className }) {
  return (
    <div className={cn('rounded-xl border bg-card p-5', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-1.5 w-32 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProblemsPage() {
  const { problems, filters, setFilters, selectedProblem, setSelectedProblem, loading, error } = useProblems();
  const [searchTerm, setSearchTerm] = useState('');
  const [solveMode, setSolveMode] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  const stats = useMemo(() => {
    let total = 0, done = 0, revision = 0;
    problems.forEach((s) => {
      total += s.problems.length;
      done += s.problems.filter((p) => p.done).length;
      revision += s.problems.filter((p) => p.revision).length;
    });
    return { total, done, revision, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [problems]);

  const hasFilters = searchTerm || filters.difficulty !== 'All' || filters.status !== 'All';

  const filteredProblems = useMemo(() => {
    return problems
      .map((section) => ({
        ...section,
        problems: section.problems.filter((problem) => {
          if (searchTerm && !problem.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
          if (filters.difficulty !== 'All' && problem.difficulty !== filters.difficulty) return false;
          if (filters.status !== 'All') {
            if (filters.status === 'Done' && !problem.done) return false;
            if (filters.status === 'Revision' && !problem.revision) return false;
            if (filters.status === 'Pending' && (problem.done || problem.revision)) return false;
          }
          return true;
        })
      }))
      .filter((s) => s.problems.length > 0);
  }, [problems, searchTerm, filters]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilters({ difficulty: 'All', status: 'All', category: 'All', searchTerm: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar + Main Layout */}
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r bg-card flex flex-col hidden lg:flex">
          {/* Logo */}
          <div className="px-6 py-5 border-b">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-primary/10 p-1.5">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-sm">DSA Tracker</h1>
                <p className="text-[11px] text-muted-foreground">Problem Tracker</p>
              </div>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="px-5 py-5 border-b space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-semibold">{stats.progress}%</span>
              </div>
              <Progress
                value={stats.progress}
                className="h-2"
                indicatorClassName={stats.progress === 100 ? 'bg-success' : 'bg-primary'}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/60 p-2">
                <div className="text-base font-bold">{stats.total}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg bg-success/10 p-2">
                <div className="text-base font-bold text-success">{stats.done}</div>
                <div className="text-[10px] text-muted-foreground">Done</div>
              </div>
              <div className="rounded-lg bg-warning/10 p-2">
                <div className="text-base font-bold text-warning">{stats.revision}</div>
                <div className="text-[10px] text-muted-foreground">Review</div>
              </div>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="px-5 py-4 flex-1 overflow-y-auto">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">Quick Filter</p>
            <div className="space-y-1">
              {[
                { label: 'All Problems', value: 'All', status: 'All', icon: BookOpen },
                { label: 'Completed', value: 'All', status: 'Done', icon: CheckCircle2 },
                { label: 'In Revision', value: 'All', status: 'Revision', icon: RotateCcw },
                { label: 'Pending', value: 'All', status: 'Pending', icon: TrendingUp },
              ].map((item) => (
                <button
                  key={item.status}
                  onClick={() => setFilters({ ...filters, status: item.status })}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    filters.status === item.status
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 mt-6 font-medium">Difficulty</p>
            <div className="space-y-1">
              {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setFilters({ ...filters, difficulty: diff })}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    filters.difficulty === diff
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {diff !== 'All' && (
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      diff === 'Easy' && 'bg-emerald-500',
                      diff === 'Medium' && 'bg-amber-500',
                      diff === 'Hard' && 'bg-red-500',
                    )} />
                  )}
                  {diff === 'All' && <span className="w-2 h-2 rounded-full shrink-0 bg-muted-foreground/50" />}
                  {diff === 'All' ? 'All Difficulties' : diff}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {theme === 'light'
                ? <><Moon className="h-4 w-4" />Dark Mode</>
                : <><Sun className="h-4 w-4" />Light Mode</>
              }
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Topbar */}
          <header className="shrink-0 border-b bg-card px-6 py-3.5 flex items-center gap-4">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 pr-9 h-9"
                placeholder="Search problems..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Mobile difficulty filter */}
            <div className="flex items-center gap-2 lg:hidden">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              >
                {['All', 'Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                {['All', 'Done', 'Revision', 'Pending'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </header>

          {/* Content */}
          <ScrollArea className="flex-1">
            <main className="p-6 max-w-4xl mx-auto">
              {/* Stats row (mobile/no sidebar) */}
              <div className="grid grid-cols-2 gap-3 mb-6 lg:hidden">
                <StatsCard icon={BookOpen} label="Total" value={stats.total} />
                <StatsCard icon={CheckCircle2} label="Completed" value={stats.done} />
                <StatsCard icon={RotateCcw} label="Revision" value={stats.revision} />
                <StatsCard icon={TrendingUp} label="Progress" value={`${stats.progress}%`} />
              </div>

              {/* Filter active badges */}
              {hasFilters && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Filter className="h-3 w-3" /> Filters:
                  </span>
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      "{searchTerm}"
                      <button onClick={() => setSearchTerm('')}><X className="h-2.5 w-2.5" /></button>
                    </Badge>
                  )}
                  {filters.difficulty !== 'All' && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {filters.difficulty}
                      <button onClick={() => setFilters({ ...filters, difficulty: 'All' })}><X className="h-2.5 w-2.5" /></button>
                    </Badge>
                  )}
                  {filters.status !== 'All' && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      {filters.status}
                      <button onClick={() => setFilters({ ...filters, status: 'All' })}><X className="h-2.5 w-2.5" /></button>
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-1">
                    {filteredProblems.reduce((acc, s) => acc + s.problems.length, 0)} results
                  </span>
                </div>
              )}

              {/* Content */}
              {loading ? (
                <LoadingSkeleton />
              ) : error ? (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Failed to load problems</h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                </div>
              ) : filteredProblems.length === 0 ? (
                <div className="rounded-xl border border-dashed p-12 text-center">
                  <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No problems found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search or filters
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProblems.map((section) => (
                    <ProblemSection
                      key={section.id}
                      section={section}
                      onSelectProblem={(problem, sectionId, mode) => {
                        setSelectedProblem({ ...problem, sectionId });
                        if (mode === 'solve') setSolveMode(true);
                      }}
                      isExpanded={
                        !!(searchTerm ||
                        filters.difficulty !== 'All' ||
                        filters.status !== 'All' ||
                        (selectedProblem && selectedProblem.sectionId === section.id))
                      }
                    />
                  ))}
                </div>
              )}
            </main>
          </ScrollArea>
        </div>
      </div>

      {/* Problem Detail Modal */}
      {selectedProblem && !solveMode && (
        <ProblemDetailModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onSolve={() => setSolveMode(true)}
        />
      )}

      {/* Code Editor */}
      {selectedProblem && solveMode && (
        <CodeEditor
          problem={selectedProblem}
          onBack={() => {
            setSolveMode(false);
            setSelectedProblem(null);
          }}
        />
      )}
    </div>
  );
}
