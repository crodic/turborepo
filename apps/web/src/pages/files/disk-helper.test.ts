import { describe, expect, it } from 'vitest'
import {
  getFileDiskLabel,
  getFileDiskTooltip,
  isFilePrivate,
} from './disk-helper'
import type { FileSchema } from './schema'

describe('disk-helper', () => {
  describe('isFilePrivate', () => {
    it('returns true when visibility is private', () => {
      expect(
        isFilePrivate({ visibility: 'private', disk: 's3' } as FileSchema)
      ).toBe(true)
    })

    it('returns true when disk is local', () => {
      expect(isFilePrivate({ disk: 'local' } as FileSchema)).toBe(true)
    })

    it('returns true when disk is s3-private', () => {
      expect(isFilePrivate({ disk: 's3-private' } as FileSchema)).toBe(true)
    })

    it('returns false when disk is public or s3', () => {
      expect(isFilePrivate({ disk: 'public' } as FileSchema)).toBe(false)
      expect(isFilePrivate({ disk: 's3' } as FileSchema)).toBe(false)
    })

    it('returns false for undefined or null', () => {
      expect(isFilePrivate(null)).toBe(false)
      expect(isFilePrivate(undefined)).toBe(false)
    })
  })

  describe('getFileDiskLabel', () => {
    it('returns S3 (Public) for s3 disk', () => {
      expect(getFileDiskLabel('s3')).toContain('S3')
    })

    it('returns S3 (Private) for s3-private disk', () => {
      expect(getFileDiskLabel('s3-private')).toContain('S3')
    })

    it('returns Private for local disk', () => {
      expect(getFileDiskLabel('local')).toBeDefined()
    })

    it('returns Public for public disk', () => {
      expect(getFileDiskLabel('public')).toBeDefined()
    })
  })

  describe('getFileDiskTooltip', () => {
    it('returns appropriate tooltip for private vs public', () => {
      expect(getFileDiskTooltip('s3-private')).toBeDefined()
      expect(getFileDiskTooltip('s3')).toBeDefined()
    })
  })
})
