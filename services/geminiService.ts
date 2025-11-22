import { GoogleGenAI } from "@google/genai";
import { CircuitState } from "../types";

const SYSTEM_INSTRUCTION = `
你是一位专业的初中物理竞赛教练，精通电路分析。
你现在不仅是一个对话助手，你的后台连接着一个实时的“电路实验室”模拟器。
用户会构建各种电路，其中可能包含电源、电阻、灯泡、开关、滑动变阻器、电流表和电压表。

你的任务是：
1. **分析电路结构**：根据用户提供的 JSON 数据（元件列表和连接关系），在脑海中重建电路图。
2. **排查故障**：如果用户说“为什么灯不亮”或“为什么短路”，请检查 JSON 数据中是否存在短路（电源两端直接相连）、断路（回路不闭合）或仪表接法错误（电流表并联、电压表串联）。
3. **教学指导**：当用户调整滑动变阻器询问功率变化时，运用欧姆定律 (I=U/R) 和功率公式 (P=UI, P=I²R) 进行定性或定量分析。
4. **鼓励探究**：不要直接给出答案，引导学生通过观察电流表、电压表的读数变化来得出结论。

在回答中：
- 使用 Markdown 格式。
- 如果发现电路连接严重错误（如电源短路），请优先警告用户。
- 公式请清晰展示。
`;

export const streamGeminiResponse = async (
  userMessage: string,
  history: { role: 'user' | 'model'; text: string }[],
  circuitContext?: CircuitState // Pass the current circuit state
) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Inject circuit state as context if available
    let prompt = userMessage;
    if (circuitContext) {
        const circuitSummary = JSON.stringify({
            components: circuitContext.components.map(c => ({ type: c.type, value: c.value, label: c.label, state: c.isOpen ? 'OPEN' : 'CLOSED' })),
            wires: circuitContext.wires.length,
            error: circuitContext.error
        });
        prompt = `[当前电路状态数据 JSON]: ${circuitSummary}\n\n用户问题: ${userMessage}`;
    }

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.5, // Lower temperature for more analytical responses
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }],
      })),
    });

    const resultStream = await chat.sendMessageStream({
      message: prompt,
    });

    return resultStream;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
