import { GoogleGenAI } from "@google/genai";
import { Lead, SearchParams } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to parse JSON from model output which might contain Markdown formatting
 */
const cleanAndParseJSON = (text: string): any => {
  try {
    // 1. Try to find a markdown code block containing JSON
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1]);
      } catch (e) {
        // If parsing the block fails, fall through to other methods
      }
    }

    // 2. If no block or block failed, find the first '{' and last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonString = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonString);
    }

    // 3. Last resort: Clean cleanup and parse whole string
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    cleanText = cleanText.trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse failed for text:", text);
    return null;
  }
};

/**
 * Step 1: Search for candidates using Google Maps Grounding (Flash model for speed)
 * Note: We cannot use responseMimeType: 'application/json' with Google Maps tool.
 * Workaround: We ask for a list in text, then use a second call to structure it into JSON.
 */
export const searchCandidatesOnMaps = async (params: SearchParams): Promise<Partial<Lead>[]> => {
  const query = `${params.productKeyword} ${params.buyerType} in ${params.targetCity ? params.targetCity + ', ' : ''}${params.targetCountry}`;
  
  try {
    // 1. Discovery (Grounding)
    const groundingResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find 5-10 potential business leads for an exporter. 
      Query: "${query}". 
      List the following details for each business found: Name, Address, City, Country, Rating.`,
      config: {
        tools: [{ googleMaps: {} }],
        // responseMimeType is NOT supported with Maps tool
      },
    });

    const groundingText = groundingResponse.text;
    if (!groundingText) return [];

    // 2. Extraction (Text -> JSON)
    const extractionResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract the business details from the text below into a JSON array.
      
      Text:
      ${groundingText}
      
      Output schema:
      [
        {
          "name": "string",
          "address": "string",
          "city": "string",
          "country": "string",
          "rating": number (or null)
        }
      ]
      
      Return ONLY the JSON.`,
      config: {
        responseMimeType: "application/json", // Allowed here as no tools are used
      },
    });

    if (extractionResponse.text) {
      const data = JSON.parse(extractionResponse.text);
      
      // Attempt to enrich with Maps URIs from grounding chunks
      const chunks = groundingResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      return data.map((item: any, index: number) => {
        // Try to find a chunk matching the name
        const matchingChunk = chunks.find((c: any) => 
            c.maps?.title && item.name && c.maps.title.toLowerCase().includes(item.name.toLowerCase())
        );

        return {
          ...item,
          id: `map-${Date.now()}-${index}`,
          source_tags: ['maps'],
          maps_url: matchingChunk?.maps?.uri
        };
      });
    }
    return [];
  } catch (error) {
    console.error("Maps Search Error:", error);
    // Return empty array to allow the app to handle "no results" or partial failures gracefully
    return [];
  }
};

/**
 * Step 2: Analyze a single candidate using Gemini Pro Thinking Mode + Google Search
 * We use Thinking Mode to deduce the fit score and plan the research strategy.
 * We use Google Search to find their social media and website if not in Maps.
 */
export const analyzeLeadWithThinking = async (
  candidate: Partial<Lead>, 
  params: SearchParams
): Promise<Lead> => {
  const prompt = `
    You are an expert export consultant. Analyze this potential buyer:
    
    Name: ${candidate.name}
    Address: ${candidate.address}
    Location: ${candidate.city}, ${candidate.country}
    
    Context:
    - Exporter sells: ${params.productKeyword}
    - Target: ${params.buyerType}
    - Language: ${params.languagePreference}

    Your Task:
    1. Use Google Search to find their official website, LinkedIn, Instagram, and Facebook.
    2. Analyze if they deal with ${params.productKeyword} or related goods.
    3. Determine the Buyer Type (Importer, Distributor, Retailer, etc.).
    4. Calculate a Fit Score (1-5) based on relevance to the exporter.
    5. Write a summary in ${params.languagePreference}.
    6. Suggest a concrete next action.

    Return the result strictly in JSON format with these keys:
    {
      "buyer_type_detected": "string",
      "product_focus": "string",
      "fit_score": number,
      "website_url": "string (or null)",
      "email": "string (or null)",
      "instagram_url": "string (or null)",
      "linkedin_url": "string (or null)",
      "facebook_url": "string (or null)",
      "ai_summary": "string",
      "next_action_suggestion": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for complex reasoning
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        // responseMimeType: "application/json" is NOT supported with Search tool
        thinkingConfig: { thinkingBudget: 2048 }, 
      },
    });

    if (response.text) {
      const analysis = cleanAndParseJSON(response.text);
      if (!analysis) throw new Error("Failed to parse analysis JSON");
      
      // Merge analysis with candidate data
      return {
        ...candidate,
        ...analysis,
        source_tags: [...(candidate.source_tags || []), 'search', 'ai_analysis'],
      } as Lead;
    }
    
    throw new Error("Empty analysis response");
  } catch (error) {
    console.error(`Analysis Error for ${candidate.name}:`, error);
    // Return the candidate with basic data and error indicators if AI fails
    return {
      ...candidate,
      id: candidate.id || `err-${Date.now()}`,
      buyer_type_detected: "Unknown",
      product_focus: "Analysis Failed",
      fit_score: 0,
      ai_summary: "AI analysis failed temporarily.",
      next_action_suggestion: "Manual verification required.",
      source_tags: ['maps', 'error'],
      country: candidate.country || params.targetCountry,
      city: candidate.city || params.targetCity || "Unknown",
      name: candidate.name || "Unknown Candidate"
    } as Lead;
  }
};

/**
 * Chatbot helper using Gemini Pro
 */
export const chatWithGemini = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        history: history,
        config: {
            systemInstruction: "You are a helpful export assistant. Answer questions about international trade, finding buyers, and logistics.",
        }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
}
