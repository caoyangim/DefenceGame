
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameMap from './components/GameMap';
import Controls from './components/Controls';
import { 
  GameState, Tower, Enemy, Projectile, TowerType, Position, 
  EnemyType 
} from './types';
import { 
  CANVAS_HEIGHT, CANVAS_WIDTH, CELL_SIZE, GRID_H, GRID_W, 
  INITIAL_LIVES, INITIAL_MONEY, PATH_WAYPOINTS, TOWER_STATS, ENEMY_STATS,
  getWaveConfig, UPGRADE_CONFIG
} from './constants';
import { getTacticalAdvice } from './services/geminiService';

const App: React.FC = () => {
  // Game State
  const [gameState, setGameState] = useState<GameState>({
    money: INITIAL_MONEY,
    lives: INITIAL_LIVES,
    wave: 0,
    isPlaying: false,
    isGameOver: false,
    gameTick: 0
  });

  const [towers, setTowers] = useState<Tower[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  
  // Selection State
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  
  // AI State
  const [advice, setAdvice] = useState<string>("欢迎指挥官。请部署防御设施。");
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  // Refs for Game Loop (Mutable state to avoid stale closures in loop)
  const stateRef = useRef(gameState);
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const waveQueueRef = useRef<{ type: EnemyType; delay: number; hpMult: number }[]>([]);
  const frameRef = useRef<number>(0);

  // Sync refs when state changes from UI interactions
  useEffect(() => { stateRef.current = gameState; }, [gameState]);
  useEffect(() => { towersRef.current = towers; }, [towers]);

  // --- Game Loop Helpers ---

  const spawnEnemy = (type: EnemyType, hpMult: number) => {
    const start = PATH_WAYPOINTS[0];
    const stats = ENEMY_STATS[type];
    const newEnemy: Enemy = {
      id: Math.random().toString(36).substr(2, 9),
      x: start.x,
      y: start.y,
      type,
      hp: stats.hp * hpMult,
      maxHp: stats.hp * hpMult,
      speed: stats.speed,
      pathIndex: 0,
      frozen: 0,
      reward: stats.reward,
      progress: 0
    };
    enemiesRef.current.push(newEnemy);
  };

  const moveEnemies = () => {
    const escapedIds: string[] = [];
    
    enemiesRef.current.forEach(enemy => {
      // Calculate movement
      const targetIndex = enemy.pathIndex + 1;
      if (targetIndex >= PATH_WAYPOINTS.length) {
        escapedIds.push(enemy.id);
        return;
      }

      const target = PATH_WAYPOINTS[targetIndex];
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      
      const currentSpeed = enemy.frozen > 0 ? enemy.speed * 0.5 : enemy.speed;
      if (enemy.frozen > 0) enemy.frozen--;

      if (distance < currentSpeed) {
        // Reached waypoint
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.pathIndex++;
      } else {
        // Move towards waypoint
        enemy.x += (dx / distance) * currentSpeed;
        enemy.y += (dy / distance) * currentSpeed;
      }
      
      enemy.progress += currentSpeed;
    });

    // Handle escapes
    if (escapedIds.length > 0) {
      enemiesRef.current = enemiesRef.current.filter(e => !escapedIds.includes(e.id));
      setGameState(prev => ({ ...prev, lives: Math.max(0, prev.lives - escapedIds.length) }));
      if (stateRef.current.lives - escapedIds.length <= 0) {
        setGameState(prev => ({ ...prev, isGameOver: true, isPlaying: false }));
      }
    }
  };

  const handleTowers = () => {
    towersRef.current.forEach(tower => {
      if (tower.cooldown > 0) {
        tower.cooldown--;
        return;
      }

      // Find target: Closest to end of path within range
      let target: Enemy | null = null;
      let maxProgress = -1;

      enemiesRef.current.forEach(enemy => {
        const dist = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
        if (dist <= tower.range) {
          if (enemy.progress > maxProgress) {
            maxProgress = enemy.progress;
            target = enemy;
          }
        }
      });

      if (target) {
        // Fire!
        tower.cooldown = tower.cooldownMax;
        projectilesRef.current.push({
          id: Math.random().toString(),
          x: tower.x,
          y: tower.y,
          targetId: (target as Enemy).id,
          damage: tower.damage,
          speed: 0.4, // Projectile speed relative to cells
          color: tower.color,
          freeze: tower.type === TowerType.ICE
        });
      }
    });
  };

  const handleProjectiles = () => {
    const hitIds: string[] = []; // Projectile IDs
    const deadEnemyIds: string[] = [];
    let moneyEarned = 0;

    projectilesRef.current.forEach(proj => {
      const target = enemiesRef.current.find(e => e.id === proj.targetId);
      if (!target) {
        hitIds.push(proj.id); // Remove projectile if target dead
        return;
      }

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.hypot(dx, dy);

      if (dist < proj.speed) {
        // Hit
        hitIds.push(proj.id);
        target.hp -= proj.damage;
        if (proj.freeze) target.frozen = 60; // Freeze for 1s (60 ticks)

        if (target.hp <= 0 && !deadEnemyIds.includes(target.id)) {
          deadEnemyIds.push(target.id);
          moneyEarned += target.reward;
        }
      } else {
        // Move
        proj.x += (dx / dist) * proj.speed;
        proj.y += (dy / dist) * proj.speed;
      }
    });

    // Cleanup
    projectilesRef.current = projectilesRef.current.filter(p => !hitIds.includes(p.id));
    
    if (deadEnemyIds.length > 0) {
      enemiesRef.current = enemiesRef.current.filter(e => !deadEnemyIds.includes(e.id));
      setGameState(prev => ({ ...prev, money: prev.money + moneyEarned }));
    }
  };

  const gameLoop = useCallback(() => {
    if (!stateRef.current.isPlaying || stateRef.current.isGameOver) return;

    // 1. Spawn Enemies from Queue
    if (waveQueueRef.current.length > 0) {
       if (waveQueueRef.current[0].delay <= 0) {
          const next = waveQueueRef.current.shift();
          if (next) spawnEnemy(next.type, next.hpMult);
       } else {
          waveQueueRef.current[0].delay--;
       }
    } else if (enemiesRef.current.length === 0 && stateRef.current.isPlaying) {
      // Wave Complete
      setGameState(prev => ({ ...prev, isPlaying: false }));
      triggerAiAdvice();
    }

    // 2. Update Entities
    moveEnemies();
    handleTowers();
    handleProjectiles();

    // 3. Trigger Render
    setEnemies([...enemiesRef.current]);
    setProjectiles([...projectilesRef.current]);
    
    setGameState(prev => ({ ...prev, gameTick: prev.gameTick + 1 }));

    frameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    if (gameState.isPlaying) {
      frameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState.isPlaying, gameLoop]);


  // --- Logic ---

  const triggerAiAdvice = async () => {
    setIsAdviceLoading(true);
    const newAdvice = await getTacticalAdvice(gameState, towersRef.current, advice);
    setAdvice(newAdvice);
    setIsAdviceLoading(false);
  };

  const startNextWave = () => {
    const nextWave = gameState.wave + 1;
    const configs = getWaveConfig(nextWave);
    
    const queue: { type: EnemyType; delay: number; hpMult: number }[] = [];
    
    configs.forEach(cfg => {
      for (let i = 0; i < cfg.count; i++) {
        queue.push({ type: cfg.enemyType, delay: cfg.interval, hpMult: cfg.hpMultiplier });
      }
    });

    waveQueueRef.current = queue;
    setGameState(prev => ({ ...prev, wave: nextWave, isPlaying: true }));
  };

  const handleRestart = () => {
     setGameState({
      money: INITIAL_MONEY,
      lives: INITIAL_LIVES,
      wave: 0,
      isPlaying: false,
      isGameOver: false,
      gameTick: 0
    });
    setTowers([]);
    setEnemies([]);
    setProjectiles([]);
    setSelectedTowerType(null);
    setSelectedTowerId(null);
    enemiesRef.current = [];
    towersRef.current = [];
    projectilesRef.current = [];
    waveQueueRef.current = [];
    setAdvice("正在重启模拟。这次别失败了。");
  };

  const handleTileClick = (pos: Position) => {
    if (gameState.isGameOver) return;
    if (pos.x < 0 || pos.x >= GRID_W || pos.y < 0 || pos.y >= GRID_H) return;

    const clickedTower = towers.find(t => t.x === pos.x && t.y === pos.y);

    // Mode 1: Building a tower
    if (selectedTowerType) {
      // Collision check for path
      const isPath = PATH_WAYPOINTS.some((wp, i) => {
          if (i === PATH_WAYPOINTS.length - 1) return false;
          const next = PATH_WAYPOINTS[i+1];
          const minX = Math.min(wp.x, next.x);
          const maxX = Math.max(wp.x, next.x);
          const minY = Math.min(wp.y, next.y);
          const maxY = Math.max(wp.y, next.y);
          return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      });

      if (isPath || clickedTower) return; // Invalid placement
      
      const stats = TOWER_STATS[selectedTowerType];
      if (gameState.money >= stats.cost) {
        const newTower: Tower = {
          ...stats,
          id: Math.random().toString(),
          x: pos.x,
          y: pos.y,
          cooldown: 0,
          upgrades: { damage: 0, range: 0, cooldown: 0 }
        };
        setTowers([...towers, newTower]);
        setGameState(prev => ({ ...prev, money: prev.money - stats.cost }));
        setSelectedTowerType(null); 
      }
    } 
    // Mode 2: Selecting an existing tower
    else {
      if (clickedTower) {
        setSelectedTowerId(clickedTower.id);
      } else {
        setSelectedTowerId(null); // Deselect if clicking empty space
      }
    }
  };

  const handleUpgrade = (type: 'damage' | 'range' | 'cooldown') => {
    if (!selectedTowerId) return;

    const towerIndex = towers.findIndex(t => t.id === selectedTowerId);
    if (towerIndex === -1) return;

    const tower = towers[towerIndex];
    const level = tower.upgrades[type];
    const baseCost = TOWER_STATS[tower.type].cost;
    // Cost formula: Base * 0.6 * (Level + 1)
    const cost = Math.floor(baseCost * UPGRADE_CONFIG.BASE_COST_MULTIPLIER * (level + 1));

    if (gameState.money >= cost) {
      const newTowers = [...towers];
      const t = newTowers[towerIndex];

      // Update State
      t.upgrades = { ...t.upgrades, [type]: level + 1 };
      
      // Apply Stat Boost
      if (type === 'damage') {
        t.damage *= UPGRADE_CONFIG.DAMAGE_MULTIPLIER;
      } else if (type === 'range') {
        t.range *= UPGRADE_CONFIG.RANGE_MULTIPLIER;
      } else if (type === 'cooldown') {
        t.cooldownMax *= UPGRADE_CONFIG.COOLDOWN_MULTIPLIER;
      }

      setTowers(newTowers);
      setGameState(prev => ({ ...prev, money: prev.money - cost }));
    }
  };

  const handleSelectTowerType = (type: TowerType | null) => {
    setSelectedTowerType(type);
    if (type) {
      setSelectedTowerId(null); // Deselect map tower if selecting from shop
    }
  };

  const selectedTowerInstance = towers.find(t => t.id === selectedTowerId) || null;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-start md:justify-center p-2 md:p-4 overflow-x-hidden">
      <h1 className="text-2xl md:text-4xl retro-font text-blue-500 mb-4 md:mb-6 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] text-center mt-2">
        GEMINI DEFENSE
      </h1>

      <div className="relative w-full max-w-[800px] flex justify-center">
        <GameMap 
          enemies={enemies}
          towers={towers}
          projectiles={projectiles}
          onTileClick={handleTileClick}
          selectedTowerType={selectedTowerType}
          selectedTowerId={selectedTowerId}
        />
        
        {gameState.isGameOver && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg backdrop-blur-sm z-10 m-auto w-full h-full">
            <div className="text-center px-4">
              <h2 className="text-3xl md:text-5xl font-bold text-red-500 mb-4 retro-font">游戏结束</h2>
              <p className="text-lg md:text-xl text-white mb-8">生存波次: {gameState.wave - 1}</p>
              <button 
                onClick={handleRestart}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg shadow-blue-500/30"
              >
                重启系统
              </button>
            </div>
          </div>
        )}
      </div>

      <Controls 
        gameState={gameState}
        selectedTower={selectedTowerType}
        selectedTowerInstance={selectedTowerInstance}
        onSelectTower={handleSelectTowerType}
        onUpgrade={handleUpgrade}
        onNextWave={startNextWave}
        onRestart={handleRestart}
        advice={advice}
        isAdviceLoading={isAdviceLoading}
      />
      
      <div className="mt-8 text-slate-500 text-[10px] md:text-xs text-center max-w-xl hidden md:block">
        <p>操作说明：从军械库选择防御塔建造，或点击已建造的防御塔进行升级。</p>
        <p>抵御敌人的进攻。Gemini AI 将在每波攻击间隙分析您的战略。</p>
      </div>
    </div>
  );
};

export default App;
