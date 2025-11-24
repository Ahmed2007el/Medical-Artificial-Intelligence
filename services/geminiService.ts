import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { SearchResult, Language } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async searchMedicalTerm(term: string, language: Language): Promise<SearchResult> {
    const langInstruction = language === Language.Arabic 
      ? "Respond in Arabic. Ensure medical terms are also provided in English in parentheses." 
      : "Respond in English.";

    const textPrompt = `
      You are an expert medical tutor. The user wants to understand the medical term: "${term}".
      
      ${langInstruction}
      
      Task:
      1. Provide a simple but scientifically accurate explanation.
      2. Provide 3-5 basic key points about this condition/term.
      3. List 2-3 reliable scientific sources (e.g., Mayo Clinic, NIH, WHO) where this information can be verified.
      
      Output Format:
      Provide ONLY valid JSON in the following format, with no extra text or markdown formatting:
      {
        "definition": "The simple explanation...",
        "keyPoints": ["Point 1", "Point 2", ...],
        "sources": ["Source Name 1", "Source Name 2"]
      }
    `;

    const imagePrompt = `Create a clear, professional medical illustration of: ${term}. reliable, anatomical style, white background, educational diagram, high quality.`;

    try {
      // Run text and image generation in parallel
      const [textResult, imageResult] = await Promise.allSettled([
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: textPrompt,
          config: {
            tools: [{ googleSearch: {} }],
          }
        }),
        this.ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: { parts: [{ text: imagePrompt }] },
          config: {
             // Defaults are usually fine for 1:1 aspect ratio
          }
        })
      ]);

      // Process Text
      let definition = "Definition not available.";
      let keyPoints: string[] = [];
      let sources: string[] = [];
      
      if (textResult.status === 'fulfilled') {
        const text = textResult.value.text || "";
        // Clean up potential markdown code blocks
        const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
        
        try {
          const data = JSON.parse(cleanText);
          definition = data.definition || definition;
          keyPoints = data.keyPoints || [];
          sources = data.sources || [];
        } catch (e) {
          console.error("Failed to parse JSON response:", cleanText);
          // Attempt to use raw text if JSON parse fails
          definition = cleanText; 
        }
      } else {
        console.error("Text generation failed:", textResult.reason);
        throw new Error("Failed to retrieve medical information.");
      }

      // Process Image
      let imageUrl = null;
      if (imageResult.status === 'fulfilled') {
        const response = imageResult.value;
        // Iterate through parts to find the image
        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
               imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
               break;
             }
          }
        }
      } else {
        console.warn("Image generation failed:", imageResult.reason);
      }

      // Fallback if image generation failed or returned no image
      if (!imageUrl) {
         imageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(term)}`;
      }

      return {
        term,
        definition,
        keyPoints,
        sources,
        imageUrl
      };

    } catch (error) {
      console.error("Gemini Search Error:", error);
      throw error;
    }
  }

  async chatAboutTerm(
    term: string, 
    history: { role: string; parts: { text: string }[] }[], 
    message: string,
    language: Language
  ): Promise<string> {
    
    const langContext = language === Language.Arabic ? "Answer in Arabic." : "Answer in English.";

    const systemInstruction = `
      You are a helpful medical assistant. The user is asking about the term: "${term}".
      Use your knowledge to answer follow-up questions simply and accurately based on reliable medical science.
      ${langContext}
      Keep answers concise (under 3 paragraphs).
    `;

    try {
      const chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemInstruction
        },
        history: history
      });

      const result: GenerateContentResponse = await chat.sendMessage({ message });
      return result.text || "I apologize, I could not generate a response.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      throw error;
    }
  }
}