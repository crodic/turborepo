import { useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface EmailPreviewProps {
  html: string
}

export function EmailPreview({ html }: EmailPreviewProps) {
  const { t } = useTranslation()
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  return (
    <Tabs defaultValue='preview' className='w-full'>
      <div className='mb-4 flex items-center justify-between'>
        <TabsList>
          <TabsTrigger value='preview'>
            {t('emailLogs.show.preview')}
          </TabsTrigger>
          <TabsTrigger value='source'>
            {t('emailLogs.show.sourceCode')}
          </TabsTrigger>
        </TabsList>

        <div className='flex items-center gap-2'>
          <Button
            variant={device === 'desktop' ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => setDevice('desktop')}
          >
            <Monitor size={16} className='mr-2' />
            Desktop
          </Button>
          <Button
            variant={device === 'mobile' ? 'secondary' : 'ghost'}
            size='sm'
            onClick={() => setDevice('mobile')}
          >
            <Smartphone size={16} className='mr-2' />
            Mobile
          </Button>
        </div>
      </div>

      <TabsContent value='preview' className='mt-0'>
        <div className='bg-muted/30 flex min-h-[500px] justify-center overflow-hidden rounded-md border p-4'>
          <div
            className={`h-[600px] overflow-hidden rounded border bg-white shadow-sm transition-all duration-300 ease-in-out ${
              device === 'mobile' ? 'w-[375px]' : 'w-full'
            }`}
          >
            <iframe
              title='Email Preview'
              srcDoc={html}
              className='h-full w-full border-0'
              sandbox='allow-same-origin'
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value='source' className='mt-0'>
        <div className='bg-muted/50 max-h-[600px] min-h-[500px] overflow-auto rounded-md border p-4'>
          <pre className='text-foreground/80 font-mono text-sm break-all whitespace-pre-wrap'>
            {html}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  )
}
