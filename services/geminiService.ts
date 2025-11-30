
import { GoogleGenAI } from "@google/genai";
import { GameState, Tower } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTacticalAdvice = async (
  gameState: GameState,
  towers: Tower[],
  previousAdvice: string
): Promise<string> => {
  try {
    const towerSummary = towers.map(t => t.name).join(', ');
    const prompt = `
      你是一款古代战争塔防游戏的“皇家首席战略顾问”。
      
      当前王国战况:
      - 即将面临波次: ${gameState.wave + 1}
      - 城堡耐久: ${gameState.lives}
      - 国库黄金: ${gameState.money}
      - 现有防御工事: ${towerSummary || "无"}
      
      敌人正在集结。
      分析陛下的防御布局。他们是富甲一方但防守空虚？还是过度依赖弓箭手？
      
      请提供 1-2 句简洁的战略建议。
      不要重复之前的建议："${previousAdvice}"。
      字数控制在 50 字以内。
      请使用古风、庄重的语气（称呼玩家为“陛下”、“吾王”或“领主大人”）。
      例如：“陛下，兽人皮糙肉厚，亟需法师塔的奥术力量。”
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "陛下，微臣正在观星象，请稍候。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "斥候来报，前方战事不明。请陛下自行决断。";
  }
};
