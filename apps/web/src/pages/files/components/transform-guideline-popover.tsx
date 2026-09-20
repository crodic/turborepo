import { BookOpen, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

export function TransformGuidelinePopover() {
  const { t } = useTranslation()

  return (
    <Popover modal>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='text-primary hover:text-primary hover:bg-primary/10 h-6 gap-1 rounded-lg px-2 text-[11px] font-medium'
        >
          <HelpCircle className='size-3.5' />
          <span>{t('files.transform.guideline', 'Guideline')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side='left'
        align='start'
        className='w-80 overflow-hidden rounded-xl p-0 shadow-xl sm:w-96'
        onWheel={(e) => e.stopPropagation()}
      >
        <ScrollArea className='h-95 max-h-[75vh] p-4'>
          <div className='space-y-3 pr-1 text-xs'>
            <div className='border-border/60 border-b pb-2'>
              <div className='text-foreground flex items-center gap-1.5 text-sm font-semibold'>
                <BookOpen className='text-primary size-4' />
                <span>
                  {t('files.transform.guideline', 'Parameter Guideline')}
                </span>
              </div>
              <p className='text-muted-foreground mt-0.5 text-[11px]'>
                {t(
                  'files.transform.guidelineDesc',
                  'Reference guide for image transformation parameters and limits supported by the server.'
                )}
              </p>
            </div>

            {/* Dimensions */}
            <div className='space-y-1.5'>
              <div className='text-foreground flex items-center justify-between font-semibold'>
                <span>
                  {t('files.transform.dimensionsTitle', 'Dimensions')}
                </span>
                <span className='text-muted-foreground font-mono text-[11px]'>
                  w_*, h_*
                </span>
              </div>
              <div className='bg-muted/40 border-border/60 space-y-1 rounded-lg border p-2 text-[11px]'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {t('files.transform.widthHeight', 'Width / Height:')}
                  </span>
                  <span className='text-foreground font-medium'>
                    1 → 4000 px
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {t('files.transform.autoLabel', 'Auto:')}
                  </span>
                  <span className='text-foreground font-medium'>
                    {t('files.transform.autoDesc', 'Blank or 0')}
                  </span>
                </div>
              </div>
            </div>

            {/* Cropping */}
            <div className='space-y-1.5'>
              <div className='text-foreground flex items-center justify-between font-semibold'>
                <span>{t('files.transform.cropTitle', 'Crop Mode')}</span>
                <span className='text-muted-foreground font-mono text-[11px]'>
                  c_*
                </span>
              </div>
              <div className='bg-muted/40 border-border/60 space-y-1.5 rounded-lg border p-2 text-[11px]'>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    fill:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.cropFill',
                      'Resize & crop to exact box (default)'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    fit:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.cropFit',
                      'Fit within box, keep aspect ratio'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    cover:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.cropCover',
                      'Cover entire box, crop overflow'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    limit:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.cropLimit',
                      'Only downscale large images, never enlarge'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    pad:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.cropPad',
                      'Add borders/padding if needed'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    thumb:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.cropThumb',
                      'Smart crop focused on center subject'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quality & Format */}
            <div className='space-y-1.5'>
              <div className='text-foreground flex items-center justify-between font-semibold'>
                <span>
                  {t('files.transform.qualityTitle', 'Quality & Format')}
                </span>
                <span className='text-muted-foreground font-mono text-[11px]'>
                  q_*, f_*
                </span>
              </div>
              <div className='bg-muted/40 border-border/60 space-y-1 rounded-lg border p-2 text-[11px]'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {t('files.transform.quality', 'Quality')}:
                  </span>
                  <span className='text-foreground font-medium'>
                    1 → 100 (
                    {t('files.transform.qualityHint', 'optimal: 75 - 85')})
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    {t('files.transform.formatsLabel', 'Formats:')}
                  </span>
                  <span className='text-foreground font-mono font-medium'>
                    webp, png, jpg, avif
                  </span>
                </div>
              </div>
            </div>

            {/* Effects */}
            <div className='space-y-1.5'>
              <div className='text-foreground flex items-center justify-between font-semibold'>
                <span>{t('files.transform.effectsTitle', 'Effects')}</span>
                <span className='text-muted-foreground font-mono text-[11px]'>
                  e_*
                </span>
              </div>
              <div className='bg-muted/40 border-border/60 space-y-1.5 rounded-lg border p-2 text-[11px]'>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    blur:&lt;1-100&gt;
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.effectBlur',
                      'Blur image (e.g. blur:8)'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    sharpen:&lt;1-20&gt;
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.effectSharpen',
                      'Sharpen details (e.g. sharpen:4)'
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-foreground font-mono font-bold'>
                    grayscale:
                  </span>{' '}
                  <span className='text-muted-foreground'>
                    {t(
                      'files.transform.effectGrayscale',
                      'Black and white filter'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Syntax Example */}
            <div className='border-border/60 border-t pt-2'>
              <span className='text-muted-foreground text-[10px] font-semibold tracking-wider uppercase'>
                {t('files.transform.rawExampleTitle', 'Sample raw syntax:')}
              </span>
              <div className='bg-background/80 border-border/80 text-primary mt-1 rounded border p-1.5 font-mono text-[11px] break-all'>
                w_400,h_300,c_fill,q_80,f_webp
              </div>
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
