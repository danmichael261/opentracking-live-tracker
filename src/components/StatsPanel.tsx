import React from 'react';
import { MapPin, Clock, Zap, Battery, Trophy, Users, Flag, Award, Activity } from 'lucide-react';
import { TrackerStatus } from '../types';

interface StatsPanelProps {
  status: TrackerStatus;
  lastRefresh: Date;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ status, lastRefresh }) => {
  const { runner, checkpointOrder } = status;
  const cpIndex = checkpointOrder.indexOf(runner.lc);
  const progress = checkpointOrder.length > 1
    ? (Math.max(0, cpIndex) / (checkpointOrder.length - 1)) * 100
    : 0;
  const nextCp = cpIndex >= 0 && cpIndex < checkpointOrder.length - 1
    ? checkpointOrder[cpIndex + 1]
    : null;

  // Calculate pace (min/km from speed in km/h)
  const speed = parseFloat(runner.sp) || 0;
  const pace = speed > 0 ? `${(60 / speed).toFixed(1)} min/km` : 'N/A';

  // Battery health indicator
  const getBatteryColor = (b: number) => {
    if (b > 50) return 'text-success';
    if (b > 20) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Runner header */}
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center text-lg font-bold flex-shrink-0">
          {status.bibNumber}
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold text-base-content truncate">{status.runnerName}</div>
          <div className="text-sm text-base-content/60 truncate">
            {status.ageGroup} &bull; {status.genderClass} &bull; {status.eventName}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-1">
        <div className="flex justify-between text-xs text-base-content/60 mb-1">
          <span>{checkpointOrder[0] || 'Start'}</span>
          <span>{checkpointOrder[checkpointOrder.length - 1] || 'Finish'}</span>
        </div>
        <progress className="progress progress-primary w-full" value={progress} max={100} />
        <div className="text-center text-sm font-semibold text-primary mt-1">
          {runner.fin === 1 ? '🎉 FINISHED!' : runner.lc || 'Awaiting start'}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        <StatCard icon={<MapPin size={16} />} label="Last Checkpoint" value={runner.lc || 'N/A'} />
        <StatCard icon={<Flag size={16} />} label="Next Checkpoint" value={nextCp || (runner.fin === 1 ? 'Done!' : 'N/A')} />
        <StatCard icon={<Clock size={16} />} label="Elapsed Time" value={status.elapsedTime} />
        <StatCard icon={<Zap size={16} />} label="Speed" value={speed > 0 ? `${runner.sp} km/h` : 'N/A'} />
        <StatCard
          icon={<Award size={16} />}
          label={`${status.ageGroup} Pos`}
          value={`${status.ageGroupPosition} / ${status.ageGroupTotal}`}
        />
        <StatCard
          icon={<Trophy size={16} />}
          label={`${status.genderClass} Pos`}
          value={`${status.genderPosition} / ${status.genderTotal}`}
        />
        <StatCard
          icon={<Users size={16} />}
          label="Overall Pos"
          value={`${status.overallPosition} / ${status.overallTotal}`}
        />
        <StatCard
          icon={<Battery size={16} className={getBatteryColor(runner.b)} />}
          label="Battery"
          value={`${runner.b}%`}
        />
      </div>

      {/* Pace card */}
      {speed > 0 && (
        <div className="bg-base-200 rounded-lg p-3 flex items-center justify-center gap-2">
          <Activity size={16} className="text-base-content/60" />
          <span className="text-sm text-base-content/60">Pace:</span>
          <span className="text-sm font-semibold">{pace}</span>
        </div>
      )}

      {/* Footer */}
      <div className="text-xs text-base-content/40 text-center mt-2">
        {runner.lt && <span>Last ping: {runner.lt} &bull; </span>}
        Refreshed: {lastRefresh.toLocaleTimeString()}
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="bg-base-200 rounded-lg p-3 flex flex-col gap-1">
    <div className="flex items-center gap-1.5 text-base-content/60 text-xs">
      <span className="opacity-60">{icon}</span>
      {label}
    </div>
    <div className="text-sm font-semibold text-base-content">{value}</div>
  </div>
);
