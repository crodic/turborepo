import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ChangesTableProps {
  oldValue?: Record<string, any>
  newValue?: Record<string, any>
}

const IGNORE_KEYS = ['createdAt', 'updatedAt', 'password']

function renderValue(value: any, isOld: boolean, isChanged: boolean) {
  if (value === null || value === undefined)
    return <span className='text-muted-foreground italic'>null</span>

  if (typeof value === 'object') {
    return (
      <div className='bg-muted/50 max-w-sm overflow-auto rounded-md p-3 text-xs'>
        <pre className='text-foreground/80 font-mono whitespace-pre-wrap'>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    )
  }

  const strValue = String(value)

  if (isChanged) {
    if (isOld) {
      return (
        <span className='bg-destructive/10 text-destructive rounded px-1.5 py-0.5 line-through'>
          {strValue}
        </span>
      )
    }
    return (
      <span className='rounded bg-green-500/10 px-1.5 py-0.5 font-medium text-green-600 dark:text-green-500'>
        {strValue}
      </span>
    )
  }

  return <span>{strValue}</span>
}

export default function LogTable({
  oldValue = {},
  newValue = {},
}: ChangesTableProps) {
  const { t } = useTranslation()
  const [showOnlyChanges, setShowOnlyChanges] = useState(false)

  const allKeys = Array.from(
    new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  ).filter((key) => !IGNORE_KEYS.includes(key))

  const rows = allKeys.map((key) => {
    const oldVal = oldValue[key]
    const newVal = newValue[key]
    const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal)

    return { key, oldVal, newVal, changed }
  })

  const displayRows = showOnlyChanges ? rows.filter((row) => row.changed) : rows

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-end space-x-2 pb-2'>
        <Switch
          id='show-changes'
          checked={showOnlyChanges}
          onCheckedChange={setShowOnlyChanges}
        />
        <Label
          htmlFor='show-changes'
          className='text-muted-foreground cursor-pointer text-sm'
        >
          Chỉ hiển thị thay đổi
        </Label>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead className='w-[200px] font-semibold'>
                {t('activityLogs.show.field')}
              </TableHead>
              <TableHead className='font-semibold'>
                {t('activityLogs.show.old')}
              </TableHead>
              <TableHead className='font-semibold'>
                {t('activityLogs.show.new')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className='text-muted-foreground py-6 text-center italic'
                >
                  Không có dữ liệu thay đổi nào.
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map(({ key, oldVal, newVal, changed }) => (
                <TableRow key={key} className={changed ? 'bg-muted/10' : ''}>
                  <TableCell className='text-foreground py-4 align-top font-medium'>
                    {key}
                  </TableCell>
                  <TableCell className='py-4 align-top'>
                    {renderValue(oldVal, true, changed)}
                  </TableCell>
                  <TableCell className='py-4 align-top'>
                    {renderValue(newVal, false, changed)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
