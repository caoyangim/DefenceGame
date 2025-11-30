
import React from 'react';
import { TowerType, GameState, Tower } from '../types';
import { TOWER_STATS, UPGRADE_CONFIG } from '../constants';
import { Zap, Crosshair, Snowflake, Triangle, Heart, DollarSign, ShieldAlert, Play, RefreshCw, ArrowUp, X } from 'lucide-react';

interface ControlsProps {
  gameState: GameState;
  selectedTower: TowerType | null;
  selectedTowerInstance: Tower | null;
  onSelectTower: (type: TowerType | null) => void;
  onUpgrade: (type: 'damage' | 'range' | 'cooldown') => void;
  onNextWave: () => void;
  onRestart: () => void;
  advice: string;
  isAdviceLoading: boolean;
}

const Controls: React.FC<ControlsProps> = ({ 
  gameState, 
  selectedTower,
  selectedTowerInstance,
  onSelectTower, 
  onUpgrade,
  onNextWave, 
  onRestart,
  advice,
  isAdviceLoading
}) => {

  const getIcon = (type: TowerType) => {
    switch(type) {
      case TowerType.BASIC: return <Triangle size={18} className="rotate-90" />;
      case TowerType.SNIPER: return <Crosshair size={18} />;
      case TowerType.RAPID: return <Zap size={18} />;
      case TowerType.ICE: return <Snowflake size={18} />;
    }
  };

  const getUpgradeCost = (tower: Tower, level: number) => {
    const baseCost = TOWER_STATS[tower.type].cost;
    return Math.floor(baseCost * UPGRADE_CONFIG.BASE_COST_MULTIPLIER * (level + 1));
  };

  return (
    <div className="w-full max-w-4xl mt-2 md:mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 pb-4">
      
      {/* Stats Panel */}
      <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700 flex flex-row md:flex-col justify-between items-center md:items-stretch gap-4 md:gap-0 order-1 md:order-1">
        <h2 className="hidden md:flex text-xl font-bold retro-font text-blue-400 mb-4 items-center gap-2">
          <ShieldAlert /> 状态面板
        </h2>
        <div className="flex-1 flex md:block justify-around space-x-4 md:space-x-0 md:space-y-2 font-mono text-sm md:text-lg w-full">
          <div className="flex items-center justify-between text-red-400 gap-1">
            <span className="flex items-center gap-2"><Heart size={16} className="md:w-5 md:h-5" fill="currentColor" /> <span className="hidden md:inline">生命值</span></span>
            <span>{gameState.lives}</span>
          </div>
          <div className="flex items-center justify-between text-yellow-400 gap-1">
            <span className="flex items-center gap-2"><DollarSign size={16} className="md:w-5 md:h-5" /> <span className="hidden md:inline">资金</span></span>
            <span>{gameState.money}</span>
          </div>
          <div className="flex items-center justify-between text-purple-400 gap-1">
            <span className="flex items-center gap-2"><ShieldAlert size={16} className="md:w-5 md:h-5" /> <span className="hidden md:inline">波次</span></span>
            <span>{gameState.wave}</span>
          </div>
        </div>
      </div>

      {/* Action Center & AI Advice */}
      <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700 flex flex-col md:col-span-1 relative overflow-hidden order-3 md:order-2">
        <h2 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">战术顾问 (Gemini)</h2>
        <div className="flex-1 bg-slate-900 rounded p-2 md:p-3 text-xs md:text-sm text-green-400 font-mono border border-slate-700 overflow-y-auto h-[60px] md:h-[100px] max-h-[100px] shadow-inner">
           {isAdviceLoading ? (
             <span className="animate-pulse">正在分析战场策略...</span>
           ) : (
             <p className="typing-effect">{advice}</p>
           )}
        </div>

        <div className="mt-3 md:mt-4 flex gap-2">
          {!gameState.isPlaying && !gameState.isGameOver && (
             <button 
             onClick={onNextWave}
             className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-green-500/20 active:scale-95 text-sm md:text-base"
           >
             <Play size={18} fill="currentColor"/> 下一波
           </button>
          )}
          {gameState.isGameOver && (
            <button 
            onClick={onRestart}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/20 active:scale-95 text-sm md:text-base"
          >
            <RefreshCw size={18} /> 重试
          </button>
          )}
          {gameState.isPlaying && (
             <div className="flex-1 bg-slate-700 text-slate-400 font-bold py-2 px-4 rounded flex items-center justify-center gap-2 cursor-not-allowed text-sm md:text-base">
                战斗进行中...
             </div>
          )}
        </div>
      </div>

      {/* Dynamic Panel: Shop OR Upgrade */}
      <div className="bg-slate-800 p-3 md:p-4 rounded-lg border border-slate-700 order-2 md:order-3">
        
        {selectedTowerInstance ? (
          // Upgrade Panel
          <div>
             <div className="flex items-center justify-between mb-2 md:mb-4">
                <h2 className="text-lg md:text-xl font-bold retro-font text-purple-400 flex items-center gap-2">
                  <ArrowUp className="w-5 h-5"/> 升级系统
                </h2>
                <span className="text-[10px] md:text-xs font-mono text-slate-400">{selectedTowerInstance.name}</span>
             </div>
             
             <div className="space-y-2">
               {/* Damage Upgrade */}
               <button 
                 onClick={() => onUpgrade('damage')}
                 disabled={gameState.money < getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades.damage)}
                 className="w-full bg-slate-700 p-2 rounded flex items-center justify-between hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 active:bg-slate-600"
               >
                 <div className="flex flex-col items-start">
                   <span className="text-xs md:text-sm font-bold text-red-300">升级伤害</span>
                   <span className="text-[10px] text-slate-400">当前: {Math.round(selectedTowerInstance.damage)} (Lv.{selectedTowerInstance.upgrades.damage})</span>
                 </div>
                 <div className="text-yellow-400 font-mono text-xs md:text-sm">
                   ${getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades.damage)}
                 </div>
               </button>

               {/* Range Upgrade */}
               <button 
                 onClick={() => onUpgrade('range')}
                 disabled={gameState.money < getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades.range)}
                 className="w-full bg-slate-700 p-2 rounded flex items-center justify-between hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 active:bg-slate-600"
               >
                 <div className="flex flex-col items-start">
                   <span className="text-xs md:text-sm font-bold text-blue-300">升级范围</span>
                   <span className="text-[10px] text-slate-400">当前: {selectedTowerInstance.range.toFixed(1)} (Lv.{selectedTowerInstance.upgrades.range})</span>
                 </div>
                 <div className="text-yellow-400 font-mono text-xs md:text-sm">
                   ${getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades.range)}
                 </div>
               </button>

               {/* Cooldown Upgrade */}
               <button 
                 onClick={() => onUpgrade('cooldown')}
                 disabled={gameState.money < getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades.cooldown)}
                 className="w-full bg-slate-700 p-2 rounded flex items-center justify-between hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 active:bg-slate-600"
               >
                 <div className="flex flex-col items-start">
                   <span className="text-xs md:text-sm font-bold text-yellow-300">升级射速</span>
                   <span className="text-[10px] text-slate-400">当前: {(60/selectedTowerInstance.cooldownMax).toFixed(1)}/s (Lv.{selectedTowerInstance.upgrades.cooldown})</span>
                 </div>
                 <div className="text-yellow-400 font-mono text-xs md:text-sm">
                   ${getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades.cooldown)}
                 </div>
               </button>
             </div>
          </div>
        ) : (
          // Shop Panel
          <div>
            <h2 className="text-lg md:text-xl font-bold retro-font text-yellow-400 mb-2 md:mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5"/> 军械库
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TOWER_STATS).map((stats) => {
                const canAfford = gameState.money >= stats.cost;
                const isSelected = selectedTower === stats.type;
                
                return (
                  <button
                    key={stats.type}
                    onClick={() => onSelectTower(isSelected ? null : stats.type as TowerType)}
                    disabled={!canAfford}
                    className={`
                      p-2 rounded border-2 transition-all text-left relative overflow-hidden group
                      ${isSelected ? 'border-blue-400 bg-blue-900/30' : 'border-slate-600 bg-slate-700 hover:bg-slate-600 active:bg-slate-600'}
                      ${!canAfford ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs md:text-sm text-white flex items-center gap-1">
                        {getIcon(stats.type as TowerType)} {stats.name}
                      </span>
                    </div>
                    <div className="text-xs text-yellow-300 font-mono">${stats.cost}</div>
                    <div className="text-[10px] text-slate-300 mt-1 hidden sm:block">
                        攻: {stats.damage} | 范: {stats.range}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-[10px] md:text-xs text-slate-400 text-center min-h-[1rem]">
                {selectedTower ? "点击地图放置" : "选择炮台建造"}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Controls;
