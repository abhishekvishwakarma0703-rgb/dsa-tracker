/**
 * Whiteboard — per-problem drawing canvas
 * Uses FallbackWhiteboard (custom canvas) as primary — no CDN dependency.
 * Auto-saves to backend (debounced).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Download, RotateCcw, CheckCircle2, Loader2, ChevronRight } from 'lucide-react';
import apiClient from '@/services/apiClient';

const SAVE_DEBOUNCE_MS = 2000;

export function Whiteboard({ problem }) {
  return <CanvasWhiteboard problem={problem} />;
}

/**
 * Full-featured canvas whiteboard.
 * Tools: pen, eraser, line, arrow, rect, circle, text
 * Color picker, line width, undo (30 steps), export PNG
 * Auto-saves canvas as base64 to backend
 */
function CanvasWhiteboard({ problem }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#1e293b');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [snapshotData, setSnapshotData] = useState(null);
  const [history, setHistory] = useState([]);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved
  const saveTimer = useRef(null);
  const [loaded, setLoaded] = useState(false);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src = e.touches?.[0] || e;
    return {
      x: (src.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (src.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  // Load saved state from backend
  useEffect(() => {
    if (!problem?.id) return;
    apiClient.getWhiteboard(problem.id).then(data => {
      if (data?.canvas_data?.dataUrl) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx) ctx.drawImage(img, 0, 0);
          setLoaded(true);
        };
        img.src = data.canvas_data.dataUrl;
      } else {
        setLoaded(true);
      }
    }).catch(() => setLoaded(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id]);

  // Init canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth || 800;
    canvas.height = parent.clientHeight || 500;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const triggerSave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!problem?.id || !canvasRef.current) return;
      setSaveStatus('saving');
      try {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        await apiClient.saveWhiteboard(problem.id, { dataUrl });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (_) {
        setSaveStatus('idle');
      }
    }, SAVE_DEBOUNCE_MS);
  }, [problem?.id]);

  const saveSnapshot = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return null;
    return ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    const snap = saveSnapshot();
    setHistory(h => [...h.slice(-29), snap]);
    setSnapshotData(snap);
    setStartPos(pos);

    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    setDrawing(true);
  };

  const onPointerMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 5 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'pen' || tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (snapshotData && startPos) {
      ctx.putImageData(snapshotData, 0, 0);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      if (tool === 'rect') {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === 'circle') {
        const rx = Math.abs(pos.x - startPos.x) / 2;
        const ry = Math.abs(pos.y - startPos.y) / 2;
        ctx.ellipse(startPos.x + (pos.x - startPos.x) / 2, startPos.y + (pos.y - startPos.y) / 2, rx, ry, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      } else if (tool === 'arrow') {
        const angle = Math.atan2(pos.y - startPos.y, pos.x - startPos.x);
        const headLen = Math.max(10, lineWidth * 4);
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle - Math.PI / 6), pos.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(pos.x - headLen * Math.cos(angle + Math.PI / 6), pos.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const onPointerUp = (e) => {
    if (!drawing) return;
    if (tool === 'text') {
      const pos = getPos(e);
      const text = prompt('Enter text:');
      if (text) {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = color;
          ctx.font = `${lineWidth * 7}px sans-serif`;
          ctx.fillText(text, pos.x, pos.y);
        }
      }
    }
    setDrawing(false);
    setSnapshotData(null);
    triggerSave();
  };

  const undo = () => {
    if (!history.length) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(history[history.length - 1], 0, 0);
    setHistory(h => h.slice(0, -1));
    triggerSave();
  };

  const clearCanvas = () => {
    if (!confirm('Clear whiteboard?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    setHistory(h => [...h.slice(-29), saveSnapshot()]);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    triggerSave();
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${problem?.title || 'whiteboard'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const TOOLS = [
    { id: 'pen', label: '✏️', title: 'Pen (draw freely)' },
    { id: 'eraser', label: '⬜', title: 'Eraser' },
    { id: 'line', label: '╱', title: 'Straight line' },
    { id: 'arrow', label: '→', title: 'Arrow' },
    { id: 'rect', label: '▭', title: 'Rectangle' },
    { id: 'circle', label: '◯', title: 'Ellipse/Circle' },
    { id: 'text', label: 'T', title: 'Text label' },
  ];

  const COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'];

  return (
    <div className="flex flex-col h-full select-none">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-2 px-3 py-2 border-b bg-muted/10 shrink-0">
        {/* Tools */}
        <div className="flex items-center gap-0.5 rounded-lg border p-0.5 bg-background">
          {TOOLS.map(t => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => setTool(t.id)}
              className={cn(
                'w-7 h-7 rounded text-sm font-mono transition-colors',
                tool === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'
              )}
            >{t.label}</button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button
              key={c}
              title={c}
              onClick={() => setColor(c)}
              style={{ background: c, border: c === '#ffffff' ? '1px solid #e2e8f0' : 'none' }}
              className={cn(
                'w-4 h-4 rounded-full transition-transform hover:scale-110',
                color === c ? 'ring-2 ring-offset-1 ring-primary scale-125' : ''
              )}
            />
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            title="Custom color" className="w-4 h-4 rounded-full cursor-pointer border-0 p-0" />
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Line width */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">Stroke:</span>
          <input type="range" min="1" max="30" value={lineWidth} onChange={e => setLineWidth(+e.target.value)}
            className="w-20 h-2 accent-primary cursor-pointer" />
          <span className="text-[10px] w-4 text-muted-foreground">{lineWidth}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {saveStatus === 'saving' && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin"/>Saving…</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Saved</span>}
          <Button size="sm" variant="ghost" onClick={undo} className="h-7 text-xs" disabled={!history.length}>Undo</Button>
          <Button size="sm" variant="ghost" onClick={clearCanvas} className="h-7 text-xs text-destructive hover:text-destructive">Clear</Button>
          <Button size="sm" variant="outline" onClick={exportPNG} className="h-7 text-xs gap-1">
            <Download className="h-3 w-3"/>Export
          </Button>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-hidden relative" style={{ background: '#fff' }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block touch-none"
          style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : 'crosshair', width: '100%', height: '100%' }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={() => drawing && onPointerUp({ clientX: 0, clientY: 0 })}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        />
      </div>
    </div>
  );
}
