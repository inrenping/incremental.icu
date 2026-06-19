export interface AppConfig {
  id: number;
  user_id: number;
  guid?: string | null;
  account: string;
  encrypted_password?: string;
  source_type: string;
  region: string;
  is_active: boolean;
  access_token?: string | null;
  access_token_expires_at?: string | null;
  refresh_token?: string | null;
  refresh_token_expires_at?: string | null;
  oauth_token?: string | null;
  oauth_token_secret?: string | null;
  secret_string?: string | null;
  total_count?: number;
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

export interface Activity {
  id: number;
  activity_id: string;
  activity_name: string;
  start_time_local: string;
  sport_type_raw: string;
  moving_duration_seconds: number;
  duration_seconds: number;
  distance_meters: number;
  elevation_gain: number;
  source_type: string;
  created_at: string;
}

export interface DetailedActivity {
  [key: string]: unknown;
}

export function formatDuration(seconds: number) {
  if (seconds === null || seconds === undefined) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')];
  if (h > 0) parts.unshift(h.toString().padStart(2, '0'));
  return parts.join(':');
}

export function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}
