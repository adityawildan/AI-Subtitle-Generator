import type { SubtitleSegment } from '../types';

// Helper to read file as Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        // Result is a Data URL: "data:image/png;base64,iVBORw0KGgo..."
        // We only want the Base64 part after the comma.
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error("Failed to read file as Base64 string."));
        }
    };
    reader.onerror = error => reject(error);
  });
};


export const generateTranscription = async (file: File): Promise<SubtitleSegment[]> => {
    try {
        const base64Data = await fileToBase64(file);

        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mimeType: file.type,
                data: base64Data,
            }),
        });
        
        const result = await response.json();

        if (!response.ok) {
            // Use the error message from the serverless function if available
            const errorMessage = result.error || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return result as SubtitleSegment[];

    } catch (error) {
        console.error("Transcription generation failed:", error);
        // Re-throw a more user-friendly error message.
        // The original error might be a network error or a JSON parsing error.
        if (error instanceof Error) {
            throw new Error(`Failed to generate transcription. Please try again. (${error.message})`);
        }
        throw new Error("An unknown error occurred during transcription.");
    }
};