import { RotateCcw, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransformGuidelinePopover } from './transform-guideline-popover'

export type ImageTransformForm = {
  width: string
  height: string
  crop: string
  format: string
  quality: string
  effect: string
  raw: string
}

export function toPositiveTransform(
  prefix: string,
  value: string,
  max?: number
) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return `${prefix}_${max ? Math.min(number, max) : number}`
}

export function buildImageTransformations(value: ImageTransformForm) {
  const parts = [
    toPositiveTransform('w', value.width),
    toPositiveTransform('h', value.height),
    value.crop ? `c_${value.crop}` : null,
    value.format ? `f_${value.format}` : null,
    toPositiveTransform('q', value.quality, 100),
    value.effect ? `e_${value.effect}` : null,
    value.raw.trim() || null,
  ].filter(Boolean)

  return parts.join(',')
}

export function buildFileTransformUrl(url: string, transformations: string) {
  const [baseUrl] = url.split('?')
  const match = baseUrl.match(/^(.*\/storage\/uploads\/[^/]+)\/([^/]+)$/)

  if (!match) return url

  return `${match[1]}/${transformations}/${match[2]}`
}

export interface ImageTransformViewProps {
  value: ImageTransformForm
  activeTransformations: string
  onChange: (value: ImageTransformForm) => void
  onApply: () => void
  onReset: () => void
  onPreset: (preset: Partial<ImageTransformForm>) => void
}

