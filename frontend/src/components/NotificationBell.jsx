/**
 * NotificationBell — shows unread count, click to see notifications.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import apiClient from '@/services/apiClient';
import { Bell, BellDot, Check, MessageCircle } from 'lucide-react';

export function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);
  const [loading,       setLoading]       = useState(false);

  const unread = notifications.filter(n => !n.is_read).length;

  const load = useCallback(async () => {
    try {
      const data = await apiClient.getNotifications();
      setNotifications(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(iv);
  }, [load]);

  const markAllRead = async () => {
    await apiClient.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const time = (ts) => {
    const d = new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000)  return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => { setOpen(v => !v); if (!open) load(); }}
      >
        {unread > 0 ? <BellDot className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-background shadow-lg">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            {unread > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">No notifications</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b last:border-0 transition-colors',
                    !n.is_read ? 'bg-primary/5' : ''
                  )}
                >
                  <MessageCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{time(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
