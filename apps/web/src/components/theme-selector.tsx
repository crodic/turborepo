'use client'

import { Check } from 'lucide-react'
import { themeColors } from '@/lib/theme-colors'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeSelector() {
  const { setColorKey, colorKey } = useTheme()

  return (
    <div className='flex flex-wrap gap-2'>
      {Object.entries(themeColors).map(([key, val]) => (
        <Button
          key={key}
          onClick={() => setColorKey(key as keyof typeof themeColors)}
          size='icon'
          className={cn(
            'relative rounded-full transition-all duration-200',
            colorKey === key
              ? 'ring-foreground scale-110 ring-2'
              : 'opacity-80 hover:opacity-100'
          )}
          style={{
            backgroundColor: val.light['--primary'],
          }}
          title={key}
        >
          {colorKey === key && (
            <Check className='absolute inset-0 m-auto h-4 w-4 text-white drop-shadow' />
          )}
        </Button>
      ))}
    </div>
  )
}
