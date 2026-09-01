/**
 * Downloads a file from a URL (e.g. Firebase Storage) and returns it as base64.
 */
export async function fetchRemoteFileAsBase64(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }

  const contentType =
    response.headers.get('content-type') || 'application/pdf';

  const buffer = await response.arrayBuffer();

  return {
    base64: Buffer.from(buffer).toString('base64'),
    contentType,
  };
}
