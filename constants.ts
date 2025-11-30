
import { TowerType, EnemyType, WaveConfig, Tower } from './types';

// Grid Configuration
export const GRID_W = 20;
export const GRID_H = 12;
export const CELL_SIZE = 40; // Pixels per cell
export const CANVAS_WIDTH = GRID_W * CELL_SIZE;
export const CANVAS_HEIGHT = GRID_H * CELL_SIZE;

// Map Path (Waypoints in grid coordinates)
export const PATH_WAYPOINTS = [
  { x: 0, y: 1 },
  { x: 4, y: 1 },
  { x: 4, y: 8 },
  { x: 10, y: 8 },
  { x: 10, y: 2 },
  { x: 16, y: 2 },
  { x: 16, y: 9 },
  { x: 19, y: 9 }
];

// Upgrade Configuration
export const UPGRADE_CONFIG = {
  DAMAGE_MULTIPLIER: 1.25, // +25% damage per level
  RANGE_MULTIPLIER: 1.15,  // +15% range per level
  COOLDOWN_MULTIPLIER: 0.9, // -10% cooldown time per level
  BASE_COST_MULTIPLIER: 0.6 // Upgrade cost is 60% of base cost * (level + 1)
};

// Tower Definitions
export const TOWER_STATS: Record<TowerType, Omit<Tower, 'id' | 'x' | 'y' | 'cooldown' | 'upgrades'>> = {
  [TowerType.BASIC]: {
    type: TowerType.BASIC,
    name: '弓箭塔',
    range: 3.5,
    damage: 15,
    cooldownMax: 30, 
    cost: 50,
    color: '#a16207' // Wood Brown
  },
  [TowerType.SNIPER]: {
    type: TowerType.SNIPER,
    name: '巨弩塔',
    range: 7,
    damage: 80,
    cooldownMax: 120,
    cost: 150,
    color: '#451a03' // Dark Wood
  },
  [TowerType.RAPID]: {
    type: TowerType.RAPID,
    name: '法师塔',
    range: 2.5,
    damage: 5,
    cooldownMax: 8,
    cost: 200,
    color: '#7e22ce' // Purple Magic
  },
  [TowerType.ICE]: {
    type: TowerType.ICE,
    name: '冰霜方尖碑',
    range: 3,
    damage: 2,
    cooldownMax: 45,
    cost: 100,
    color: '#0ea5e9' // Ice Blue
  }
};

// Enemy Definitions
export const ENEMY_STATS: Record<EnemyType, { hp: number; speed: number; reward: number; color: string }> = {
  [EnemyType.GOBLIN]: { hp: 30, speed: 0.05, reward: 5, color: '#4ade80' }, // Light Green
  [EnemyType.ORC]: { hp: 80, speed: 0.03, reward: 12, color: '#166534' }, // Dark Green
  [EnemyType.TANK]: { hp: 200, speed: 0.015, reward: 25, color: '#57534e' }, // Stone Grey
  [EnemyType.BOSS]: { hp: 1000, speed: 0.01, reward: 100, color: '#9f1239' } // Dragon Red
};

// Initial State
export const INITIAL_MONEY = 120; // Starts with Gold
export const INITIAL_LIVES = 20;

// Wave Generator Helper
export const getWaveConfig = (wave: number): WaveConfig[] => {
  const configs: WaveConfig[] = [];
  
  if (wave === 1) {
    configs.push({ count: 5, interval: 60, enemyType: EnemyType.GOBLIN, hpMultiplier: 1 });
  } else if (wave % 5 === 0) {
     // Boss wave
     configs.push({ count: 1, interval: 100, enemyType: EnemyType.BOSS, hpMultiplier: 1 + (wave * 0.5) });
     configs.push({ count: 10, interval: 30, enemyType: EnemyType.GOBLIN, hpMultiplier: 1 + (wave * 0.2) });
  } else {
    // Mixed waves
    const difficulty = wave * 10;
    const orcCount = Math.floor(difficulty / 15);
    const goblinCount = Math.floor((difficulty % 15) / 3);
    
    if (orcCount > 0) configs.push({ count: orcCount, interval: 50, enemyType: EnemyType.ORC, hpMultiplier: 1 + (wave * 0.1) });
    if (goblinCount > 0) configs.push({ count: goblinCount + 5, interval: 40, enemyType: EnemyType.GOBLIN, hpMultiplier: 1 + (wave * 0.1) });
    if (wave > 3) configs.push({ count: Math.floor(wave / 2), interval: 100, enemyType: EnemyType.TANK, hpMultiplier: 1 + (wave * 0.15) });
  }
  
  return configs;
};
