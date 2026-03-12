import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Cheer } from '../types';

interface CheerWallProps {
  eventCode: string;
  bibNumber: number;
}

export const CheerWall: React.FC<CheerWallProps> = ({ eventCode, bibNumber }) => {
  const [cheers, setCheers] = useState<Cheer[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchCheers = useCallback(async (bustCache = false) => {
    try {
      // Add cache-busting param after a new cheer is submitted
      const cacheBust = bustCache ? `&_t=${Date.now()}` : '';
      const res = await fetch(
        `/api/cheers?event=${encodeURIComponent(eventCode)}&bib=${bibNumber}${cacheBust}`,
        bustCache ? { cache: 'no-store' } : undefined
      );
      if (res.ok) {
        const data = await res.json();
        setCheers(data.cheers || []);
      }
    } catch {
      // Silently fail on fetch error
    }
    setLoading(false);
  }, [eventCode, bibNumber]);

  useEffect(() => {
    fetchCheers();
    // Refresh cheers every 60 seconds
    const interval = setInterval(() => fetchCheers(), 60000);
    return () => clearInterval(interval);
  }, [fetchCheers]);

  // Load saved name from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cheer_name');
      if (saved) setName(saved);
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setSending(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/cheer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_code: eventCode,
          bib_number: bibNumber,
          sender_name: name.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send cheer');
      } else {
        setSuccess(true);
        const sentMessage = message.trim();
        const sentName = name.trim();
        setMessage('');

        // Save name for next time
        try { localStorage.setItem('cheer_name', sentName); } catch {}

        // Optimistically add the new cheer to the list immediately
        const optimisticCheer: Cheer = {
          id: Date.now(), // temp id
          sender_name: sentName,
          message: sentMessage,
          created_at: new Date().toISOString(),
        };
        setCheers(prev => [optimisticCheer, ...prev]);

        // Also fetch fresh data (cache-busted) to sync with server
        setTimeout(() => fetchCheers(true), 1000);

        // Scroll to top of cheers list to show the new cheer
        setTimeout(() => {
          listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);

        // Keep success message visible for 5 seconds
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch {
      setError('Failed to send cheer. Please try again.');
    }

    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="px-4 pb-4">
      <div className="divider text-xs text-base-content/40 mt-0">
        <MessageCircle size={14} className="inline" /> CHEER WALL
      </div>

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <input
          type="text"
          placeholder="Your name"
          className="input input-bordered input-sm w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          required
        />
        <div className="relative">
          <textarea
            placeholder="Send a cheer! 🎉"
            className="textarea textarea-bordered w-full text-sm leading-tight"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            maxLength={200}
            required
          />
          <span className="absolute bottom-2 right-2 text-xs text-base-content/30">
            {message.length}/200
          </span>
        </div>

        {error && (
          <div className="alert alert-error py-2 text-sm">⚠️ {error}</div>
        )}
        {success && (
          <div className="alert alert-success py-2 text-sm">🎉 Cheer sent!</div>
        )}

        <button
          type="submit"
          className="btn btn-secondary btn-sm btn-block gap-2"
          disabled={sending || !name.trim() || !message.trim()}
        >
          <Send size={14} />
          {sending ? 'Sending...' : 'Send Cheer'}
        </button>
      </form>

      {/* Cheers list */}
      {loading ? (
        <div className="text-center py-4">
          <span className="loading loading-dots loading-sm text-base-content/40" />
        </div>
      ) : cheers.length === 0 ? (
        <div className="text-center text-base-content/40 text-sm py-4">
          No cheers yet — be the first! 🎉
        </div>
      ) : (
        <div ref={listRef} className="space-y-2 max-h-60 overflow-y-auto">
          {cheers.map((cheer) => (
            <div key={cheer.id} className="bg-base-200 rounded-lg p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-base-content">
                  {cheer.sender_name}
                </span>
                <span className="text-xs text-base-content/40">
                  {formatTime(cheer.created_at)}
                </span>
              </div>
              <p className="text-sm text-base-content/80 mt-0.5">{cheer.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
