import { handleUpload } from '@vercel/blob/client';

// This is a Vercel Edge Function
export const config = {
  runtime: 'edge',
};

// The client-side `upload` function from `@vercel/blob/client` will call this endpoint.
// It is responsible for generating a secure, signed URL for the client to upload the file to.
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // This function runs on the server BEFORE a signed URL is generated.
      // It allows us to set permissions and content types.
      onBeforeGenerateToken: async (pathname) => {
        return {
          // Allow any audio or video file type.
          allowedContentTypes: ['audio/*', 'video/*'],
        };
      },
      // This function runs on the server AFTER the client has successfully uploaded the file.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('File upload completed!', blob.url);
      },
    });

    // `handleUpload` returns a JSON response that the client uploader understands.
    return new Response(JSON.stringify(jsonResponse), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    const message = (error as Error).message || 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: message }), { 
      status: 400, // The client library expects a 400 response on error
      headers: { 'Content-Type': 'application/json' }
    });
  }
}