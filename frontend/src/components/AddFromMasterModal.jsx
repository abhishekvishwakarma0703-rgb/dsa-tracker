import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Loader2, Plus, ChevronDown } from 'lucide-react';
import apiClient from '@/services/apiClient';

const DIFF_COLOR = { Easy: 'text-emerald-600 bg-emerald-50', Medium: 'text-amber-600 bg-amber-50', Hard: 'text-red-600 bg-red-50' };

export function AddFromMasterModal({ open, onClose, sections, onAdded, sectionId,category }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [targetSection, setTargetSection] = useState(sectionId || ''); // ✏️ CHANGED: init from sectionId
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    // ✏️ CHANGED: if sectionId passed, lock to it; else default to first section
    if (sectionId) { setTargetSection(sectionId); return; }
    if (sections?.length && !targetSection) {
      setTargetSection(sections[0]?.id || '');
    }
  }, [sections, targetSection, sectionId]);

  const search = useCallback(async (q) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.searchLeetCodeMaster(q, 1, 30);
      setResults(data.items || []);
    } catch (e) {
      setError('Could not fetch master list. Make sure backend is running and master list is ingested.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) search('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleQueryChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => search(q), 300);
  };

  // ✏️ CHANGED: use sectionId if provided, else fall back to targetSection from dropdown
  const handleAdd = async () => {
    if (!selected) return;
    const section = sectionId || targetSection;
    if (!section) return;
    setAdding(true);
    setError('');
    try {
      const result = await apiClient.addFromMaster(selected,category);
      onAdded?.(result);
      onClose();
    } catch (e) {
      setError(e.message || 'Failed to add problem');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Add Problem from LeetCode
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search from {results.length > 0 ? 'the' : 'a'} master list of LeetCode problems and add to your tracker.
          </p>
        </DialogHeader>

        {/* Search input */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by problem name or ID..."
              value={query}
              onChange={handleQueryChange}
              className="pl-9"
              autoFocus
            />
            {loading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {/* Results list */}
        <ScrollArea className="flex-1">
          {error && (
            <div className="mx-4 my-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">{error}</div>
          )}
          {!loading && results.length === 0 && !error && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
          <div className="p-2 space-y-1">
            {results.map(item => (
              <button
                key={item.title_slug}
                onClick={() => setSelected(selected?.title_slug === item.title_slug ? null : item)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-start gap-3',
                  selected?.title_slug === item.title_slug
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:border-border hover:bg-muted/40'
                )}
              >
                <span className="text-xs font-mono text-muted-foreground mt-0.5 w-8 shrink-0">#{item.question_id}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', DIFF_COLOR[item.difficulty] || 'bg-muted')}>{item.difficulty}</span>
                    {item.is_paid_only && <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">Premium</span>}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(item.topic_tags || []).slice(0, 4).map(t => (
                      <span key={t.slug || t.name} className="text-[9px] px-1.5 py-0.5 bg-secondary rounded text-muted-foreground">
                        {t.name || t}
                      </span>
                    ))}
                  </div>
                </div>
                {selected?.title_slug === item.title_slug && (
                  <div className="shrink-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* ✏️ CHANGED: fixed bottom bar — all in one wrapper div, section dropdown conditional */}
        <div className="px-4 py-3 border-t bg-muted/20 flex items-center gap-3">
          {!sectionId && (
            // ✏️ CHANGED: only show section selector when NOT opened from a section
            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground block mb-1">Add to section</label>
              <div className="relative">
                <select
                  value={targetSection}
                  onChange={e => setTargetSection(e.target.value)}
                  className="w-full h-8 text-xs px-2 pr-6 rounded-md border bg-background appearance-none cursor-pointer"
                >
                  {(sections || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.id}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2 h-3 w-3 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          )}

          {selected && (
            // ✏️ CHANGED: flex-1 so it fills space when section dropdown is hidden
            <div className="text-xs text-muted-foreground truncate flex-1">
              Adding: <span className="font-medium text-foreground">{selected.title}</span>
            </div>
          )}

          <Button
            onClick={handleAdd}
            disabled={!selected || adding}
            className="shrink-0 gap-1.5"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Problem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}