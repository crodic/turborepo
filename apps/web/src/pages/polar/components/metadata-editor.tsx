import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface MetadataEntry {
  key: string
  value: string
}

interface MetadataEditorProps {
  entries: MetadataEntry[]
  onChange: (entries: MetadataEntry[]) => void
  disabled?: boolean
}

export function MetadataEditor({
  entries,
  onChange,
  disabled = false,
}: MetadataEditorProps) {
  const handleAdd = () => {
    onChange([...entries, { key: '', value: '' }])
  }

  const handleRemove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index))
  }

  const handleUpdate = (
    index: number,
    field: 'key' | 'value',
    newValue: string
  ) => {
    const updated = entries.map((entry, i) => {
      if (i === index) {
        return { ...entry, [field]: newValue }
      }
      return entry
    })
    onChange(updated)
  }

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-xs'>
          Key-value pairs to store custom attributes or integration IDs (e.g.{' '}
          <code>tier: pro</code>, <code>crm_id: 123</code>).
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleAdd}
          disabled={disabled || entries.length >= 50}
          className='h-7 text-xs'
        >
          <Plus className='mr-1 h-3 w-3' />
          Add Property
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className='text-muted-foreground/70 py-1 text-xs italic'>
          No custom metadata added yet.
        </p>
      ) : (
        <div className='max-h-48 space-y-2 overflow-y-auto pr-1'>
          {entries.map((entry, index) => (
            <div key={index} className='flex items-center gap-2'>
              <Input
                placeholder='Key (e.g. tier)'
                value={entry.key}
                disabled={disabled}
                onChange={(e) => handleUpdate(index, 'key', e.target.value)}
                className='h-8 w-1/3 font-mono text-xs'
                maxLength={40}
              />
              <Input
                placeholder='Value'
                value={entry.value}
                disabled={disabled}
                onChange={(e) => handleUpdate(index, 'value', e.target.value)}
                className='h-8 flex-1 text-xs'
                maxLength={500}
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={() => handleRemove(index)}
                disabled={disabled}
                className='text-destructive hover:bg-destructive/10 h-8 w-8'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function metadataEntriesToObject(
  entries: MetadataEntry[]
): Record<string, string> | undefined {
  const filtered = entries.filter((e) => e.key.trim().length > 0)
  if (filtered.length === 0) return undefined
  const obj: Record<string, string> = {}
  for (const entry of filtered) {
    obj[entry.key.trim()] = entry.value
  }
  return obj
}

export function objectToMetadataEntries(
  obj?: Record<string, any> | null
): MetadataEntry[] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: String(value ?? ''),
  }))
}
