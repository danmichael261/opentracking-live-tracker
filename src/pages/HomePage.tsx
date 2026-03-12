import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, MapPin, Radio, X, Clock } from 'lucide-react';
import { getRecentRunners, removeRecentRunner, RecentRunner } from '../utils/recentRunners';

export const HomePage: React.FC = () => {
  const [event, setEvent] = useState('');
  const [bib, setBib] = useState('');
  const [recents, setRecents] = useState<RecentRunner[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setRecents(getRecentRunners());
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (event.trim() && bib.trim()) {
      navigate(`/${event.trim().toLowerCase()}/${bib.trim()}`);
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, runner: RecentRunner) => {
    e.stopPropagation();
    removeRecentRunner(runner.event, runner.bib);
    setRecents(getRecentRunners());
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏃</div>
            <h1 className="text-3xl font-bold text-base-content">
              OpenTracking Live
            </h1>
            <p className="text-base-content/60 mt-2">
              Track any runner in real-time during OpenTracking events
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleTrack} className="card bg-base-100 shadow-xl">
            <div className="card-body gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <Radio size={16} /> Event Code
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., morland26"
                  className="input input-bordered w-full"
                  value={event}
                  onChange={(e) => setEvent(e.target.value)}
                  required
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/50">
                    The event slug from the OpenTracking URL
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold flex items-center gap-2">
                    <MapPin size={16} /> Bib Number
                  </span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 5"
                  className="input input-bordered w-full"
                  value={bib}
                  onChange={(e) => setBib(e.target.value)}
                  required
                  min="1"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2">
                <Search size={18} />
                Track Runner
                <ArrowRight size={18} />
              </button>
            </div>
          </form>

          {/* Recent Runners */}
          {recents.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold text-base-content/60 mb-3 flex items-center gap-2">
                <Clock size={14} /> RECENT RUNNERS
              </h2>
              <div className="flex flex-col gap-2">
                {recents.map((r) => (
                  <button
                    key={`${r.event}-${r.bib}`}
                    className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer text-left"
                    onClick={() => navigate(`/${r.event}/${r.bib}`)}
                  >
                    <div className="card-body p-3 flex-row items-center gap-3">
                      <span className="text-2xl">🏃</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-base-content truncate">
                          {r.name}
                        </div>
                        <div className="text-xs text-base-content/50">
                          {r.eventName} · Bib #{r.bib}
                        </div>
                      </div>
                      <div
                        className="btn btn-ghost btn-xs btn-square"
                        onClick={(e) => handleRemoveRecent(e, r)}
                        title="Remove"
                      >
                        <X size={14} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* How it works */}
          <div className="mt-8 text-center">
            <h2 className="text-sm font-semibold text-base-content/60 mb-3">HOW IT WORKS</h2>
            <div className="grid grid-cols-3 gap-4 text-xs text-base-content/50">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">🌐</span>
                <span>Find your event on OpenTracking</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">🏷</span>
                <span>Enter the event code & bib number</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">📍</span>
                <span>Track them live on the map</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-base-content/40">
            <p>
              Powered by{' '}
              <a
                href="https://opentracking.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary"
              >
                OpenTracking
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
