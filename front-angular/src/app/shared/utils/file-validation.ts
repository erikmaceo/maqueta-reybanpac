export const MAX_BULK_FILE_SIZE = 3 * 1024 * 1024; // 3 MB (prueba)

export function validateBulkFileSize(file: File | null): { valid: boolean; message?: string } {
  if (!file) {
    return { valid: false, message: 'No se ha seleccionado ningún archivo.' };
  }
  if (file.size > MAX_BULK_FILE_SIZE) {
    return {
      valid: false,
      message: 'El archivo no debe superar los 10 MB.',
    };
  }
  return { valid: true };
}
