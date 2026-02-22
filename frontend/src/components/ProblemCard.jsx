import React, { useState, useRef } from 'react';
import { useProblems } from '@/context/ProblemsContext';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor, sanitizeHtml } from '@/components/RichTextEditor';
import { cn } from '@/lib/utils';
import { Check, RotateCcw, Lightbulb, Code2, Tag, X, Plus, Pencil } from 'lucide-react';

const DIFFICULTY_VARIANT = { Easy: 'easy', Medium: 'medium', Hard: 'hard' };

const isHtml = (text) => typeof text === 'string' && /<[a-z][\s\S]*>/i.test(text);

/** Collapsible insight row — one line preview, click to expand, hover to edit/delete */
function InsightRow({ insight, onRemove, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editHtml, setEditHtml] = useState('');

  const html = isHtml(insight.text);
  const plainPreview = html
    ? (new DOMParser().parseFromString(insight.text, 'text/html').body.textContent || '').trim()
    : insight.text;

  const startEdit = (e) => {
    e.stopPropagation();
    setEditHtml(insight.text || '');  // pre-fill with original HTML, not stripped
    setEditing(true);
    setExpanded(true);
  };

  const saveEdit = async (e) => {
    e?.stopPropagation();
    const clean = sanitizeHtml(editHtml);
    const hasContent = clean.replace(/<[^>]*>/g, '').trim().length > 0;
    if (hasContent) await onEdit(clean);
    setEditing(false);
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditing(false);
  };

  // Edit mode — RichTextEditor, same as modal
  if (editing) {
    return (
      <div className="rounded-lg border bg-muted/40 overflow-hidden" onClick={e => e.stopPropagation()}>
        <RichTextEditor
          value={editHtml}
          onChange={setEditHtml}
          placeholder="Edit your insight…"
          minHeight={80}
        />
        <div className="flex justify-end gap-1.5 px-2 py-1.5 border-t bg-muted/20">
          <button
            className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors"
            onClick={cancelEdit}
          >
            Cancel
          </button>
          <button
            className="px-2.5 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            disabled={!sanitizeHtml(editHtml).replace(/<[^>]*>/g, '').trim()}
            onClick={saveEdit}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  // View mode — collapsed (1 line) or expanded (full rendered)
  return (
    <div
      className="group/row bg-muted/40 rounded px-2 py-1.5 text-xs cursor-pointer select-none"
      onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
    >
      <div className="flex items-start gap-1.5">
        {/* Chevron */}
        <span className={cn('shrink-0 mt-px text-muted-foreground transition-transform duration-150', expanded && 'rotate-90')}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 2l4 3-4 3V2z" />
          </svg>
        </span>

        <div className="flex-1 min-w-0">
          {expanded ? (
            html ? (
              <div
                className="insight-html text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(insight.text) }}
              />
            ) : (
              <span className="break-words leading-relaxed whitespace-pre-wrap">{insight.text}</span>
            )
          ) : (
            <span className="block truncate text-muted-foreground">{plainPreview}</span>
          )}
        </div>

        {/* Edit + Delete — visible on hover */}
        <div className="flex gap-1 shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            title="Edit insight"
            className="text-muted-foreground hover:text-primary mt-px"
            onClick={startEdit}
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            title="Remove insight"
            className="text-muted-foreground hover:text-destructive mt-px"
            onClick={e => { e.stopPropagation(); onRemove(e); }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProblemCard({ problem, sectionId, onSelect }) {
  // Support both 'insights' and 'notes' for backend compatibility
  const insights = problem.insights || problem.notes || [];
  const { toggleDone, toggleRevision, addTag, removeTag, updateTag, addInsight, removeInsight, updateInsight } = useProblems();
  const toast = useToast();
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [pending, setPending] = useState(null);
  const [showInsightInput, setShowInsightInput] = useState(false);
  const [insightHtml, setInsightHtml] = useState('');
  const [editingTagId, setEditingTagId] = useState(null);
  const [editTagValue, setEditTagValue] = useState('');
  const editInputRef = useRef();

  const handleToggleDone = async (e) => {
    e.stopPropagation();
    setPending('done');
    await toggleDone(sectionId, problem.id);
    toast(problem.done ? 'Marked as pending' : 'Marked as done! 🎉', 'success');
    setPending(null);
  };

  const handleToggleRevision = async (e) => {
    e.stopPropagation();
    setPending('rev');
    await toggleRevision(sectionId, problem.id);
    toast(problem.revision ? 'Removed from revision' : 'Added to revision list ⚡', 'info');
    setPending(null);
  };

  const handleAddTag = async (e) => {
    e?.stopPropagation();
    if (tagInput.trim()) {
      try {
        await addTag(sectionId, problem.id, tagInput.trim());
        toast('Tag created and attached!', 'success');
      } catch (err) {
        toast('Failed to create or attach tag', 'error');
      }
      setTagInput('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = async (e, tag) => {
    e.stopPropagation();
    await removeTag(sectionId, problem.id, tag);
  };

  const handleEditTag = (e, tag) => {
    e.stopPropagation();
    setEditingTagId(tag.id);
    setEditTagValue(tag.name);
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 0);
  };

  const handleEditTagSave = async (e, tag) => {
    e.preventDefault();
    if (editTagValue.trim() && editTagValue !== tag.name) {
      await updateTag(tag.id, editTagValue.trim());
    }
    setEditingTagId(null);
    setEditTagValue('');
  };

  // Add insight handler
  async function handleAddInsight() {
    const clean = sanitizeHtml(insightHtml);
    const hasContent = clean.replace(/<[^>]*>/g, '').trim().length > 0;
    if (hasContent) {
      await addInsight(sectionId, problem.id, clean);
      setInsightHtml('');
      setShowInsightInput(false);
    }
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card p-4 transition-all duration-200 hover:shadow-md cursor-pointer',
        problem.done && 'border-success/40 bg-success/5',
        problem.revision && !problem.done && 'border-warning/40 bg-warning/5',
        !problem.done && !problem.revision && 'hover:border-primary/40'
      )}
      onClick={() => onSelect?.(problem, sectionId)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              'text-sm font-medium leading-snug',
              problem.done && 'line-through text-muted-foreground'
            )}>
              {problem.title}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant={DIFFICULTY_VARIANT[problem.difficulty] || 'secondary'}>
              {problem.difficulty}
            </Badge>
            {problem.pattern && (
              <Badge variant="outline" className="text-xs font-normal">
                {problem.pattern}
              </Badge>
            )}
            {problem.done && (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" /> Done
              </Badge>
            )}
            {problem.revision && (
              <Badge variant="warning" className="gap-1">
                <RotateCcw className="h-3 w-3" /> Review
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button
            variant="ghost"
            size="icon-sm"
            title="Solve in IDE"
            onClick={(e) => { e.stopPropagation(); onSelect?.(problem, sectionId, 'solve'); }}
          >
            <Code2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Mark as done"
            disabled={pending === 'done'}
            onClick={handleToggleDone}
            className={cn(problem.done && 'text-success hover:text-success')}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Mark for revision"
            disabled={pending === 'rev'}
            onClick={handleToggleRevision}
            className={cn(problem.revision && 'text-warning hover:text-warning')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Insights/Notes */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Lightbulb className="h-3 w-3" />
          {insights.length > 0 ? (
            <>
              {insights.length} insight{insights.length !== 1 ? 's' : ''}
            </>
          ) : (
            'No insights'
          )}
        </span>
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={e => { e.stopPropagation(); setShowInsightInput(v => !v); }}
        >
          <Plus className="h-3 w-3" />
          <span>Add Insight</span>
        </button>
      </div>

      {/* Insights List */}
      {insights.length > 0 && (
        <div className="mt-2 space-y-1">
          {insights.map(insight => (
            <InsightRow
              key={insight.id}
              insight={insight}
              onEdit={async (text) => await updateInsight(sectionId, problem.id, insight.id, text)}
              onRemove={e => { e.stopPropagation(); removeInsight(sectionId, problem.id, insight.id); }}
            />
          ))}
        </div>
      )}


      {/* Add Insight — RichTextEditor (same as modal) */}
      {showInsightInput && (
        <div className="mt-2 rounded-lg border overflow-hidden" onClick={e => e.stopPropagation()}>
          <RichTextEditor
            value={insightHtml}
            onChange={setInsightHtml}
            placeholder="Write your insight — bold, lists, links all supported…"
            minHeight={90}
          />
          <div className="flex justify-end gap-1.5 px-2 py-1.5 border-t bg-muted/20">
            <button
              className="px-2.5 py-1 rounded text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors"
              onClick={e => { e.stopPropagation(); setShowInsightInput(false); setInsightHtml(''); }}
            >
              Cancel
            </button>
            <button
              className="px-2.5 py-1 rounded text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              disabled={!sanitizeHtml(insightHtml).replace(/<[^>]*>/g, '').trim()}
              onClick={e => { e.stopPropagation(); handleAddInsight(); }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Tags */}
      {(Array.isArray(problem.tags) && problem.tags.length > 0 || showTagInput) && (
        <div className="flex flex-wrap gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
          {/* tag list below */}
          {Array.isArray(problem.tags) && problem.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground cursor-pointer"
              onDoubleClick={(e) => handleEditTag(e, tag)}
            >
              {editingTagId === tag.id ? (
                <form onSubmit={(e) => handleEditTagSave(e, tag)} className="flex items-center gap-1">
                  <input
                    ref={editInputRef}
                    className="bg-transparent border-b border-primary outline-none w-16 text-xs px-0.5"
                    value={editTagValue}
                    onChange={e => setEditTagValue(e.target.value)}
                    onBlur={(e) => setEditingTagId(null)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleEditTagSave(e, tag);
                      if (e.key === 'Escape') { setEditingTagId(null); setEditTagValue(''); }
                    }}
                  />
                </form>
              ) : (
                tag.name
              )}
              <button
                className="hover:text-foreground transition-colors"
                onClick={(e) => handleRemoveTag(e, tag.name)}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          {showTagInput && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              <form onSubmit={e => { e.preventDefault(); handleAddTag(e); }} className="flex items-center gap-1">
                <input
                  ref={editInputRef}
                  className="bg-transparent border-b border-primary outline-none w-16 text-xs px-0.5"
                  value={tagInput}
                  placeholder="New tag..."
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddTag(e);
                    if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); }
                  }}
                  autoFocus
                />
                <button className="hover:text-foreground transition-colors" type="button" onClick={() => { setShowTagInput(false); setTagInput(''); }}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </form>
            </span>
          )}
        </div>
      )}

      {/* Add tag button */}
      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        {!showTagInput && (
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              setShowTagInput(true);
              setTagInput('');
              setTimeout(() => editInputRef.current?.focus(), 0);
            }}
          >
            <Plus className="h-3 w-3" />
            <Tag className="h-3 w-3" />
            <span>Tag</span>
          </button>
        )}
      </div>
    </div>
  );
}