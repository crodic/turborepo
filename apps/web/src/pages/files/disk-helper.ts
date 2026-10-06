import i18n from '@/i18n'
import type { FileSchema } from './schema'

/**
 * Checks if a file has private access.
 * Returns true if visibility is private or disk is local / s3-private.
 */
export function isFilePrivate(
  file?: Pick<FileSchema, 'disk' | 'visibility'> | null
): boolean {
  if (!file) {
    return false
  }

  if (file.visibility === 'private') {
    return true
  }

  if (file.disk === 'local' || file.disk === 's3-private') {
    return true
  }

  return false
}

/**
 * Returns a user-friendly localized label for a storage disk.
 */
export function getFileDiskLabel(
  disk?: string | null,
  isPrivate?: boolean
): string {
  switch (disk) {
    case 's3':
      return i18n.t('files.disk.s3', 'S3 (Public)')
    case 's3-private':
      return i18n.t('files.disk.s3Private', 'S3 (Private)')
    case 'local':
      return i18n.t('files.disk.local', 'Private')
    case 'public':
      return i18n.t('files.disk.public', 'Public')
    default:
      if (isPrivate) {
        return i18n.t('files.disk.local', 'Private')
      }
      return i18n.t('files.disk.public', 'Public')
  }
}

/**
 * Returns the appropriate tooltip explaining the disk access scope.
 */
export function getFileDiskTooltip(
  disk?: string | null,
  isPrivate?: boolean
): string {
  if (isPrivate || disk === 'local' || disk === 's3-private') {
    return i18n.t('files.disk.localTooltip')
  }

  return i18n.t('files.disk.publicTooltip')
}
