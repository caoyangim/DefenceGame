
import React, { useEffect, useRef } from 'react';
import { CELL_SIZE, GRID_H, GRID_W, PATH_WAYPOINTS, TOWER_STATS, ENEMY_STATS } from '../constants';
import { Enemy, Projectile, Tower, Position, TowerType } from '../types';

interface GameMapProps {
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  onTileClick: (pos: Position) => void;
  selectedTowerType: TowerType | null;
  selectedTowerId: string | null;
}

const GameMap: React.FC<GameMapProps> = ({ 
  enemies, 
  towers, 
  projectiles, 
  onTileClick, 
  selectedTowerType,
  selectedTowerId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePosRef = useRef<Position | null>(null);

  // Helper to check if a tile is on the path
  const isTileOnPath = (x: number, y: number) => {
    return PATH_WAYPOINTS.some((wp, i) => {
      if (i === PATH_WAYPOINTS.length - 1) return false;
      const next = PATH_WAYPOINTS[i+1];
      const minX = Math.min(wp.x, next.x);
      const maxX = Math.max(wp.x, next.x);
      const minY = Math.min(wp.y, next.y);
      const maxY = Math.max(wp.y, next.y);
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });
  };

  // Draw Function
  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. Draw Grid Background
    ctx.fillStyle = '#111827'; // Dark gray/blue bg
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Grid lines (subtle)
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_W; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, GRID_H * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_H; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(GRID_W * CELL_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }

    // 2. Draw Path
    ctx.strokeStyle = '#374151'; // Lighter path color
    ctx.lineWidth = CELL_SIZE * 0.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    // Convert grid coordinates to pixel center coordinates
    const getPixelPos = (p: Position) => ({
      x: p.x * CELL_SIZE + CELL_SIZE / 2,
      y: p.y * CELL_SIZE + CELL_SIZE / 2
    });

    const start = getPixelPos(PATH_WAYPOINTS[0]);
    ctx.moveTo(start.x, start.y);
    
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      const p = getPixelPos(PATH_WAYPOINTS[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // 3. Draw Towers
    towers.forEach(tower => {
      const px = tower.x * CELL_SIZE + CELL_SIZE / 2;
      const py = tower.y * CELL_SIZE + CELL_SIZE / 2;

      // Base
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(px, py, CELL_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Highlight if selected
      if (tower.id === selectedTowerId) {
        ctx.strokeStyle = '#facc15'; // Yellow highlight
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, CELL_SIZE * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Permament Range Circle for selected tower
        ctx.beginPath();
        ctx.arc(px, py, tower.range * CELL_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Turret
      ctx.fillStyle = tower.color;
      ctx.beginPath();
      if (tower.type === 'SNIPER') {
        ctx.rect(px - 6, py - 6, 12, 12);
      } else if (tower.type === 'ICE') {
        ctx.moveTo(px, py - 10);
        ctx.lineTo(px + 10, py + 5);
        ctx.lineTo(px - 10, py + 5);
      } else {
        ctx.arc(px, py, CELL_SIZE * 0.25, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // Cooldown indicator (ring)
      if (tower.cooldown > 0) {
         ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         const pct = tower.cooldown / tower.cooldownMax;
         ctx.arc(px, py, CELL_SIZE * 0.35, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * pct));
         ctx.stroke();
      }

      // Upgrade indicators (little dots)
      const totalUpgrades = tower.upgrades.damage + tower.upgrades.range + tower.upgrades.cooldown;
      if (totalUpgrades > 0) {
        ctx.fillStyle = '#fbbf24';
        for (let i = 0; i < Math.min(totalUpgrades, 3); i++) {
          ctx.beginPath();
          ctx.arc(px - 8 + (i * 8), py + 12, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (totalUpgrades > 3) {
           ctx.font = '8px Arial';
           ctx.fillStyle = '#fff';
           ctx.fillText('+', px + 12, py + 14);
        }
      }
    });

    // 4. Draw Enemies
    enemies.forEach(enemy => {
      const px = enemy.x * CELL_SIZE + CELL_SIZE / 2;
      const py = enemy.y * CELL_SIZE + CELL_SIZE / 2;
      const config = ENEMY_STATS[enemy.type];

      ctx.fillStyle = enemy.frozen > 0 ? '#67e8f9' : config.color;
      
      // Draw shape based on type
      ctx.beginPath();
      if (enemy.type === 'BOSS') {
        ctx.rect(px - 12, py - 12, 24, 24);
      } else if (enemy.type === 'GOBLIN') {
        ctx.arc(px, py, 6, 0, Math.PI * 2);
      } else {
        ctx.arc(px, py, 10, 0, Math.PI * 2);
      }
      ctx.fill();
      
      // HP Bar
      const hpPct = enemy.hp / enemy.maxHp;
      ctx.fillStyle = 'red';
      ctx.fillRect(px - 10, py - 16, 20, 4);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px - 10, py - 16, 20 * hpPct, 4);
    });

    // 5. Draw Projectiles
    projectiles.forEach(proj => {
      const px = proj.x * CELL_SIZE + CELL_SIZE / 2;
      const py = proj.y * CELL_SIZE + CELL_SIZE / 2;

      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 6. Draw Hover, Range, and Validation
    const mousePos = mousePosRef.current;
    if (mousePos) {
      const px = mousePos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = mousePos.y * CELL_SIZE + CELL_SIZE / 2;

      // Determine logic for range and validity
      let rangeRadius = 0;
      let isInvalidPlacement = false;

      // Only show hover range if we are NOT building and not hovering the currently selected upgraded tower
      // (because selected upgraded tower already draws its range permanently)
      
      if (selectedTowerType) {
        // Building Mode
        rangeRadius = TOWER_STATS[selectedTowerType].range * CELL_SIZE;
        const isOccupied = towers.some(t => t.x === mousePos.x && t.y === mousePos.y);
        const onPath = isTileOnPath(mousePos.x, mousePos.y);
        isInvalidPlacement = isOccupied || onPath;
      } else {
        // Inspect Mode: Hovering over OTHER towers
        const hoveredTower = towers.find(t => t.x === mousePos.x && t.y === mousePos.y);
        if (hoveredTower && hoveredTower.id !== selectedTowerId) {
          rangeRadius = hoveredTower.range * CELL_SIZE;
        }
      }

      // Draw Highlight Box
      ctx.fillStyle = isInvalidPlacement ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(mousePos.x * CELL_SIZE, mousePos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = isInvalidPlacement ? 'rgba(239, 68, 68, 0.8)' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mousePos.x * CELL_SIZE, mousePos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      // Draw Range Circle (Building or Hovering unselected)
      if (rangeRadius > 0) {
        ctx.beginPath();
        ctx.arc(px, py, rangeRadius, 0, Math.PI * 2);
        
        if (isInvalidPlacement) {
           ctx.fillStyle = 'rgba(239, 68, 68, 0.1)'; 
           ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        } else {
           ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
           ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        }
        
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const renderLoop = () => {
      draw(ctx);
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [enemies, towers, projectiles, selectedTowerType, selectedTowerId]); 

  const getGridPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    // Calculate scale factors (CSS size vs Attribute size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((clientX - rect.left) * scaleX / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) * scaleY / CELL_SIZE);

    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
      return { x, y };
    }
    return null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const pos = getGridPos(e.clientX, e.clientY);
    if (pos) {
      onTileClick(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getGridPos(e.clientX, e.clientY);
    mousePosRef.current = pos;
  };

  const handleMouseLeave = () => {
    mousePosRef.current = null;
  };
  
  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default to avoid scrolling on some devices if needed, but might block scroll
    // e.preventDefault(); 
    const touch = e.touches[0];
    const pos = getGridPos(touch.clientX, touch.clientY);
    if (pos) {
      mousePosRef.current = pos;
      onTileClick(pos);
    }
  };

  return (
    <div className="relative w-full max-w-[800px] shadow-2xl rounded-lg border border-slate-700 bg-slate-900 overflow-hidden monitor-bezel">
      <canvas
        ref={canvasRef}
        width={GRID_W * CELL_SIZE}
        height={GRID_H * CELL_SIZE}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        className="w-full h-auto cursor-crosshair block touch-manipulation"
        style={{ imageRendering: 'pixelated' }} 
      />
      {/* Scanline overlay effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent to-black opacity-10" 
           style={{ backgroundSize: '100% 4px' }}></div>
    </div>
  );
};

export default GameMap;
