import { upload } from '@vercel/blob/client';
import type { SubtitleSegment } from '../types';

export const generateTranscription = async (file: File): Promise<SubtitleSegment[]> => {
    if (!file) {
        throw new Error("No file provided for transcription.");
    }

    let uploadedBlob;

    try {
        // Step 1: Upload the file to Vercel Blob storage.
        // The `upload` function handles the entire process:
        // 1. It calls our `/api/upload` endpoint to get a signed URL.
        // 2. It uploads the file directly to the blob store using that URL.
        // This bypasses the serverless function payload limit.
        uploadedBlob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload', // Our new serverless function
        });
        
    } catch(error) {
        console.error("Vercel Blob upload failed:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to upload file. Please try again. (${error.message})`);
        }
        throw new Error("An unknown error occurred during file upload.");
    }
    
    // At this point, the file is in Vercel's blob store.
    // The `uploadedBlob` object contains the public URL (`url`).
    try {
        // Step 2: Call our generation API with the URL of the uploaded file.
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mimeType: file.type,
                // Pass the public URL of the file from Vercel Blob
                downloadUrl: uploadedBlob.url, 
            }),
        });
        
        const result = await response.json();

        if (!response.ok) {
            const errorMessage = result.error || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return result as SubtitleSegment[];

    } catch (error) {
        console.error("Transcription generation failed:", error);
        if (error instanceof Error) {
            // Avoid nesting error messages if it's our own thrown error.
            if (error.message.startsWith('Request failed')) {
                throw error;
            }
            throw new Error(`Failed to generate transcription. Please try again. (${error.message})`);
        }
        throw new Error("An unknown error occurred during transcription.");
    }
};