
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
  const [advice, setAdvice] = useState<string>("陛下，臣已就位。请下令部署防线。");
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);

  // Refs for Game Loop
  const stateRef = useRef(gameState);
  const enemiesRef = useRef<Enemy[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const waveQueueRef = useRef<{ type: EnemyType; delay: number; hpMult: number }[]>([]);
  const frameRef = useRef<number>(0);

  // Sync refs
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
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.pathIndex++;
      } else {
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
        tower.cooldown = tower.cooldownMax;
        projectilesRef.current.push({
          id: Math.random().toString(),
          x: tower.x,
          y: tower.y,
          targetId: (target as Enemy).id,
          damage: tower.damage,
          speed: 0.4,
          color: tower.color,
          freeze: tower.type === TowerType.ICE
        });
      }
    });
  };

  const handleProjectiles = () => {
    const hitIds: string[] = [];
    const deadEnemyIds: string[] = [];
    let moneyEarned = 0;

    projectilesRef.current.forEach(proj => {
      const target = enemiesRef.current.find(e => e.id === proj.targetId);
      if (!target) {
        hitIds.push(proj.id);
        return;
      }

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.hypot(dx, dy);

      if (dist < proj.speed) {
        hitIds.push(proj.id);
        target.hp -= proj.damage;
        if (proj.freeze) target.frozen = 60;

        if (target.hp <= 0 && !deadEnemyIds.includes(target.id)) {
          deadEnemyIds.push(target.id);
          moneyEarned += target.reward;
        }
      } else {
        proj.x += (dx / dist) * proj.speed;
        proj.y += (dy / dist) * proj.speed;
      }
    });

    projectilesRef.current = projectilesRef.current.filter(p => !hitIds.includes(p.id));
    
    if (deadEnemyIds.length > 0) {
      enemiesRef.current = enemiesRef.current.filter(e => !deadEnemyIds.includes(e.id));
      setGameState(prev => ({ ...prev, money: prev.money + moneyEarned }));
    }
  };

  const gameLoop = useCallback(() => {
    if (!stateRef.current.isPlaying || stateRef.current.isGameOver) return;

    if (waveQueueRef.current.length > 0) {
       if (waveQueueRef.current[0].delay <= 0) {
          const next = waveQueueRef.current.shift();
          if (next) spawnEnemy(next.type, next.hpMult);
       } else {
          waveQueueRef.current[0].delay--;
       }
    } else if (enemiesRef.current.length === 0 && stateRef.current.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: false }));
      triggerAiAdvice();
    }

    moveEnemies();
    handleTowers();
    handleProjectiles();

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
    setAdvice("王国百废待兴，陛下请下令。");
  };

  const handleTileClick = (pos: Position) => {
    if (gameState.isGameOver) return;
    if (pos.x < 0 || pos.x >= GRID_W || pos.y < 0 || pos.y >= GRID_H) return;

    const clickedTower = towers.find(t => t.x === pos.x && t.y === pos.y);

    if (selectedTowerType) {
      const isPath = PATH_WAYPOINTS.some((wp, i) => {
          if (i === PATH_WAYPOINTS.length - 1) return false;
          const next = PATH_WAYPOINTS[i+1];
          const minX = Math.min(wp.x, next.x);
          const maxX = Math.max(wp.x, next.x);
          const minY = Math.min(wp.y, next.y);
          const maxY = Math.max(wp.y, next.y);
          return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      });

      if (isPath || clickedTower) return; 
      
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
    else {
      if (clickedTower) {
        setSelectedTowerId(clickedTower.id);
      } else {
        setSelectedTowerId(null);
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
    const cost = Math.floor(baseCost * UPGRADE_CONFIG.BASE_COST_MULTIPLIER * (level + 1));

    if (gameState.money >= cost) {
      const newTowers = [...towers];
      const t = newTowers[towerIndex];
      t.upgrades = { ...t.upgrades, [type]: level + 1 };
      
      if (type === 'damage') t.damage *= UPGRADE_CONFIG.DAMAGE_MULTIPLIER;
      else if (type === 'range') t.range *= UPGRADE_CONFIG.RANGE_MULTIPLIER;
      else if (type === 'cooldown') t.cooldownMax *= UPGRADE_CONFIG.COOLDOWN_MULTIPLIER;

      setTowers(newTowers);
      setGameState(prev => ({ ...prev, money: prev.money - cost }));
    }
  };

  const handleSelectTowerType = (type: TowerType | null) => {
    setSelectedTowerType(type);
    if (type) setSelectedTowerId(null);
  };

  const selectedTowerInstance = towers.find(t => t.id === selectedTowerId) || null;

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start p-2 md:p-4 md:pt-8 overflow-x-hidden">
      
      <header className="mb-2 md:mb-6 relative z-10 text-center">
        <h1 className="text-3xl md:text-6xl title-font font-black text-[#eaddcf] drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-widest border-y-2 border-[#8d6e63] py-2 bg-[#3e2723]/80 px-8 rounded-sm inline-block shadow-lg">
          KINGDOM DEFENSE
        </h1>
        <p className="text-[#a1887f] text-xs md:text-sm tracking-[0.2em] mt-2 font-serif uppercase">
           Royal Tactical Simulator
        </p>
      </header>

      <div className="relative w-full max-w-[800px] flex justify-center z-10 px-0 md:px-0">
        <GameMap 
          enemies={enemies}
          towers={towers}
          projectiles={projectiles}
          onTileClick={handleTileClick}
          selectedTowerType={selectedTowerType}
          selectedTowerId={selectedTowerId}
        />
        
        {gameState.isGameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg"></div>
            <div className="relative parchment-panel p-6 md:p-8 rounded text-center max-w-[90%] md:max-w-sm w-full animate-in fade-in zoom-in duration-500 shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-black text-[#8f1919] mb-4 title-font border-b-2 border-[#5d4037] pb-2">
                城池沦陷
              </h2>
              <p className="text-xl md:text-2xl text-[#3e2723] mb-2 font-bold font-serif">
                生存波次: <span className="text-[#d84315]">{gameState.wave - 1}</span>
              </p>
              <p className="text-sm text-[#5d4037] mb-6 italic">
                “王国已成废墟，唯有历史铭记此刻。”
              </p>
              <button 
                onClick={handleRestart}
                className="w-full btn-primary font-bold py-3 px-6 rounded shadow-lg uppercase tracking-wider text-base md:text-lg title-font"
              >
                重建王国
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
    </div>
  );
};

export default App;
