/**
 * RichTextEditor.jsx
 * 
 * A lightweight WYSIWYG rich text editor built with contentEditable.
 * No external packages required — uses the browser's built-in execCommand API
 * (still functional in all major browsers as of 2025).
 * 
 * Features: Bold, Italic, Underline, Headings (H2/H3), Bullet list,
 *           Ordered list, Blockquote, Link insertion, Clear formatting.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3,
  Quote, Link2, Minus, Eraser, Type
} from 'lucide-react';

// ─── Simple HTML sanitizer ────────────────────────────────────────────────────
// Strips dangerous attributes/tags before storing or rendering.
const ALLOWED_TAGS = new Set([
  'b', 'strong', 'i', 'em', 'u', 'strike', 's',
  'h2', 'h3', 'p', 'br', 'ul', 'ol', 'li',
  'blockquote', 'a', 'hr', 'span', 'div'
]);
const ALLOWED_ATTRS = { a: ['href', 'target', 'rel'] };

export function sanitizeHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    const tag = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      // Replace element with its children
      const parent = node.parentNode;
      while (node.firstChild) parent.insertBefore(node.firstChild, node);
      parent.removeChild(node);
      return;
    }

    // Strip all attributes except those whitelisted
    const allowed = ALLOWED_ATTRS[tag] || [];
    for (const attr of [...node.attributes]) {
      if (!allowed.includes(attr.name)) node.removeAttribute(attr.name);
    }
    // Make links safe
    if (tag === 'a') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
      const href = node.getAttribute('href') || '';
      if (href.startsWith('javascript:')) node.removeAttribute('href');
    }

    // Recurse on children (copy array because we may mutate)
    [...node.childNodes].forEach(clean);
  }

  [...doc.body.childNodes].forEach(clean);
  return doc.body.innerHTML;
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function ToolBtn({ icon: Icon, title, onMouseDown, active }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className={cn(
        'p-1.5 rounded transition-colors hover:bg-muted',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Link Dialog ─────────────────────────────────────────────────────────────
function LinkDialog({ onConfirm, onCancel }) {
  const [url, setUrl] = useState('https://');
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md border">
      <input
        autoFocus
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="flex-1 bg-transparent text-sm outline-none min-w-0"
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onConfirm(url); }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        type="button"
        className="text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground"
        onClick={() => onConfirm(url)}
      >OK</button>
      <button
        type="button"
        className="text-xs px-2 py-0.5 rounded border"
        onClick={onCancel}
      >✕</button>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────
/**
 * @param {string}   value      - HTML string (controlled)
 * @param {function} onChange   - called with new HTML string on every edit
 * @param {string}   placeholder
 * @param {string}   className
 * @param {number}   minHeight  - min-height in px for the editable area
 */
export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Write your insight...',
  className,
  minHeight = 120,
}) {
  const editorRef = useRef(null);
  const isComposing = useRef(false);
  const [showLink, setShowLink] = useState(false);
  const [savedRange, setSavedRange] = useState(null);
  const [activeFormats, setActiveFormats] = useState({});

  // Sync external value into DOM only on mount / external reset
  const lastValueRef = useRef(null);
  useEffect(() => {
    if (!editorRef.current) return;
    if (value !== lastValueRef.current) {
      // Only update DOM if value differs from what we last emitted
      // (prevents cursor jump on every keystroke)
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
      lastValueRef.current = value;
    }
  }, [value]);

  // ── helpers ──
  const exec = useCallback((cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    notifyChange();
  }, []);

  const notifyChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange?.(html);
    updateActiveFormats();
  }, [onChange]);

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    });
  };

  const preventAndExec = (cmd, val) => e => {
    e.preventDefault();
    exec(cmd, val);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) setSavedRange(sel.getRangeAt(0).cloneRange());
  };

  const restoreSelection = () => {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  };

  const handleLinkInsert = (url) => {
    restoreSelection();
    if (url && url !== 'https://') exec('createLink', url);
    setShowLink(false);
  };

  // ── toolbar groups ──
  const groups = [
    [
      { icon: Bold,    title: 'Bold (Ctrl+B)',      cmd: 'bold',    fmt: 'bold' },
      { icon: Italic,  title: 'Italic (Ctrl+I)',    cmd: 'italic',  fmt: 'italic' },
      { icon: Underline, title: 'Underline (Ctrl+U)', cmd: 'underline', fmt: 'underline' },
    ],
    [
      { icon: Heading2, title: 'Heading 2', cmd: 'formatBlock', val: 'H2' },
      { icon: Heading3, title: 'Heading 3', cmd: 'formatBlock', val: 'H3' },
      { icon: Type,     title: 'Paragraph', cmd: 'formatBlock', val: 'P' },
    ],
    [
      { icon: List,         title: 'Bullet list',   cmd: 'insertUnorderedList', fmt: 'insertUnorderedList' },
      { icon: ListOrdered,  title: 'Numbered list', cmd: 'insertOrderedList',   fmt: 'insertOrderedList' },
      { icon: Quote,        title: 'Blockquote',    cmd: 'formatBlock', val: 'BLOCKQUOTE' },
    ],
    [
      { icon: Minus,  title: 'Horizontal rule', cmd: 'insertHorizontalRule' },
      { icon: Eraser, title: 'Clear formatting',  cmd: 'removeFormat' },
    ],
  ];

  return (
    <div className={cn('rounded-lg border bg-background overflow-hidden', className)}>
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        {groups.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 && <span className="w-px h-4 bg-border mx-1" />}
            {group.map(({ icon, title, cmd, val, fmt }) => (
              <ToolBtn
                key={title}
                icon={icon}
                title={title}
                active={fmt ? activeFormats[fmt] : false}
                onMouseDown={e => {
                  e.preventDefault();
                  exec(cmd, val ?? null);
                }}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Link button — special: needs to save selection first */}
        <span className="w-px h-4 bg-border mx-1" />
        <ToolBtn
          icon={Link2}
          title="Insert link"
          onMouseDown={e => {
            e.preventDefault();
            saveSelection();
            setShowLink(s => !s);
          }}
        />
      </div>

      {/* ── Link input row ── */}
      {showLink && (
        <div className="px-2 py-1.5 border-b bg-muted/20">
          <LinkDialog
            onConfirm={handleLinkInsert}
            onCancel={() => setShowLink(false)}
          />
        </div>
      )}

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          'px-3 py-2.5 text-sm outline-none overflow-auto rich-text-content',
          // Placeholder via CSS
          'empty:before:content-[attr(data-placeholder)]',
          'empty:before:text-muted-foreground empty:before:pointer-events-none',
        )}
        style={{ minHeight }}
        onInput={notifyChange}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={() => { isComposing.current = false; notifyChange(); }}
        onKeyDown={e => {
          // Allow Ctrl+B/I/U browser shortcuts to work and then notify
          if ((e.ctrlKey || e.metaKey) && ['b','i','u'].includes(e.key.toLowerCase())) {
            setTimeout(notifyChange, 0);
          }
        }}
      />
    </div>
  );
}

export default RichTextEditor;
