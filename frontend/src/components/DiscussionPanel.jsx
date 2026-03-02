/**
 * DiscussionPanel — real-time Socket.IO chat per problem.
 * Messages visible to all users; notifications per-user.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';
import { Send, MessageCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';

function MessageBubble({ msg, currentUserId }) {
  const isOwn = msg.user_id === currentUserId;
  const time  = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn('flex gap-2 mb-3', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
        isOwn
          ? 'bg-primary text-primary-foreground rounded-tr-sm'
          : 'bg-muted rounded-tl-sm'
      )}>
        {!isOwn && (
          <div className="text-xs font-semibold mb-0.5 text-primary">{msg.username || 'Unknown'}</div>
        )}
        <p className="break-words">{msg.content}</p>
        <div className={cn('text-xs mt-1', isOwn ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground')}>
          {time}
        </div>
      </div>
    </div>
  );
}

export function DiscussionPanel({ problem, currentUser }) {
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [sending,    setSending]    = useState(false);
  const [watching,   setWatching]   = useState(false);
  const socketRef    = useRef(null);
  const scrollRef    = useRef(null);
  const problemId    = problem?.id;

  // Load messages + connect socket
  useEffect(() => {
    if (!problemId) return;

    let mounted = true;

    async function load() {
      try {
        const msgs = await apiClient.getMessages(problemId);
        if (mounted) setMessages(msgs);
      } catch (e) {
        console.error('Failed to load messages', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();

    // Connect socket
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_problem', { problem_id: problemId });
    });

    socket.on('new_message', (msg) => {
      if (mounted) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => {
      mounted = false;
      socket.emit('leave_problem', { problem_id: problemId });
      socket.disconnect();
    };
  }, [problemId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    try {
      const msg = await apiClient.postMessage(problemId, content);
      // Optimistically add own message; socket will also broadcast to others
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Emit via socket for real-time to other users
      socketRef.current?.emit('send_message', { problem_id: problemId, ...msg });
    } catch (e) {
      console.error('Send failed', e);
    } finally {
      setSending(false);
    }
  }, [input, sending, problemId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleWatch = async () => {
    try {
      if (watching) {
        await apiClient.unwatchProblem(problemId);
        setWatching(false);
      } else {
        await apiClient.watchProblem(problemId);
        setWatching(true);
      }
    } catch (e) {
      console.error('Watch toggle failed', e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Discussion</span>
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-xs">{messages.length}</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={toggleWatch} className="gap-1 text-xs">
          {watching
            ? <><EyeOff className="h-3 w-3" /> Unwatch</>
            : <><Eye    className="h-3 w-3" /> Watch</>
          }
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 min-h-0"
      >
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-3/4 rounded-2xl" />)}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No messages yet. Start the discussion!</p>
          </div>
        )}

        {!loading && messages.map((msg, i) => (
          <MessageBubble key={msg.id || i} msg={msg} currentUserId={currentUser?.id} />
        ))}
      </div>

      {/* Input */}
      <div className="border-t p-3 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add to the discussion… (Enter to send)"
          className="min-h-[60px] max-h-[120px] resize-none text-sm"
          rows={2}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="h-10 w-10 shrink-0"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export default DiscussionPanel;
