import React, { useState } from 'react';
import { Bell, Mail, Smartphone, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { isPushSupported, getPushPermission, subscribeToPush } from '../utils/notifications';

interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventCode: string;
  bibNumber: number;
  runnerName: string;
}

type SubscribeState = 'idle' | 'subscribing' | 'success' | 'error';

export const NotifyModal: React.FC<NotifyModalProps> = ({
  isOpen,
  onClose,
  eventCode,
  bibNumber,
  runnerName,
}) => {
  const [email, setEmail] = useState('');
  const [enablePush, setEnablePush] = useState(false);
  const [state, setState] = useState<SubscribeState>('idle');
  const [message, setMessage] = useState('');

  const pushSupported = isPushSupported();
  const pushPermission = getPushPermission();
  const pushDenied = pushPermission === 'denied';

  const canSubmit = email.trim() || enablePush;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setState('subscribing');
    setMessage('');

    try {
      let pushSubscription: PushSubscription | null = null;

      // Get push subscription if enabled
      if (enablePush) {
        pushSubscription = await subscribeToPush();
        if (!pushSubscription && !email.trim()) {
          setState('error');
          setMessage('Push notification permission was denied. Please enter an email address instead.');
          return;
        }
      }

      // Call subscribe API — toJSON() returns keys in correct base64url encoding
      const subJson = pushSubscription ? pushSubscription.toJSON() : null;
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_code: eventCode,
          bib_number: bibNumber,
          email: email.trim() || undefined,
          pushSubscription: subJson
            ? {
                endpoint: subJson.endpoint,
                keys: subJson.keys,
              }
            : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setState('success');
      setMessage(data.message || 'Subscribed! You\'ll receive notifications at each checkpoint.');
    } catch (err: any) {
      setState('error');
      setMessage(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleClose = () => {
    setState('idle');
    setMessage('');
    setEmail('');
    setEnablePush(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
      <div
        className="card bg-base-100 shadow-2xl w-full max-w-sm animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-primary" />
              <h3 className="card-title text-lg">Get Notifications</h3>
            </div>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleClose}>
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-base-content/60">
            Get notified when <strong>{runnerName}</strong> (#{bibNumber}) reaches each checkpoint.
          </p>

          {state === 'success' ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="bg-success/20 text-success rounded-full p-3">
                <Check size={28} />
              </div>
              <p className="text-center text-sm">{message}</p>
              <button className="btn btn-primary btn-sm mt-2" onClick={handleClose}>
                Done
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* Email */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text flex items-center gap-1.5 text-sm font-medium">
                    <Mail size={14} /> Email (optional)
                  </span>
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="input input-bordered input-sm w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={state === 'subscribing'}
                />
              </div>

              {/* Push toggle */}
              {pushSupported && (
                <div className="form-control">
                  <label className="label cursor-pointer py-1">
                    <span className="label-text flex items-center gap-1.5 text-sm font-medium">
                      <Smartphone size={14} /> Browser notifications
                      {pushDenied && (
                        <span className="badge badge-error badge-xs">blocked</span>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="toggle toggle-primary toggle-sm"
                      checked={enablePush}
                      onChange={(e) => setEnablePush(e.target.checked)}
                      disabled={pushDenied || state === 'subscribing'}
                    />
                  </label>
                  {pushDenied && (
                    <p className="text-xs text-error ml-6">
                      Notifications are blocked. Enable them in your browser settings.
                    </p>
                  )}
                </div>
              )}

              {/* Validation hint */}
              {!canSubmit && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <AlertCircle size={12} />
                  Enter an email or enable browser notifications.
                </p>
              )}

              {/* Error message */}
              {state === 'error' && message && (
                <div className="alert alert-error py-2 text-sm">
                  <AlertCircle size={16} />
                  <span>{message}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                className="btn btn-primary btn-sm w-full mt-1"
                disabled={!canSubmit || state === 'subscribing'}
              >
                {state === 'subscribing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Bell size={16} />
                    Subscribe to Updates
                  </>
                )}
              </button>

              <p className="text-xs text-base-content/40 text-center">
                Notifications sent at each checkpoint. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
