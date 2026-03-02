import React, { useState, useEffect, useRef } from 'react';
import { useProblems } from '@/context/ProblemsContext';
import { useToast } from '@/components/ui/toast';
import { SolutionView } from './SolutionView';
import { ProblemDescription } from './ProblemDescription';
import { useLeetcodeData } from '@/hooks/useLeetcodeData';
import { RichTextEditor, sanitizeHtml } from '@/components/RichTextEditor';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { DiscussionPanel } from '@/components/DiscussionPanel';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  Check, RotateCcw, Lightbulb, Code2, Tag, X, Plus, MessageCircle,
  ExternalLink, Trash2, Clock, Info, BookOpen, ChevronDown
} from 'lucide-react';

const DIFFICULTY_VARIANT = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

// --- SUB-COMPONENT: TagEditable ---
function TagEditable({ tag, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tag.name);
  const inputRef = useRef();

  useEffect(() => {
    if (editing) {
      setEditValue(tag.name);
      inputRef.current?.focus();
    }
  }, [editing, tag.name]);

  const handleBlur = () => {
    setEditing(false);
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium cursor-pointer"
      onDoubleClick={() => setEditing(true)}
    >
      <Tag className="h-3 w-3 text-muted-foreground" />
      {editing ? (
        <input
          ref={inputRef}
          className="bg-transparent border-b border-primary outline-none w-20"
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={async e => {
            if (e.key === 'Enter') {
              if (editValue.trim() && editValue !== tag.name) {
                await onUpdate(editValue.trim());
              }
              setEditing(false);
            }
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        tag.name
      )}
      <button className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

// --- SUB-COMPONENT: InsightItem ---
function InsightItem({ insight, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(insight.text || '');

  // Detect if content is HTML (contains tags) or plain text
  const isHtml = /<[a-z][\s\S]*>/i.test(insight.text);

  return (
    <div className="group rounded-lg border bg-muted/40 p-3.5 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2 flex-1">
          <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          {editing ? (
            <div className="flex-1 space-y-2">
              <RichTextEditor
                value={editText}
                onChange={setEditText}
                placeholder="Edit your insight…"
                minHeight={80}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditText(insight.text || ''); }}>Cancel</Button>
                <Button size="sm" onClick={async () => {
                  await onEdit(sanitizeHtml(editText));
                  setEditing(false);
                }}>Save</Button>
              </div>
            </div>
          ) : (
            isHtml ? (
              <div
                className="leading-relaxed rich-text-content max-w-none flex-1 text-sm"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(insight.text) }}
              />
            ) : (
              <p className="leading-relaxed flex-1 whitespace-pre-wrap">{insight.text}</p>
            )
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {!editing && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              onClick={() => { setEditText(insight.text || ''); setEditing(true); }}
              title="Edit insight"
            >
              <BookOpen className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Delete insight"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export function ProblemDetailModal({ problem, onClose, onSolve }) {
  const { 
    problems, // get the global problems list
    toggleDone, toggleRevision, addInsight, 
    removeInsight, addTag, removeTag, updateTag, updateInsight, setSelectedProblem, getProblemById 
  } = useProblems();
  
  const { toast } = useToast();
  const [insightText, setInsightText] = useState('');
  const [insightHtml, setInsightHtml] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [pending, setPending] = useState(null);
  const [activeTab, setActiveTab] = useState('description');

  const { data: lcData, loading: lcLoading } = useLeetcodeData(problem.title);

  // Always sync modal with latest problem data from global state
  useEffect(() => {
    if (!problem?.id) return;
    const latest = getProblemById(problem.id);
    if (latest && (latest !== problem)) {
      setSelectedProblem(latest);
    }
    // eslint-disable-next-line
  }, [problems, problem?.id]);

  const handleToggleDone = async () => {
    setPending('done');
    await toggleDone(problem.sectionId, problem.id);
    toast({ title: problem.done ? 'Marked as pending' : 'Marked as done! 🎉' });
    setPending(null);
  };

  const handleToggleRevision = async () => {
    setPending('rev');
    await toggleRevision(problem.sectionId, problem.id);
    toast({ title: problem.revision ? 'Removed from revision' : 'Added to revision list ⚡' });
    setPending(null);
  };

  const handleAddInsight = async () => {
    const clean = sanitizeHtml(insightHtml);
    const hasContent = clean.replace(/<[^>]*>/g, '').trim().length > 0;
    if (hasContent) {
      await addInsight(problem.sectionId, problem.id, clean);
      setInsightHtml('');
      toast({ title: 'Insight saved!' });
    }
  };

  const handleAddTag = async () => {
    if (tagInput.trim()) {
      await addTag(problem.sectionId, problem.id, tagInput.trim());
      setTagInput('');
    }
  };

  const TABS = [
    { id: 'description', label: 'Description', icon: BookOpen },
    { id: 'status', label: 'Status', icon: Check },
    { id: 'insights', label: `Insights (${problem.insights?.length || 0})`, icon: Lightbulb },
    { id: 'discussion', label: `Discussion${problem.chat_count > 0 ? ` (${problem.chat_count})` : ''}`, icon: MessageCircle },
    { id: 'tags', label: `Tags (${problem.tags?.length || 0})`, icon: Tag },
    { id: 'info', label: 'Info', icon: Info },
  ];

  if (showSolution) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <SolutionView problem={problem} onBack={() => setShowSolution(false)} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle>{problem.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant={DIFFICULTY_VARIANT[lcData?.difficulty || problem.difficulty] || 'secondary'}>
              {lcData?.difficulty || problem.difficulty}
            </Badge>
            {problem.done && <Badge className="bg-green-500">Done</Badge>}
          </div>

          <div className="flex mt-4 border-b">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 py-2 px-3 text-xs font-medium border-b-2 transition-colors',
                  activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-5">
          {activeTab === 'description' && (
            <div className="space-y-4">
              {lcLoading ? <Skeleton className="h-32 w-full" /> : <ProblemDescription html={lcData?.contentHtml} />}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant={problem.done ? 'default' : 'outline'} onClick={handleToggleDone} disabled={pending === 'done'}>
                <Check className="mr-2 h-4 w-4" /> {problem.done ? 'Done' : 'Mark Done'}
              </Button>
              <Button variant={problem.revision ? 'default' : 'outline'} onClick={handleToggleRevision} disabled={pending === 'rev'}>
                <RotateCcw className="mr-2 h-4 w-4" /> {problem.revision ? 'In Revision' : 'Mark Revision'}
              </Button>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-4">
              {/* Rich text editor for new insight */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Insight</p>
                <RichTextEditor
                  value={insightHtml}
                  onChange={setInsightHtml}
                  placeholder="Write your insight — use the toolbar for bold, lists, links…"
                  minHeight={100}
                />
              </div>
              <Button
                onClick={handleAddInsight}
                disabled={!sanitizeHtml(insightHtml).replace(/<[^>]*>/g, '').trim()}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Insight
              </Button>

              {/* Existing insights */}
              {(problem.insights?.length > 0) && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Saved Insights ({problem.insights.length})
                  </p>
                  {problem.insights.map(insight => (
                    <InsightItem
                      key={insight.id}
                      insight={insight}
                      onEdit={async (html) => await updateInsight(problem.sectionId, problem.id, insight.id, html)}
                      onDelete={() => removeInsight(problem.sectionId, problem.id, insight.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Tag name..." value={tagInput} onChange={e => setTagInput(e.target.value)} />
                <Button onClick={handleAddTag}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {problem.tags?.map(tag => (
                  <TagEditable 
                    key={tag.id} 
                    tag={tag} 
                    onUpdate={async (name) => await updateTag(tag.id, name)} 
                    onRemove={() => removeTag(problem.sectionId, problem.id, tag.id)} 
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Pattern:</span> {problem.pattern || 'N/A'}</div>
              <div><span className="text-muted-foreground">Difficulty:</span> {problem.difficulty}</div>
            </div>
          )}
        </ScrollArea>

      {/* Discussion tab */}
      {activeTab === 'discussion' && (
        <div style={{height: '400px', overflow: 'hidden'}}>
          <DiscussionPanel problem={problem} currentUser={user} />
        </div>
      )}
    </DialogContent>
  </Dialog>
  );
}

export default ProblemDetailModal;