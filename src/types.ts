export interface Character {
  id: string;
  emoji: string;
  name: string;
  description: string;
  accentColor: string;
}

export type GameScreen = 'START' | 'PLAYING' | 'GAMEOVER';

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  life: number; // 0 to 1
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  decay: number;
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Obstacle extends GameObject {
  type: 'cactus' | 'rock' | 'brick' | 'spikes';
  emoji: string;
}

export interface GameWord extends GameObject {
  text: string;
  type: 'positive' | 'strong_positive' | 'negative' | 'strong_negative';
  points: number;
  collected: boolean;
  color: string;
}

export interface WordCollectionLog {
  text: string;
  type: 'positive' | 'strong_positive' | 'negative' | 'strong_negative';
  timestamp: number;
  points: number;
}
