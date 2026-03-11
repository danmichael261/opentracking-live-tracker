import { TeamsResponse, CheckpointsResponse, ConfigResponse } from '../types';

const API_BASE = '/api/proxy';

export async function fetchTeams(event: string): Promise<TeamsResponse> {
  const res = await fetch(`${API_BASE}?event=${encodeURIComponent(event)}&file=teams.json`);
  if (!res.ok) throw new Error(`Failed to fetch teams data (${res.status})`);
  return res.json();
}

export async function fetchCheckpoints(event: string): Promise<CheckpointsResponse> {
  const res = await fetch(`${API_BASE}?event=${encodeURIComponent(event)}&file=checkpoints.json`);
  if (!res.ok) throw new Error(`Failed to fetch checkpoints (${res.status})`);
  return res.json();
}

export async function fetchConfig(event: string): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}?event=${encodeURIComponent(event)}&file=config.json`);
  if (!res.ok) throw new Error(`Failed to fetch event config (${res.status})`);
  return res.json();
}
