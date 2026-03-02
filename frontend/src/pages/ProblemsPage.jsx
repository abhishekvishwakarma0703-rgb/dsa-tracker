import React, { useState, useMemo, useEffect } from 'react';
import { useProblems } from '@/context/ProblemsContext';
import { useAuth } from '@/hooks/useAuth';
import { ProblemSection } from '@/components/ProblemSection';
import { CodeEditor } from '@/components/CodeEditor';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/NotificationBell';
import {
  Search, X, CheckCircle2, RotateCcw, BookOpen, TrendingUp,
  Filter, Sun, Moon, AlertCircle, RefreshCw, LogOut, User as UserIcon, ShieldCheck
} from 'lucide-react';

// --- Sub-components ---

function StatsCard({ icon: Icon, label, value, className, colorClass }) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 shadow-sm', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn('rounded-lg p-2', colorClass || 'bg-muted')}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-medium">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-2 w-24 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Main Component ---

export function ProblemsPage() {
  const { user, logout, isAdmin } = useAuth();
  const { problems, filters, setFilters, selectedProblem, setSelectedProblem, loading, error,toggleDone,toggleRevision,deleteProblem } = useProblems();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [solveMode, setSolveMode] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  // Theme Sync
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
  };

  // Stats Calculation
  const stats = useMemo(() => {
    let total = 0, done = 0, revision = 0;
    problems.forEach((s) => {
      total += s.problems.length;
      done += s.problems.filter((p) => p.done).length;
      revision += s.problems.filter((p) => p.revision).length;
    });
    return { 
      total, 
      done, 
      revision, 
      progress: total > 0 ? Math.round((done / total) * 100) : 0 
    };
  }, [problems]);

  // Filtering Logic
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

  const hasFilters = searchTerm || filters.difficulty !== 'All' || filters.status !== 'All';

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="flex h-screen overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="w-68 shrink-0 border-r bg-card flex flex-col hidden lg:flex">
          {/* Logo Section */}
          <div className="px-6 py-6 border-b flex items-center gap-3">
            <div className="rounded-lg bg-primary p-2">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">DSA Tracker</h1>
              <p className="text-[10px] text-muted-foreground mt-1">Master the Grind</p>
            </div>
          </div>

          {/* User Profile Info */}
          <div className="px-5 py-5 border-b bg-muted/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.username || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
            {isAdmin && (
              <Button variant="outline" size="sm" className="w-full h-8 text-[11px] gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-50" asChild>
                <a href="/admin"><ShieldCheck className="h-3.5 w-3.5" /> Admin Panel</a>
              </Button>
            )}
          </div>

          {/* Sidebar Navigation / Filters */}
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 px-2">Status</p>
                <div className="space-y-1">
                  {[
                    { label: 'All Problems', value: 'All', icon: BookOpen },
                    { label: 'Solved', value: 'Done', icon: CheckCircle2 },
                    { label: 'Revision', value: 'Revision', icon: RotateCcw },
                    { label: 'Pending', value: 'Pending', icon: TrendingUp },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setFilters({ ...filters, status: item.value })}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all',
                        filters.status === item.value 
                          ? 'bg-primary text-primary-foreground shadow-md' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 px-2">Difficulty</p>
                <div className="space-y-1">
                  {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setFilters({ ...filters, difficulty: diff })}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all',
                        filters.difficulty === diff ? 'bg-muted font-medium border' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {diff}
                      {diff !== 'All' && (
                        <span className={cn(
                          'w-2 h-2 rounded-full',
                          diff === 'Easy' ? 'bg-emerald-500' : diff === 'Medium' ? 'bg-amber-500' : 'bg-red-500'
                        )} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t space-y-2">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-muted-foreground h-9" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50 h-9" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/5">
          {/* Header */}
          <header className="h-16 shrink-0 border-b bg-card flex items-center justify-between px-8">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-10 bg-muted/40 border-none focus-visible:ring-1" 
                placeholder="Search problems by name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-4">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] uppercase font-bold text-muted-foreground">Overall Mastery</p>
                 <p className="text-sm font-bold text-primary">{stats.progress}% Completed</p>
               </div>
               <Progress value={stats.progress} className="w-24 h-1.5 hidden sm:block" />
            </div>
          </header>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <main className="p-8 max-w-5xl mx-auto w-full">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                <StatsCard icon={BookOpen} label="Total Problems" value={stats.total} />
                <StatsCard icon={CheckCircle2} label="Solved" value={stats.done} colorClass="bg-emerald-100 text-emerald-600" />
                <StatsCard icon={RotateCcw} label="Needs Revision" value={stats.revision} colorClass="bg-amber-100 text-amber-600" />
                <StatsCard icon={TrendingUp} label="Progress" value={`${stats.progress}%`} colorClass="bg-blue-100 text-blue-600" />
              </div>

              {/* Title & Filter Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Curated DSA Sheet</h2>
                  <p className="text-sm text-muted-foreground">Focus on quality over quantity. Master these patterns.</p>
                </div>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4 mr-1" /> Clear Filters
                  </Button>
                )}
              </div>

              {/* Problem Sections */}
              {loading ? (
                <LoadingSkeleton />
              ) : error ? (
                <div className="text-center py-20 border rounded-xl bg-card">
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">Database Connection Error</h3>
                  <p className="text-muted-foreground mb-6">{error}</p>
                  <Button onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" /> Retry Connection</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProblems.map((section) => (
                    <ProblemSection
                      key={section.id}
                      section={section}
                      onSelectProblem={(problem, sectionId, mode) => {
                        setSelectedProblem({ ...problem, sectionId });
                        if (mode === 'solve') setSolveMode(true);
                      }}
                      onToggleDone={(problemId, sectionId) => {
                        toggleDone(problemId, sectionId);
                      }}
                      onToggleRevision={(problemId, sectionId) => {
                        toggleRevision(problemId, sectionId);
                      }}
                      onDelete={(problemId, sectionId) => {
                        deleteProblem(problemId, sectionId);
                      }}
                      isExpanded={hasFilters}
                    />
                  ))}
                </div>
              )}
            </main>
          </ScrollArea>
        </div>
      </div>

      {/* Modals */}
      {/* {selectedProblem && !solveMode && (
        <ProblemDetailModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onSolve={() => setSolveMode(true)}
        />
      )} */}

      {selectedProblem  && (
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