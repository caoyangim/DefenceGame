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
      你是一款名为 "Gemini Defense" 的塔防游戏的战术顾问。
      
      当前状态:
      - 即将开始波次: ${gameState.wave + 1}
      - 生命值: ${gameState.lives}
      - 资金: ${gameState.money}
      - 当前防御塔: ${towerSummary || "无"}
      
      玩家即将面临新的一波进攻。
      分析他们的处境。他们是富有但防御薄弱吗？还是建造了太多基础炮台？
      
      请提供 1-2 句简洁的战术建议，或者对他们的防御布局进行机智/讽刺的点评。
      不要重复之前的建议："${previousAdvice}"。
      字数控制在 50 字以内。
      请扮演一位充满未来感的 AI 指挥官，使用中文回答。
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "系统初始化完成。祝你好运，指挥官。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "通讯链路不稳定。依靠你的直觉吧，指挥官。";
  }
};