import type { H3Event } from 'h3';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface MultipartResult {
  fields: Record<string, string>;
  fileBuffer: Buffer;
}

export async function readMultipartWithValidation(
  event: H3Event,
  requiredFields: string[]
): Promise<MultipartResult> {
  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'Missing form data' });
  }

  const fields: Record<string, string> = {};
  let fileBuffer: Buffer | null = null;

  for (const part of formData) {
    if (part.name === 'file' && part.filename) {
      if (part.data.length > MAX_FILE_SIZE) {
        throw createError({
          statusCode: 413,
          statusMessage: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        });
      }
      fileBuffer = part.data;
    } else if (part.name) {
      fields[part.name] = part.data.toString('utf-8');
    }
  }

  if (!fileBuffer) {
    throw createError({ statusCode: 400, statusMessage: 'Missing file' });
  }

  for (const field of requiredFields) {
    if (!fields[field]) {
      throw createError({ statusCode: 400, statusMessage: `Missing required field: ${field}` });
    }
  }

  return { fields, fileBuffer };
}
