import type { CSSProperties } from 'react'
import {
  BarChart3Icon,
  CreditCardIcon,
  MailIcon,
  UsersIcon,
} from 'lucide-react'
import {
  THEME_STYLE_KEYS,
  type ThemeMode,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function toCssVariables(styles: ThemeStyles, mode: ThemeMode): CSSProperties {
  return Object.fromEntries(
    THEME_STYLE_KEYS.map((key) => [`--${key}`, styles[mode][key]])
  ) as CSSProperties
}

export function ThemePreview({
  styles,
  mode,
  className,
}: {
  styles: ThemeStyles
  mode: ThemeMode
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-background text-foreground h-full min-h-[520px] overflow-hidden rounded-lg border',
        mode === 'dark' && 'dark',
        className
      )}
      style={toCssVariables(styles, mode)}
    >
      <div className='border-border bg-card/80 flex items-center justify-between border-b px-5 py-4'>
        <div>
          <p className='text-sm font-medium'>Live Preview</p>
          <p className='text-muted-foreground text-xs'>
            Components using the selected theme tokens.
          </p>
        </div>
        <Button size='sm'>Primary action</Button>
      </div>

      <Tabs defaultValue='dashboard' className='h-[calc(100%-73px)]'>
        <div className='border-border border-b px-5 py-3'>
          <TabsList>
            <TabsTrigger value='dashboard'>Dashboard</TabsTrigger>
            <TabsTrigger value='cards'>Cards</TabsTrigger>
            <TabsTrigger value='palette'>Palette</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='dashboard' className='m-0 h-full overflow-auto p-5'>
          <div className='grid gap-4 md:grid-cols-4'>
            {[
              ['Revenue', '$42,890', BarChart3Icon],
              ['Customers', '12,402', UsersIcon],
              ['Payments', '98.2%', CreditCardIcon],
              ['Messages', '1,284', MailIcon],
            ].map(([label, value, Icon]) => (
              <Card key={label as string}>
                <CardContent className='flex items-center gap-3 p-4'>
                  <div className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-md'>
                    <Icon className='size-5' />
                  </div>
                  <div>
                    <p className='text-muted-foreground text-sm'>
                      {label as string}
                    </p>
                    <p className='text-xl font-semibold'>{value as string}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className='mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]'>
            <Card>
              <CardHeader>
                <CardTitle>Team activity</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {[
                  'New order received',
                  'Admin role updated',
                  'Email campaign scheduled',
                ].map((item) => (
                  <div
                    key={item}
                    className='border-border bg-muted/40 flex items-center justify-between rounded-md border p-3'
                  >
                    <span className='text-sm'>{item}</span>
                    <span className='text-muted-foreground text-xs'>
                      Just now
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Message</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='bg-muted rounded-md p-3 text-sm'>
                  Your theme is applied across cards, inputs, borders, charts
                  and sidebar tokens.
                </div>
                <Button variant='outline' className='w-full'>
                  Secondary action
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='cards' className='m-0 h-full overflow-auto p-5'>
          <div className='grid gap-4 md:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Form sample</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='border-input bg-background text-muted-foreground rounded-md border px-3 py-2 text-sm'>
                  customer@example.com
                </div>
                <div className='border-input bg-background h-24 rounded-md border p-3 text-sm'>
                  A calm preview textarea with your theme colors.
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Alert sample</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='border-primary/20 bg-primary/10 text-primary rounded-md border p-4 text-sm'>
                  This block uses primary color tokens from your theme.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='palette' className='m-0 h-full overflow-auto p-5'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {[
              'background',
              'foreground',
              'primary',
              'secondary',
              'muted',
              'accent',
              'destructive',
              'border',
              'ring',
            ].map((token) => (
              <div key={token} className='border-border rounded-md border p-3'>
                <div
                  className='mb-3 h-12 rounded-md border'
                  style={{ background: `var(--${token})` }}
                />
                <p className='font-mono text-xs'>--{token}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
