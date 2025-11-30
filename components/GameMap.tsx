
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

    // 1. Draw Background (Grass)
    ctx.fillStyle = '#3f6212'; // Dark green grass
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Draw simple grass tufts
    ctx.fillStyle = '#365314';
    for(let i=0; i<30; i++) {
       const rx = (Math.sin(i * 123) * 0.5 + 0.5) * ctx.canvas.width;
       const ry = (Math.cos(i * 321) * 0.5 + 0.5) * ctx.canvas.height;
       ctx.beginPath();
       ctx.arc(rx, ry, 2, 0, Math.PI*2);
       ctx.fill();
    }

    // 2. Draw Path (Dirt Road)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Convert grid coordinates to pixel center coordinates
    const getPixelPos = (p: Position) => ({
      x: p.x * CELL_SIZE + CELL_SIZE / 2,
      y: p.y * CELL_SIZE + CELL_SIZE / 2
    });

    // Outer path (dirt edge)
    ctx.strokeStyle = '#5d4037'; // Brown edge
    ctx.lineWidth = CELL_SIZE * 0.8;
    ctx.beginPath();
    const start = getPixelPos(PATH_WAYPOINTS[0]);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
      const p = getPixelPos(PATH_WAYPOINTS[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Inner path (lighter dirt)
    ctx.strokeStyle = '#795548'; // Lighter brown
    ctx.lineWidth = CELL_SIZE * 0.6;
    ctx.stroke();

    // 3. Draw Towers
    towers.forEach(tower => {
      const px = tower.x * CELL_SIZE + CELL_SIZE / 2;
      const py = tower.y * CELL_SIZE + CELL_SIZE / 2;

      // Draw Base (Stone)
      ctx.fillStyle = '#78716c'; // Stone grey
      ctx.strokeStyle = '#44403c';
      ctx.lineWidth = 2;
      ctx.fillRect(px - 14, py - 14, 28, 28);
      ctx.strokeRect(px - 14, py - 14, 28, 28);

      // Highlight if selected
      if (tower.id === selectedTowerId) {
        ctx.strokeStyle = '#facc15'; // Gold highlight
        ctx.lineWidth = 3;
        ctx.strokeRect(px - 16, py - 16, 32, 32);

        // Draw Permanent Range Circle for selected tower
        ctx.beginPath();
        ctx.arc(px, py, tower.range * CELL_SIZE, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Turret / Structure
      ctx.fillStyle = tower.color;
      
      if (tower.type === TowerType.SNIPER) { // Ballista
        // Crossbow shape
        ctx.fillStyle = '#3e2723'; // Dark wood
        ctx.save();
        ctx.translate(px, py);
        // Find nearest enemy to rotate? Just static for now or generic direction
        ctx.rotate(Math.PI / 4); 
        ctx.fillRect(-4, -12, 8, 24); // Body
        ctx.fillRect(-12, -4, 24, 4); // Bow
        ctx.restore();
      } else if (tower.type === TowerType.RAPID) { // Mage Tower
        // Crystal
        ctx.fillStyle = '#7e22ce';
        ctx.beginPath();
        ctx.moveTo(px, py - 12);
        ctx.lineTo(px + 8, py);
        ctx.lineTo(px, py + 12);
        ctx.lineTo(px - 8, py);
        ctx.closePath();
        ctx.fill();
        // Glow
        ctx.fillStyle = 'rgba(147, 51, 234, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI*2);
        ctx.fill();
      } else if (tower.type === TowerType.ICE) { // Frost Obelisk
        // Triangle/Obelisk
        ctx.fillStyle = '#0ea5e9';
        ctx.beginPath();
        ctx.moveTo(px, py - 14);
        ctx.lineTo(px + 8, py + 10);
        ctx.lineTo(px - 8, py + 10);
        ctx.closePath();
        ctx.fill();
      } else { // Basic Archer Tower
        // Round wooden tower
        ctx.fillStyle = '#a16207';
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Cross (roof or weapon)
        ctx.beginPath();
        ctx.moveTo(px - 5, py - 5);
        ctx.lineTo(px + 5, py + 5);
        ctx.moveTo(px + 5, py - 5);
        ctx.lineTo(px - 5, py + 5);
        ctx.stroke();
      }
      
      // Cooldown indicator (small bar below)
      if (tower.cooldown > 0) {
         const pct = tower.cooldown / tower.cooldownMax;
         ctx.fillStyle = 'rgba(0,0,0,0.5)';
         ctx.fillRect(px - 12, py + 16, 24, 4);
         ctx.fillStyle = '#fbbf24';
         ctx.fillRect(px - 12, py + 16, 24 * (1-pct), 4);
      }

      // Upgrade indicators (Stars)
      const totalUpgrades = tower.upgrades.damage + tower.upgrades.range + tower.upgrades.cooldown;
      if (totalUpgrades > 0) {
        ctx.fillStyle = '#facc15';
        for (let i = 0; i < Math.min(totalUpgrades, 3); i++) {
          ctx.beginPath();
          ctx.arc(px - 8 + (i * 8), py - 18, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });

    // 4. Draw Enemies
    enemies.forEach(enemy => {
      const px = enemy.x * CELL_SIZE + CELL_SIZE / 2;
      const py = enemy.y * CELL_SIZE + CELL_SIZE / 2;
      const config = ENEMY_STATS[enemy.type];

      ctx.fillStyle = enemy.frozen > 0 ? '#67e8f9' : config.color;
      
      // Shadow
      ctx.beginPath();
      ctx.ellipse(px, py + 8, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // Body
      ctx.fillStyle = enemy.frozen > 0 ? '#bae6fd' : config.color;
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      if (enemy.type === 'BOSS') { // Dragon/Big Boss
        ctx.moveTo(px, py - 15);
        ctx.lineTo(px + 12, py + 5);
        ctx.lineTo(px, py + 12);
        ctx.lineTo(px - 12, py + 5);
        ctx.closePath();
      } else if (enemy.type === 'GOBLIN') { // Small circle
        ctx.arc(px, py, 6, 0, Math.PI * 2);
      } else if (enemy.type === 'TANK') { // Square-ish Golem
        ctx.rect(px - 9, py - 9, 18, 18);
      } else { // Orc (Medium circle)
        ctx.arc(px, py, 9, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();

      // Ice effect overlay
      if (enemy.frozen > 0) {
         ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
         ctx.fill();
      }
      
      // HP Bar
      const hpPct = enemy.hp / enemy.maxHp;
      const hpWidth = 20;
      const hpY = py - 18;
      
      ctx.fillStyle = '#44403c';
      ctx.fillRect(px - hpWidth/2, hpY, hpWidth, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.2 ? '#eab308' : '#ef4444';
      ctx.fillRect(px - hpWidth/2, hpY, hpWidth * hpPct, 4);
    });

    // 5. Draw Projectiles
    projectiles.forEach(proj => {
      const px = proj.x * CELL_SIZE + CELL_SIZE / 2;
      const py = proj.y * CELL_SIZE + CELL_SIZE / 2;

      ctx.fillStyle = proj.color;
      
      if (proj.color === '#7e22ce' || proj.color === '#0ea5e9') {
        // Magic Orb
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        // Sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(px-1, py-1, 1.5, 0, Math.PI*2);
        ctx.fill();
      } else {
        // Arrow / Bolt (Line)
        // Ideally we'd calculate rotation based on movement vector, 
        // but for now a simple dot/line suffices
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    });

    // 6. Draw Cursor / Placement
    const mousePos = mousePosRef.current;
    if (mousePos) {
      const px = mousePos.x * CELL_SIZE + CELL_SIZE / 2;
      const py = mousePos.y * CELL_SIZE + CELL_SIZE / 2;

      let rangeRadius = 0;
      let isInvalidPlacement = false;
      
      if (selectedTowerType) {
        rangeRadius = TOWER_STATS[selectedTowerType].range * CELL_SIZE;
        const isOccupied = towers.some(t => t.x === mousePos.x && t.y === mousePos.y);
        const onPath = isTileOnPath(mousePos.x, mousePos.y);
        isInvalidPlacement = isOccupied || onPath;
      } else {
        const hoveredTower = towers.find(t => t.x === mousePos.x && t.y === mousePos.y);
        if (hoveredTower && hoveredTower.id !== selectedTowerId) {
          rangeRadius = hoveredTower.range * CELL_SIZE;
        }
      }

      // Selection Box
      ctx.strokeStyle = isInvalidPlacement ? '#ef4444' : '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(mousePos.x * CELL_SIZE, mousePos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

      if (rangeRadius > 0) {
        ctx.beginPath();
        ctx.arc(px, py, rangeRadius, 0, Math.PI * 2);
        if (isInvalidPlacement) {
           ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; 
           ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        } else {
           ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
           ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        }
        ctx.fill();
        ctx.stroke();
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
    return () => cancelAnimationFrame(animationFrameId);
  }, [enemies, towers, projectiles, selectedTowerType, selectedTowerId]); 

  const getGridPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) * scaleY / CELL_SIZE);
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) return { x, y };
    return null;
  };

  const handleClick = (e: React.MouseEvent) => {
    const pos = getGridPos(e.clientX, e.clientY);
    if (pos) onTileClick(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getGridPos(e.clientX, e.clientY);
    mousePosRef.current = pos;
  };

  const handleMouseLeave = () => {
    mousePosRef.current = null;
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const pos = getGridPos(touch.clientX, touch.clientY);
    if (pos) {
      mousePosRef.current = pos;
      onTileClick(pos);
    }
  };

  return (
    <div className="relative w-full max-w-[800px] rounded-lg bg-[#3e2723] overflow-hidden map-border group">
      <canvas
        ref={canvasRef}
        width={GRID_W * CELL_SIZE}
        height={GRID_H * CELL_SIZE}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        className="w-full h-auto cursor-crosshair block touch-none relative z-10"
        style={{ imageRendering: 'auto' }} 
      />
    </div>
  );
};

export default GameMap;
