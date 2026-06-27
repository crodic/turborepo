export const FILE_FOLDER_NAME_PATTERN =
  /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,254}$/u;

export const FILE_FOLDER_NAME_MESSAGE =
  'Folder name must be a single folder, start with a letter or number, and only contain letters, numbers, spaces, dots, underscores, or hyphens.';

export function normalizeFolderName(folder?: string | null): string | null {
  if (folder == null) {
    return null;
  }

  const normalized = folder.trim();
  return normalized.length > 0 ? normalized : null;
}

export function isValidFolderName(folder: string): boolean {
  return FILE_FOLDER_NAME_PATTERN.test(folder);
}