export function ImageTransformView({
  value,
  activeTransformations,
  onChange,
  onApply,
  onReset,
  onPreset,
}: ImageTransformViewProps) {
  const { t } = useTranslation()

  const update = (key: keyof ImageTransformForm, nextValue: string) => {
    onChange({ ...value, [key]: nextValue })
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* Quick Presets */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
            {t('files.transform.presets', 'Presets')}
          </p>
          <TransformGuidelinePopover />
        </div>
        <div className='flex flex-wrap gap-1.5'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() =>
              onPreset({ width: '300', height: '300', crop: 'fill' })
            }
          >
            300×300 Sq
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() =>
              onPreset({ width: '800', height: '600', crop: 'cover' })
            }
          >
            800×600 Cover
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() => onPreset({ format: 'webp', quality: '85' })}
          >
            WebP 85%
          </Button>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            className='h-7 rounded-lg text-[11px]'
            onClick={() => onPreset({ effect: 'grayscale' })}
          >
            B&W Filter
          </Button>
        </div>
      </div>

      {/* Form Controls */}
      <div className='border-border/60 bg-muted/20 space-y-3 rounded-xl border p-3.5 shadow-xs'>
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
          {t('files.transform.dimensionsTitle', 'Dimensions')}
        </p>
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <label className='text-muted-foreground text-[10px] font-medium'>
                {t('files.transform.width', 'Width (px)')}
              </label>
              <span className='text-muted-foreground/70 text-[10px]'>
                1 - 4000
              </span>
            </div>
            <Input
              type='number'
              min={1}
              max={4000}
              value={value.width}
              onChange={(event) => update('width', event.target.value)}
              placeholder='e.g. 400'
              className='h-8 text-xs'
            />
          </div>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <label className='text-muted-foreground text-[10px] font-medium'>
                {t('files.transform.height', 'Height (px)')}
              </label>
              <span className='text-muted-foreground/70 text-[10px]'>
                1 - 4000
              </span>
            </div>
            <Input
              type='number'
              min={1}
              max={4000}
              value={value.height}
              onChange={(event) => update('height', event.target.value)}
              placeholder='e.g. 400'
              className='h-8 text-xs'
            />
          </div>
        </div>

        <p className='text-muted-foreground pt-1 text-xs font-semibold tracking-wider uppercase'>
          {t('files.transform.croppingAndFormat', 'Cropping & Format')}
        </p>
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              {t('files.transform.crop', 'Crop Mode')}
            </label>
            <TransformSelect
              value={value.crop}
              placeholder={t('files.transform.autoPlaceholder', 'Auto')}
              options={['fill', 'cover', 'fit', 'limit', 'pad', 'thumb']}
              onValueChange={(nextValue) => update('crop', nextValue)}
            />
          </div>
          <div className='space-y-1'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              {t('files.transform.format', 'Format')}
            </label>
            <TransformSelect
              value={value.format}
              placeholder={t('files.transform.originalPlaceholder', 'Original')}
              options={['webp', 'png', 'jpg']}
              onValueChange={(nextValue) => update('format', nextValue)}
            />
          </div>
        </div>

        <p className='text-muted-foreground pt-1 text-xs font-semibold tracking-wider uppercase'>
          {t('files.transform.qualityAndEffect', 'Quality & Effect')}
        </p>
        <div className='grid grid-cols-2 gap-2'>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <label className='text-muted-foreground text-[10px] font-medium'>
                {t('files.transform.quality', 'Quality')}
              </label>
              <span className='text-muted-foreground/70 text-[10px]'>
                1 - 100
              </span>
            </div>
            <Input
              type='number'
              min={1}
              max={100}
              value={value.quality}
              onChange={(event) => update('quality', event.target.value)}
              placeholder='e.g. 80'
              className='h-8 text-xs'
            />
          </div>
          <div className='space-y-1'>
            <div className='flex items-center justify-between'>
              <label className='text-muted-foreground text-[10px] font-medium'>
                {t('files.transform.effect', 'Effect')}
              </label>
              <span className='text-muted-foreground/70 text-[10px]'>
                blur, sharpen
              </span>
            </div>
            <TransformSelect
              value={value.effect}
              placeholder={t('files.transform.nonePlaceholder', 'None')}
              options={['grayscale', 'blur:8', 'sharpen:4']}
              onValueChange={(nextValue) => update('effect', nextValue)}
            />
          </div>
        </div>

        <div className='space-y-1 pt-1'>
          <div className='flex items-center justify-between'>
            <label className='text-muted-foreground text-[10px] font-medium'>
              {t('files.transform.customRaw', 'Custom Raw String')}
            </label>
            <span className='text-muted-foreground/70 font-mono text-[10px]'>
              w_*, h_*, c_*
            </span>
          </div>
          <Input
            value={value.raw}
            onChange={(event) => update('raw', event.target.value)}
            placeholder={t('files.transform.raw')}
            className='h-8 font-mono text-xs'
          />
        </div>

        {activeTransformations && (
          <div className='border-primary/20 bg-primary/5 rounded-lg border p-2.5'>
            <div className='mb-1 flex items-center justify-between gap-1'>
              <span className='text-primary flex items-center gap-1 text-[11px] font-semibold'>
                <Sparkles className='size-3' />{' '}
                {t('files.transform.activeTransforms', 'Active transforms:')}
              </span>
            </div>
            <p className='text-foreground/90 font-mono text-[11px] break-all'>
              {activeTransformations}
            </p>
          </div>
        )}

        <div className='flex gap-2 pt-2'>
          <Button
            size='sm'
            className='h-8 flex-1 gap-1.5 text-xs'
            onClick={onApply}
          >
            <Sparkles className='size-3.5' />
            {t('files.transform.view')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='h-8 gap-1 text-xs'
            onClick={onReset}
          >
            <RotateCcw className='size-3.5' />
            {t('files.transform.reset')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TransformSelect({
  value,
  placeholder,
  options,
  onValueChange,
}: {
  value: string
  placeholder: string
  options: string[]
  onValueChange: (value: string) => void
}) {
  return (
    <Select
      value={value || 'none'}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === 'none' ? '' : nextValue)
      }
    >
      <SelectTrigger className='h-8 w-full text-xs'>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='none' className='text-xs'>
          {placeholder}
        </SelectItem>
        {options.map((option) => (
          <SelectItem key={option} value={option} className='text-xs'>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
