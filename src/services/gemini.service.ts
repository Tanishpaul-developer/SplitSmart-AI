
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  async scanReceipt(base64Image: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: "Detailed receipt extraction. Identify merchant, total, currency (code), tax, tips, service fees, and individual items with names and prices. Categorize the whole receipt into one of: Food, Transport, Accommodation, Entertainment, Other." }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              merchant: { type: Type.STRING },
              total: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              tax: { type: Type.NUMBER },
              tip: { type: Type.NUMBER },
              service_fee: { type: Type.NUMBER, description: "Extract any explicit service charge or fee separately from tax." },
              category: { type: Type.STRING, description: "One of: Food, Transport, Accommodation, Entertainment, Other" },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    price: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error("Gemini Error:", error);
      return null;
    }
  }
}
