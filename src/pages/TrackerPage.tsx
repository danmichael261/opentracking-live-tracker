import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ArrowLeft, Share2, AlertCircle, Bell } from 'lucide-react';
import { TrackerStatus, RunnerData } from '../types';
import { fetchTeams, fetchCheckpoints, fetchConfig } from '../utils/api';
import { computePositions } from '../utils/positions';
import { RaceMap } from '../components/RaceMap';
import { StatsPanel } from '../components/StatsPanel';
import { NotifyModal } from '../components/NotifyModal';

const REFRESH_INTERVAL = 30000; // 30 seconds

export const TrackerPage: React.FC = () => {
  const { event, bib } = useParams<{ event: string; bib: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<TrackerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [copied, setCopied] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  const bibNumber = parseInt(bib || '0', 10);

  const refresh = useCallback(async (showSpinner = false) => {
    if (!event || !bibNumber) return;
    if (showSpinner) setRefreshing(true);

    try {
      const [teamsData, cpData, configData] = await Promise.all([
        fetchTeams(event),
        fetchCheckpoints(event),
        fetchConfig(event),
      ]);

      // Find runner by bib number
      let runner: RunnerData | null = null;
      let genderClass = '';
      for (const cls of teamsData.data) {
        for (const t of cls.teams) {
          if (t.r === bibNumber) {
            runner = t;
            genderClass = cls.classname;
            break;
          }
        }
        if (runner) break;
      }

      if (!runner) {
        setError(`Runner with bib #${bibNumber} not found in event "${event}". Check the bib number and try again.`);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Parse coordinates
      const [latStr, lonStr] = (runner.ll || '0,0').split(',');
      const lat = parseFloat(latStr);
      const lon = parseFloat(lonStr);

      // Build checkpoint order from checkpoint data
      const checkpointOrder = cpData.data.map((cp) => cp.n);

      // Compute positions with fixed algorithm
      const positions = computePositions(runner, teamsData.data, checkpointOrder, genderClass);

      setStatus({
        runner,
        runnerName: runner.n,
        bibNumber,
        eventName: configData.name || event,
        lat,
        lon,
        checkpoints: cpData.data,
        checkpointOrder,
        genderPosition: positions.genderPos,
        genderTotal: positions.genderTotal,
        overallPosition: positions.overallPos,
        overallTotal: positions.overallTotal,
        ageGroupPosition: positions.ageGroupPos,
        ageGroupTotal: positions.ageGroupTotal,
        ageGroup: runner.ag || runner.g || 'N/A',
        genderClass,
        elapsedTime: runner.t || 'N/A',
      });

      setError(null);
      setLastRefresh(new Date());
    } catch (err: any) {
      if (!status) {
        setError(err.message || 'Failed to fetch race data. Check the event code and try again.');
      }
      // If we already have data, silently fail and keep showing it
    }

    setLoading(false);
    setRefreshing(false);
  }, [event, bibNumber]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => refresh(), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-100">
        <div className="flex flex-col items-center gap-3">
          <span className="loading loading-spinner loading-lg text-primary" />
          <span className="text-base-content/60">Loading runner data...</span>
        </div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="flex items-center justify-center h-screen bg-base-100">
        <div className="flex flex-col items-center gap-4 max-w-md p-4">
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            <ArrowLeft size={18} /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="flex flex-col h-screen bg-base-100">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-base-200 border-b border-base-300 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button className="btn btn-ghost btn-sm btn-square flex-shrink-0" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
          </button>
          <span className="text-lg flex-shrink-0">{'🏃'}</span>
          <span className="font-semibold text-base-content truncate">{status.runnerName}</span>
          <span className="badge badge-primary badge-sm flex-shrink-0">#{status.bibNumber}</span>
          {status.runner.fin === 1 && (
            <span className="badge badge-success badge-sm flex-shrink-0">{'🏁'} FINISHED</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="tooltip tooltip-bottom" data-tip={copied ? 'Copied!' : 'Copy link'}>
            <button className="btn btn-ghost btn-sm btn-square" onClick={handleShare}>
              <Share2 size={16} />
            </button>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => refresh(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Content: responsive layout */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Map */}
        <div className="h-[55vh] md:h-auto md:flex-1 relative">
          <RaceMap status={status} event={event || ''} />
          <div className="absolute bottom-2 left-2 badge badge-neutral badge-sm opacity-80">
            Auto-refresh: 30s
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="flex-1 md:flex-none md:w-80 overflow-y-auto border-t md:border-t-0 md:border-l border-base-300 bg-base-100">
          <StatsPanel status={status} lastRefresh={lastRefresh} />

          {/* Live Updates button */}
          <div className="px-4 pb-4">
            <button
              className="btn btn-primary btn-block gap-2"
              onClick={() => setNotifyOpen(true)}
            >
              <Bell size={18} />
              Live Updates
            </button>
          </div>
        </div>
      </div>

      {/* Notification subscription modal */}
      <NotifyModal
        isOpen={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        eventCode={event || ''}
        bibNumber={bibNumber}
        runnerName={status.runnerName}
      />
    </div>
  );
};
