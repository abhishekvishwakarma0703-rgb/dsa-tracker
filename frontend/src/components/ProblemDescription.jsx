/**
 * ProblemDescription
 * Renders LeetCode's HTML problem content with proper styling.
 * Sanitizes dangerous tags while preserving structure.
 */
import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Light HTML sanitizer - strips script/style/iframe, keeps structure
 */
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

export function ProblemDescription({ html, className }) {
  const clean = useMemo(() => (html ? sanitizeHtml(html) : ''), [html]);

  if (!clean) return null;

  return (
    <div
      className={cn('leetcode-content text-sm text-foreground leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
