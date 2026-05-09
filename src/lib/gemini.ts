import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export async function summarizeAudio(text: string, summaryType: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `Eres un asistente inteligente para resumir reuniones y notas de voz.
  El siguiente texto es una transcripción de voz a texto.
  
  Tarea 1: Corrige los errores gramaticales y pule el texto para que sea claro y coherente (Transcripción Mejorada).
  Tarea 2: Proporciona el resumen del texto. El formato del resumen debe ser de tipo: ${summaryType}.
  
  Formatea tu respuesta como un objeto JSON:
  {
    "refined": "la transcripción pulida y corregida",
    "summary": "el resumen generado con los puntos principales o según el tipo solicitado"
  }
  
  Transcripción: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return { refined: text, summary: "Resumen fallido" };
  }
}

export async function generateSessionNotes(transcript: string) {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = `Analiza esta transcripción de audio y extrae las acciones (to-dos) e información clave. Preséntalos en 3-5 viñetas concisas. Todo tu análisis debe estar en español.
  
  Transcripción: "${transcript}"`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "No se pudo generar el análisis.";
  }
}
