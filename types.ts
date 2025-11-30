
export enum TowerType {
  BASIC = 'BASIC',
  SNIPER = 'SNIPER',
  RAPID = 'RAPID',
  ICE = 'ICE'
}

export enum EnemyType {
  GOBLIN = 'GOBLIN', // Fast, low HP
  ORC = 'ORC',       // Medium stats
  TANK = 'TANK',     // Slow, high HP
  BOSS = 'BOSS'      // Very slow, massive HP
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  id: string;
}

export interface Enemy extends Entity {
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number; // Current target waypoint index
  frozen: number; // Frames remaining frozen/slowed
  reward: number;
  progress: number; // Distance traveled (for sorting targeting)
}

export interface TowerUpgradeState {
  damage: number;
  range: number;
  cooldown: number;
}

export interface Tower extends Entity {
  type: TowerType;
  range: number;
  damage: number;
  cooldown: number;
  cooldownMax: number;
  cost: number; // Initial cost
  color: string;
  name: string;
  upgrades: TowerUpgradeState;
}

export interface Projectile extends Entity {
  targetId: string;
  damage: number;
  speed: number;
  color: string;
  freeze?: boolean;
}

export interface GameState {
  money: number;
  lives: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  gameTick: number;
}

export interface WaveConfig {
  count: number;
  interval: number;
  enemyType: EnemyType;
  hpMultiplier: number;
}
