export interface User {
  id: string;
  username: string;
  avatarUrl: string;
  bio?: string;
  followers: number;
  following: number;
  badges?: string[]; // Array of badge names/icons
}

export interface Post {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  filterUsed?: string;
  user: User;
}

export enum FilterType {
  NONE = 'none',
  VX1000 = 'vx1000',
  VHS = 'vhs',
  DVX100 = 'dvx100',
  HD_MODERN = 'modern'
}

export interface SpeedRamp {
  isEnabled: boolean;
  startTime: number; // Seconds
  endTime: number;   // Seconds
  speed: number;     // Multiplier (0.1 to 2.0)
}

export interface FilterConfig {
  type: FilterType;
  grainIntensity: number;   // 0 to 1
  vignetteIntensity: number; // 0 to 1
  saturationBoost: number;  // -1 to 1
  contrastBoost: number;    // -1 to 1
  whiteBalance: number;     // -1 (Cool) to 1 (Warm)
  addTimestamp: boolean;
  speedRamp: SpeedRamp;
}

export interface FFmpegResponse {
  ffmpeg_command: string;
  notes: string;
}

export interface GeminiResponse {
  ffmpeg_command: string;
  notes: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  endDate: string;
  isActive: boolean;
  prize: string;
  winner?: User;
}

export interface ChallengeEntry {
  id: string;
  challengeId: string;
  user: User;
  videoUrl: string;
  votes: number;
  hasVoted?: boolean; // Local state to track if current user voted
}