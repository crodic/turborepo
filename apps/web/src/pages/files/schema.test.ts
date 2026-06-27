import { describe, expect, it } from 'vitest'
import { createFolderSchema, fileSchema, folderSchema } from './schema'

describe('fileSchema', () => {
  it('parses file metadata from the API', () => {
    expect(
      fileSchema.parse({
        id: '1',
        public_id: 'abc123',
        folder: null,
        original_name: 'photo.png',
        path: 'storage/public/image/abc123.png',
        hash: 'hash',
        mime: 'image/png',
        size: 1024,
        width: 200,
        height: 100,
        duration: null,
        resource_type: 'image',
        status: 'active',
        url: 'http://localhost/storage/uploads/image/abc123.png',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual(
      expect.objectContaining({
        public_id: 'abc123',
        folder: null,
        width: 200,
        height: 100,
      })
    )
  })
})

describe('folderSchema', () => {
  it('parses folder summaries', () => {
    expect(
      folderSchema.parse({
        folder: 'avatars',
        count: 2,
        size: 4096,
      })
    ).toEqual({ folder: 'avatars', count: 2, size: 4096 })
  })

  it('validates flat folder names', () => {
    expect(createFolderSchema.parse({ folder: '  Ảnh test_2026  ' })).toEqual({
      folder: 'Ảnh test_2026',
    })

    expect(() => createFolderSchema.parse({ folder: 'Video 1/raw' })).toThrow()
    expect(() => createFolderSchema.parse({ folder: '../private' })).toThrow()
  })
})
