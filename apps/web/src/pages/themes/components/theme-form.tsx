import { useMemo, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  DownloadIcon,
  FileCodeIcon,
  RotateCcwIcon,
  SaveIcon,
  UploadIcon,
} from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { toast } from 'sonner'
import {
  cloneDefaultThemeStyles,
  type ThemeMode,
  type ThemeStyles,
} from '@/lib/theme-builder/default-theme'
import {
  downloadThemeJson,
  generateThemeCss,
  parseThemeCss,
} from '@/lib/theme-builder/theme-utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ThemeFormSchema } from '../schema'
import { ThemePreview } from './theme-preview'
import { ThemeTokenEditor } from './theme-token-editor'

export function ThemeForm({
  form,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  form: UseFormReturn<ThemeFormSchema>
  submitLabel: string
  isSubmitting: boolean
  onSubmit: (values: ThemeFormSchema) => Promise<unknown> | unknown
}) {
  const [mode, setMode] = useState<ThemeMode>('light')
  const [isCodeDialogOpen, setIsCodeDialogOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const cssInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const styles = form.watch('styles')
  const name = form.watch('name')

  const cssText = useMemo(() => generateThemeCss(styles), [styles])

  const updateStyles = (nextStyles: ThemeStyles) => {
    form.setValue('styles', nextStyles, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const copyCss = async () => {
    await navigator.clipboard.writeText(cssText)
    toast.success('Theme CSS copied')
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      setIsSaveDialogOpen(false)
    } catch {
      // Mutation error handlers show the user-facing feedback.
    }
  })

  const importCssFile = async (file?: File) => {
    if (!file) return
    const content = await file.text()
    updateStyles(parseThemeCss(content, styles))
    toast.success('CSS variables imported')
    if (cssInputRef.current) cssInputRef.current.value = ''
  }

  const importJsonFile = async (file?: File) => {
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      updateStyles(data.styles ?? data)
      toast.success('Theme JSON imported')
    } catch {
      toast.error('Invalid theme JSON')
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = ''
    }
  }

  return (
    <div className='space-y-4'>
      <input
        ref={cssInputRef}
        type='file'
        accept='.css,text/css'
        className='hidden'
        onChange={(event) => importCssFile(event.target.files?.[0])}
      />
      <input
        ref={jsonInputRef}
        type='file'
        accept='.json,application/json'
        className='hidden'
        onChange={(event) => importJsonFile(event.target.files?.[0])}
      />

      <div className='bg-card/70 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2'>
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => cssInputRef.current?.click()}
          >
            <UploadIcon className='size-4' />
            Import CSS
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => jsonInputRef.current?.click()}
          >
            <UploadIcon className='size-4' />
            Import JSON
          </Button>
          <Button type='button' variant='outline' onClick={copyCss}>
            <FileCodeIcon className='size-4' />
            Copy CSS
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() =>
              downloadThemeJson(
                { name, styles },
                `${name || 'theme'}.json`.toLowerCase().replace(/\s+/g, '-')
              )
            }
          >
            <DownloadIcon className='size-4' />
            Export JSON
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsCodeDialogOpen(true)}
          >
            <FileCodeIcon className='size-4' />
            Code view
          </Button>
          <Button
            type='button'
            variant='ghost'
            onClick={() => updateStyles(cloneDefaultThemeStyles())}
          >
            <RotateCcwIcon className='size-4' />
            Reset tokens
          </Button>
        </div>

        <Button
          type='button'
          onClick={() => setIsSaveDialogOpen(true)}
          disabled={isSubmitting}
        >
          <SaveIcon className='size-4' />
          {submitLabel}
        </Button>
      </div>

      <div className='grid gap-4 lg:hidden'>
        <ThemeTokenEditor
          value={styles}
          mode={mode}
          onModeChange={setMode}
          onChange={updateStyles}
        />
        <ThemePreview styles={styles} mode={mode} />
      </div>

      <Group
        orientation='horizontal'
        className='hidden min-h-[calc(100vh-15rem)] lg:flex'
      >
        <Panel
          defaultSize='34%'
          minSize='26%'
          maxSize='48%'
          className='min-w-0'
        >
          <ThemeTokenEditor
            value={styles}
            mode={mode}
            onModeChange={setMode}
            onChange={updateStyles}
          />
        </Panel>

        <Separator className='group flex w-4 items-center justify-center'>
          <span className='bg-border group-hover:bg-primary/50 h-16 w-1 rounded-full transition-colors' />
        </Separator>

        <Panel defaultSize='66%' minSize='42%' className='min-w-0'>
          <ThemePreview styles={styles} mode={mode} />
        </Panel>
      </Group>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Theme details</DialogTitle>
            <DialogDescription>
              Review the theme metadata before saving it to the theme library.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-5'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Midnight Blue' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      placeholder='Describe where this theme should be used.'
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='draft'>Draft</SelectItem>
                        <SelectItem value='published'>Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <p className='text-muted-foreground text-xs'>
                    Only published themes can be assigned to admin or client
                    runtime.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setIsSaveDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <SaveIcon className='size-4' />
              {submitLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCodeDialogOpen} onOpenChange={setIsCodeDialogOpen}>
        <DialogContent className='max-h-[92vh] overflow-hidden p-0 sm:max-w-4xl'>
          <DialogHeader className='border-b px-6 py-5'>
            <DialogTitle>Theme CSS</DialogTitle>
            <DialogDescription>
              Copy the generated shadcn/TweakCN-compatible CSS variables.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className='max-h-[calc(92vh-10rem)]'>
            <pre className='bg-muted/40 overflow-x-auto p-6 text-xs leading-relaxed'>
              <code>{cssText}</code>
            </pre>
          </ScrollArea>
          <DialogFooter className='border-t px-6 py-4'>
            <Button type='button' variant='outline' onClick={copyCss}>
              <FileCodeIcon className='size-4' />
              Copy CSS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
