import { useTranslation } from 'react-i18next'
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

function renderValue(value: any) {
  if (value === null || value === undefined)
    return <span className='text-gray-400'>-</span>

  if (typeof value === 'object') {
    return (
      <pre className='rounded p-2 text-sm whitespace-pre-wrap text-gray-400'>
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span>{String(value)}</span>
}

export default function LogTable({
  oldValue = {},
  newValue = {},
}: ChangesTableProps) {
  const { t } = useTranslation()
  const allKeys = Array.from(
    new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  ).filter((key) => !IGNORE_KEYS.includes(key))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('activityLogs.show.field')}</TableHead>
          <TableHead>{t('activityLogs.show.old')}</TableHead>
          <TableHead>{t('activityLogs.show.new')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allKeys.map((key) => {
          const oldVal = oldValue[key]
          const newVal = newValue[key]
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal)

          return (
            <TableRow key={key} className={changed ? 'bg-accent' : ''}>
              <TableCell className='font-medium'>{key}</TableCell>
              <TableCell>{renderValue(oldVal)}</TableCell>
              <TableCell>{renderValue(newVal)}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
