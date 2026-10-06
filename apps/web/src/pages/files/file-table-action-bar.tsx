'use client'

import * as React from 'react'
import type { Table } from '@tanstack/react-table'
import { Download, Trash2, X } from 'lucide-react'
import {
  ActionBar,
  ActionBarClose,
  ActionBarGroup,
  ActionBarItem,
  ActionBarSelection,
  ActionBarSeparator,
} from '@/components/ui/action-bar'
import { type FileSchema } from './schema'

interface FilesTableActionBarBarProps {
  table: Table<FileSchema>
  onDelete: (files: FileSchema[]) => void
  onBulkDownload?: (files: FileSchema[]) => void
  disabled?: boolean
}

export function FilesTableActionBar({
  table,
  onDelete,
  onBulkDownload,
  disabled = false,
}: FilesTableActionBarBarProps) {
  const rows = table.getFilteredSelectedRowModel().rows

  const onOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        table.toggleAllRowsSelected(false)
      }
    },
    [table]
  )

  return (
    <ActionBar open={rows.length > 0} onOpenChange={onOpenChange}>
      <ActionBarSelection>
        <span className='font-medium'>{rows.length}</span>
        <span>selected</span>
        <ActionBarSeparator />
        <ActionBarClose>
          <X />
        </ActionBarClose>
      </ActionBarSelection>
      <ActionBarSeparator />
      <ActionBarGroup>
        {onBulkDownload && (
          <ActionBarItem
            onClick={() => onBulkDownload(rows.map((row) => row.original))}
            disabled={disabled}
          >
            <Download />
            Download
          </ActionBarItem>
        )}
        <ActionBarItem
          variant='destructive'
          onClick={() => onDelete(rows.map((row) => row.original))}
          disabled={disabled}
        >
          <Trash2 />
          Delete
        </ActionBarItem>
      </ActionBarGroup>
    </ActionBar>
  )
}
