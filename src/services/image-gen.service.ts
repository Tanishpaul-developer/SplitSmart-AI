
import { Injectable } from '@angular/core';
import { GoogleGenAI } from "@google/genai";

@Injectable({ providedIn: 'root' })
export class ImageGenService {
  private ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  async generateCategoryIcon(category: string): Promise<string | null> {
    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: `A professional, high-quality minimalist isometric 3D icon for a "${category}" expense. Clean lines, vibrant colors on a pure white background. Flat vector style.`,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/png'
        }
      });

      return `data:image/png;base64,${response.generatedImages[0].image.imageBytes}`;
    } catch (error) {
      console.error('Error generating image:', error);
      return null;
    }
  }
}
