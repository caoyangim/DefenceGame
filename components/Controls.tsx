
import React from 'react';
import { TowerType, GameState, Tower } from '../types';
import { TOWER_STATS, UPGRADE_CONFIG } from '../constants';
import { Scroll, Crosshair, Snowflake, Sword, Heart, Coins, ShieldAlert, Play, RefreshCw, ArrowUp, Sparkles, Feather } from 'lucide-react';

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
      case TowerType.BASIC: return <Sword size={18} />;
      case TowerType.SNIPER: return <Crosshair size={18} />;
      case TowerType.RAPID: return <Sparkles size={18} />;
      case TowerType.ICE: return <Snowflake size={18} />;
    }
  };

  const getUpgradeCost = (tower: Tower, level: number) => {
    const baseCost = TOWER_STATS[tower.type].cost;
    return Math.floor(baseCost * UPGRADE_CONFIG.BASE_COST_MULTIPLIER * (level + 1));
  };

  return (
    <div className="w-full max-w-4xl mt-4 md:mt-6 flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 pb-8 z-10 px-2 md:px-0 font-serif">
      
      {/* Stats Panel */}
      <div className="wood-panel rounded p-3 md:p-4 md:col-span-3 flex md:flex-col justify-between items-center md:items-stretch min-h-[auto] md:min-h-[140px] order-1">
        <div className="flex items-center gap-2 text-[#d7ccc8] md:mb-2 md:border-b border-[#8d6e63] md:pb-2 hidden md:flex">
           <ShieldAlert size={16} />
           <span className="text-xs font-bold tracking-widest uppercase title-font">王国概况</span>
        </div>
        
        <div className="flex flex-row md:flex-col gap-4 md:gap-3 w-full justify-around md:justify-start">
          <div className="flex items-center gap-2 md:justify-between">
            <div className="flex items-center gap-1 md:gap-2 text-red-300">
               <Heart size={16} fill="currentColor" className="opacity-80"/>
               <span className="text-sm font-bold hidden md:inline">城堡耐久</span>
            </div>
            <span className="text-lg md:text-xl font-bold text-white title-font">{gameState.lives}</span>
          </div>
          
          <div className="flex items-center gap-2 md:justify-between">
            <div className="flex items-center gap-1 md:gap-2 text-yellow-300">
               <Coins size={16} />
               <span className="text-sm font-bold hidden md:inline">国库黄金</span>
            </div>
            <span className="text-lg md:text-xl font-bold text-white title-font">{gameState.money}</span>
          </div>

          <div className="flex items-center gap-2 md:justify-between">
            <div className="flex items-center gap-1 md:gap-2 text-blue-300">
               <ShieldAlert size={16} />
               <span className="text-sm font-bold hidden md:inline">敌军波次</span>
            </div>
            <span className="text-lg md:text-xl font-bold text-white title-font">{gameState.wave}</span>
          </div>
        </div>
      </div>

      {/* Main Action Panel */}
      <div className="parchment-panel rounded p-3 md:p-4 md:col-span-6 flex flex-col order-2">
         {selectedTowerInstance ? (
           // Upgrade View
           <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-2 md:mb-4 border-b border-[#a1887f] pb-2">
                <div className="flex items-center gap-2 text-[#3e2723]">
                  <ArrowUp size={18} />
                  <span className="font-bold tracking-wider text-base md:text-lg title-font">强化工事</span>
                </div>
                <div className="text-xs text-[#5d4037]">ID:{selectedTowerInstance.id.substring(0,4)}</div>
              </div>
              
              <div className="grid grid-cols-1 md:gap-3 gap-2">
                 {[
                   { type: 'damage', label: '威力', current: Math.round(selectedTowerInstance.damage) },
                   { type: 'range', label: '射程', current: selectedTowerInstance.range.toFixed(1) },
                   { type: 'cooldown', label: '攻速', current: selectedTowerInstance.cooldownMax }
                 ].map((ug) => {
                   const cost = getUpgradeCost(selectedTowerInstance, selectedTowerInstance.upgrades[ug.type as keyof typeof selectedTowerInstance.upgrades]);
                   const canAfford = gameState.money >= cost;
                   
                   return (
                    <button 
                      key={ug.type}
                      onClick={() => onUpgrade(ug.type as any)}
                      disabled={!canAfford}
                      className={`
                        relative overflow-hidden group p-2 rounded border transition-all flex items-center justify-between
                        ${canAfford ? 'border-[#8d6e63] bg-[#fff8e1] hover:bg-[#ffecb3]' : 'border-gray-400 bg-gray-200 opacity-60 cursor-not-allowed'}
                      `}
                    >
                      <div className="flex flex-col items-start gap-0 md:gap-1 z-10">
                        <span className="text-sm font-bold text-[#3e2723]">{ug.label} <span className="text-xs text-[#5d4037] ml-1">Lv.{selectedTowerInstance.upgrades[ug.type as keyof typeof selectedTowerInstance.upgrades]}</span></span>
                      </div>
                      <div className="flex items-center gap-1 z-10">
                         <Coins size={14} className="text-[#f57f17]"/>
                         <span className={`font-bold text-sm ${canAfford ? 'text-[#3e2723]' : 'text-gray-500'}`}>{cost}</span>
                      </div>
                    </button>
                   );
                 })}
              </div>
           </div>
         ) : (
           // Shop View
           <div className="h-full flex flex-col">
              <div className="flex items-center gap-2 text-[#3e2723] mb-2 md:mb-3 border-b border-[#a1887f] pb-2">
                 <Scroll size={18} />
                 <span className="text-sm font-bold tracking-widest uppercase title-font">建筑工坊</span>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-2 gap-2 md:gap-3">
                {Object.values(TOWER_STATS).map((stats) => {
                  const canAfford = gameState.money >= stats.cost;
                  const isSelected = selectedTower === stats.type;
                  
                  return (
                    <button
                      key={stats.type}
                      onClick={() => onSelectTower(isSelected ? null : stats.type as TowerType)}
                      disabled={!canAfford}
                      className={`
                        relative flex flex-col md:flex-row items-center md:items-start p-2 rounded border transition-all duration-200 group h-full md:h-auto justify-center md:justify-start
                        ${isSelected 
                          ? 'bg-[#ffe082] border-[#ff6f00] shadow-md' 
                          : 'bg-[#fff8e1] border-[#d7ccc8] hover:bg-[#ffecb3] hover:border-[#a1887f]'}
                        ${!canAfford && 'opacity-50 grayscale cursor-not-allowed'}
                      `}
                    >
                      <div className={`mb-1 md:mb-0 md:mr-3 p-1 rounded-full ${isSelected ? 'text-[#e65100]' : 'text-[#5d4037]'}`}>
                        {getIcon(stats.type as TowerType)}
                      </div>
                      
                      <div className="flex flex-col items-center md:items-start w-full">
                        <div className="flex flex-col md:flex-row justify-between w-full md:mb-1 items-center md:items-start">
                          <span className="text-[10px] md:text-sm font-bold text-center md:text-left leading-tight md:leading-normal text-[#3e2723]">{stats.name}</span>
                          <span className="text-xs font-bold text-[#f57f17] mt-1 md:mt-0">{stats.cost}金</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
           </div>
         )}
      </div>

      {/* AI & Wave Control */}
      <div className="parchment-panel rounded p-3 md:p-4 md:col-span-3 flex flex-col gap-3 md:gap-4 order-3 relative">
        {/* Seal decoration */}
        <div className="absolute -top-3 -right-3 w-12 h-12 bg-[#b71c1c] rounded-full shadow-lg flex items-center justify-center text-[#ffecb3] border-4 border-[#880e4f] hidden md:flex">
            <Feather size={24} />
        </div>

        <div className="flex-1 flex flex-col min-h-[80px] md:min-h-[100px]">
           <div className="flex items-center justify-between text-[#3e2723] mb-2">
              <div className="flex items-center gap-2">
                <Feather size={16} />
                <span className="text-xs font-bold tracking-widest title-font">军师锦囊</span>
              </div>
              {isAdviceLoading && <span className="animate-pulse w-2 h-2 rounded-full bg-[#5d4037]"></span>}
           </div>
           
           <div className="flex-1 bg-[#fff8e1] rounded border border-[#d7ccc8] p-2 font-serif text-sm text-[#4e342e] shadow-inner overflow-hidden italic leading-relaxed">
              <p className="whitespace-pre-wrap">{advice}</p>
           </div>
        </div>

        <div className="mt-auto">
          {!gameState.isPlaying && !gameState.isGameOver ? (
             <button 
               onClick={onNextWave}
               className="btn-primary w-full font-bold py-3 px-4 rounded shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 title-font"
             >
               <Play size={18} fill="currentColor" /> 
               <span className="tracking-widest">敌军来袭</span>
             </button>
          ) : gameState.isGameOver ? (
            <button 
               onClick={onRestart}
               className="w-full bg-[#3e2723] hover:bg-[#5d4037] text-[#ffecb3] font-bold py-3 px-4 rounded flex items-center justify-center gap-2 border-2 border-[#8d6e63]"
             >
               <RefreshCw size={18} /> 重整旗鼓
             </button>
          ) : (
             <div className="w-full bg-[#d7ccc8] text-[#5d4037] font-bold py-3 px-4 rounded border border-[#a1887f] flex items-center justify-center gap-2 cursor-wait">
                <Sword size={18} className="animate-pulse" />
                <span className="text-xs tracking-widest">激战中...</span>
             </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Controls;
