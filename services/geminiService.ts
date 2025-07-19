
import { GoogleGenAI, Type } from "@google/genai";
import type { SubtitleSegment } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // The result includes the Base64 prefix, which we need to remove.
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error("Failed to read file as Base64 string."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  
  return {
    inlineData: {
      mimeType: file.type,
      data: base64EncodedData,
    },
  };
};

export const generateTranscription = async (file: File): Promise<SubtitleSegment[]> => {
    const model = 'gemini-2.5-flash';

    const prompt = `You are an expert audio transcriptionist specializing in creating readable subtitles. Your task is to transcribe the provided audio file with extreme accuracy and format it into subtitle segments.

    Generate a list of subtitle segments. Each segment must contain:
    1. A "start" timestamp in "HH:MM:SS,ms" format.
    2. An "end" timestamp in "HH:MM:SS,ms" format.
    3. The "text" of the transcription for that segment.
    
    **Important rules for the "text" field to ensure readability:**
    - Keep subtitle lines short, ideally one or two phrases per segment.
    - Avoid creating very long, multi-line text blocks within a single subtitle segment.
    - Break lines at natural pause points in the speech.
    - It is crucial to split longer sentences into smaller, coherent parts. Prefer to break lines before conjunctions (e.g., "and", "but", "or"), prepositions (e.g., "in", "on", "with"), or at the end of clauses.
    - Each subtitle segment should represent a short, digestible piece of information for the viewer.
    
    Ensure the timestamps are precise and the text is a faithful transcription of the speech in the audio.
    The output must be a valid JSON array matching the provided schema. Do not include any other text or explanations.`;

    const schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: {
            type: Type.STRING,
            description: "The start timestamp of the subtitle segment in HH:MM:SS,ms format (e.g., 00:00:01,234).",
          },
          end: {
            type: Type.STRING,
            description: "The end timestamp of the subtitle segment in HH:MM:SS,ms format (e.g., 00:00:03,456).",
          },
          text: {
            type: Type.STRING,
            description: "The transcribed text for the segment.",
          },
        },
        required: ["start", "end", "text"],
      },
    };
    
    try {
        const audioPart = await fileToGenerativePart(file);
        
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [ { text: prompt }, audioPart ] },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return result as SubtitleSegment[];

    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error && error.message.includes('API_KEY')) {
             throw new Error("API Key is invalid or missing. Please ensure it's configured correctly.");
        }
        throw new Error("Failed to generate transcription. The AI model may not be able to process this file type or content. Please try a different file.");
    }
};
