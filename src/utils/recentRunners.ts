const STORAGE_KEY = 'opentracking_recent_runners';
const MAX_RECENT = 10;

export interface RecentRunner {
  event: string;
  bib: number;
  name: string;
  eventName: string;
  timestamp: number;
}

export function getRecentRunners(): RecentRunner[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveRecentRunner(runner: RecentRunner): void {
  try {
    let recents = getRecentRunners();
    // Remove existing entry for same event+bib
    recents = recents.filter(r => !(r.event === runner.event && r.bib === runner.bib));
    // Add to front
    recents.unshift({ ...runner, timestamp: Date.now() });
    // Trim to max
    recents = recents.slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch {
    // localStorage not available, silently fail
  }
}

export function removeRecentRunner(event: string, bib: number): void {
  try {
    let recents = getRecentRunners();
    recents = recents.filter(r => !(r.event === event && r.bib === bib));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
  } catch {
    // silently fail
  }
}
