export interface RunnerData {
  n: string;      // name
  r: number;      // bib number
  c: number;
  lc: string;     // last checkpoint
  ll: string;     // lat,lon
  sp: string;     // speed km/h
  lt: string;     // last tracker time
  dt: string;     // data timestamp
  fin: number;    // finished flag (1 = finished)
  b: number;      // battery %
  a: number;      // altitude
  g: string;      // age group display
  co: string;
  e: number;
  t: string;      // elapsed race time HH:MM:SS
  ag: string;     // age group category
}

export interface ClassData {
  id: number;
  classname: string;  // e.g. "Male", "Female"
  teams: RunnerData[];
}

export interface TeamsResponse {
  type: string;
  success: boolean;
  data: ClassData[];
}

export interface Checkpoint {
  id: number;
  n: string;      // name
  c: string;      // color
  la: number;     // latitude
  lo: number;     // longitude
}

export interface CheckpointsResponse {
  type: string;
  success: boolean;
  data: Checkpoint[];
}

export interface ConfigResponse {
  name?: string;
  start?: string;
  [key: string]: any;
}

export interface TrackerStatus {
  runner: RunnerData;
  runnerName: string;
  bibNumber: number;
  eventName: string;
  lat: number;
  lon: number;
  checkpoints: Checkpoint[];
  checkpointOrder: string[];
  genderPosition: number;
  genderTotal: number;
  overallPosition: number;
  overallTotal: number;
  ageGroupPosition: number;
  ageGroupTotal: number;
  ageGroup: string;
  genderClass: string;
  elapsedTime: string;
  allClasses: ClassData[];
}

export interface Cheer {
  id: number;
  sender_name: string;
  message: string;
  created_at: string;
}
