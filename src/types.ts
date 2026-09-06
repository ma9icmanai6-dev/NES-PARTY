export type MenuLayoutOption =
  | "arcade-frontend"
  | "cartridge-shelf"
  | "channel-surfer"
  | "power-grid"
  | "living-room";

export interface RomVersion {
  name: string;
  region: string;
  revision?: string;
  languages?: string[];
  isDefault?: boolean;
  launchCommand?: string;
}

export interface RomItem {
  id: string;
  title: string;
  rawName: string;
  source: "google-drive" | "builtin" | "upload";
  downloadUrl?: string;
  tags?: string[];
  genre?: string;
  year?: string;
  players?: 1 | 2;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  iconName?: string;
  // ArcadeFrontend master-dataset properties
  system?: "nes" | "snes" | "arcade" | string;
  platform?: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  coop?: boolean;
  posterUrl?: string;
  boxArtUrl?: string;
  boxArtThumbnail?: string;
  boxArtFileName?: string;
  videoId?: string;
  videoUrl?: string;
  videoDirectUrl?: string;
  videoThumbnail?: string;
  videoFileName?: string;
  logoUrl?: string;
  screenshots?: string[];
  versions?: RomVersion[];
  isFavorite?: boolean;
}

export type NesButton =
  | "A"
  | "B"
  | "SELECT"
  | "START"
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "TURBO_A"
  | "TURBO_B";

export interface ControllerInputMessage {
  type: "controller-input";
  slot: 1 | 2;
  button: NesButton;
  state: boolean; // true = down, false = up
  timestamp: number;
}

export interface PlayerStatus {
  connected: boolean;
  name?: string;
  lastActive: number;
  pingMs?: number;
  activeButtons: Set<NesButton>;
}

export interface CrtShaderConfig {
  scanlines: boolean;
  scanlineIntensity: number; // 0.1 to 1.0
  curvature: boolean;
  bloom: boolean;
  staticNoise: boolean;
  noiseIntensity: number;
  vignette: boolean;
  colorBleed: boolean;
  bezelStyle: "dark-monitor" | "silver-trinitron" | "arcade-cab" | "frameless";
}

export type AppMode = "tv" | "controller" | "split-test";
