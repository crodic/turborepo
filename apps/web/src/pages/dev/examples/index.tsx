import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { ConfigDrawer } from '@/components/config-drawer'
import CoverUploadField from '@/components/forms/cover-upload-field'
import SortableImageUploadField from '@/components/forms/sortable-image-upload-field'
import type { ExistingImage, ImagePayload } from '@/components/forms/types'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const existingImageSchema = z.object({
  type: z.literal('existing'),
  id: z.string(),
  order: z.number(),
})

const newImageSchema = z.object({
  type: z.literal('new'),
  file: z.instanceof(File),
  tempId: z.string(),
  order: z.number(),
})

const deletedImageSchema = z.object({
  type: z.literal('deleted'),
  id: z.string(),
})

const imagePayloadSchema = z.discriminatedUnion('type', [
  existingImageSchema,
  newImageSchema,
  deletedImageSchema,
])

const formSchema = z.object({
  images: z
    .array(imagePayloadSchema)
    .refine(
      (images) => {
        const activeImages = images.filter((img) => img.type !== 'deleted')
        return activeImages.length >= 1
      },
      { message: 'At least 1 image is required' }
    )
    .refine(
      (images) => {
        const activeImages = images.filter((img) => img.type !== 'deleted')
        return activeImages.length <= 200
      },
      { message: 'Maximum 200 images allowed' }
    ),
  coverIndex: z.number().int().nonnegative().nullable(),
  cover: z.instanceof(File, { message: 'Must be a valid File' }).nullable(),
})

type FormValues = z.infer<typeof formSchema>

type SortableImageApiItem = {
  id: string
  src: string
  alt?: string
  order: number
}

type SortableImageApiResponse = {
  ownerKey: string
  coverIndex: number | null
  images: SortableImageApiItem[]
}

const SORTABLE_IMAGES_OWNER_KEY = 'demo-user'
const SORTABLE_IMAGES_API_URL = `${import.meta.env.VITE_API_URL}/files/sortable-images/${SORTABLE_IMAGES_OWNER_KEY}`

function toExistingImages(images: SortableImageApiItem[]): ExistingImage[] {
  return [...images]
    .sort((a, b) => a.order - b.order)
    .map((image) => ({
      id: image.id,
      src: image.src,
      alt: image.alt ?? 'Image',
    }))
}

function toExistingPayloads(images: ExistingImage[]): ImagePayload[] {
  return images.map((image, order) => ({
    type: 'existing',
    id: image.id,
    order,
  }))
}

function buildSortableImagesFormData(
  images: ImagePayload[],
  existingImages: ExistingImage[],
  coverIndex?: number | null
) {
  const formData = new window.FormData()
  const existingImageById = new Map(
    existingImages.map((image) => [image.id, image])
  )
  const activeImages = images
    .filter(
      (image): image is ImagePayload & { type: 'existing' | 'new' } =>
        image.type === 'existing' || image.type === 'new'
    )
    .sort((a, b) => a.order - b.order)

  formData.append(
    'items',
    JSON.stringify(
      activeImages.map((image) => {
        if (image.type === 'existing') {
          const existingImage = existingImageById.get(image.id)

          return {
            type: 'existing',
            id: image.id,
            src: existingImage?.src,
            alt: existingImage?.alt ?? 'Image',
          }
        }

        return {
          type: 'new',
          tempId: image.tempId,
          alt: image.file.name,
        }
      })
    )
  )

  if (typeof coverIndex === 'number') {
    formData.append('coverIndex', String(coverIndex))
  }

  activeImages.forEach((image) => {
    if (image.type === 'new') {
      formData.append('files', image.file, image.file.name)
    }
  })

  return formData
}

async function getErrorMessage(response: Response) {
  try {
    const data = await response.json()
    const message = data?.message

    if (Array.isArray(message)) {
      return message.join(', ')
    }

    if (typeof message === 'string') {
      return message
    }
  } catch {
    // Keep the fallback below when the response body is empty or not JSON.
  }

  return `Request failed with status ${response.status}`
}

export function PageFormExamples() {
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(true)
  const [isSavingImages, setIsSavingImages] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      images: [],
      coverIndex: null,
      cover: null,
    },
  })

  useEffect(() => {
    let isMounted = true

    async function loadImages() {
      try {
        const response = await fetch(SORTABLE_IMAGES_API_URL, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to load cached images')
        }

        const data = (await response.json()) as SortableImageApiResponse
        if (!isMounted || data.images.length === 0) return

        const cachedImages = toExistingImages(data.images)
        setExistingImages(cachedImages)
        form.reset({
          images: toExistingPayloads(cachedImages),
          coverIndex: data.coverIndex,
          cover: form.getValues('cover'),
        })
      } catch (error) {
        console.error(error)
        toast.error('Could not load saved images')
      } finally {
        if (isMounted) {
          setIsLoadingImages(false)
        }
      }
    }

    loadImages()

    return () => {
      isMounted = false
    }
  }, [form])

  const onSubmit = async (data: FormValues) => {
    setIsSavingImages(true)

    try {
      const response = await fetch(SORTABLE_IMAGES_API_URL, {
        method: 'POST',
        body: buildSortableImagesFormData(
          data.images,
          existingImages,
          data.coverIndex
        ),
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response))
      }

      const saved = (await response.json()) as SortableImageApiResponse
      const savedImages = toExistingImages(saved.images)

      setExistingImages(savedImages)
      form.reset({
        images: toExistingPayloads(savedImages),
        coverIndex: saved.coverIndex,
        cover: data.cover,
      })
      toast.success('Images saved successfully')
    } catch (error) {
      console.error(error)
      toast.error('Could not save images')
    } finally {
      setIsSavingImages(false)
    }
  }

  const handleReset = () => {
    form.reset({
      images: toExistingPayloads(existingImages),
      coverIndex: existingImages.length > 0 ? 0 : null,
    })
  }

  return (
    <>
      <Header fixed>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <ImageIcon className='text-muted-foreground size-5' />
            <h1 className='text-2xl font-bold tracking-tight'>
              Form Components Example
            </h1>
          </div>
          <p className='text-muted-foreground max-w-3xl text-sm'>
            Local development preview for the image upload form components.
          </p>
        </div>

        <Form {...form}>
          <form className='space-y-6' onSubmit={form.handleSubmit(onSubmit)}>
            <section className='border-border bg-card rounded-lg border p-5 shadow-sm'>
              <div className='mb-5 space-y-1'>
                <h2 className='text-lg font-semibold'>Sortable Image Upload</h2>
                <p className='text-muted-foreground text-sm'>
                  Reorder images, add new files, remove items, and choose a
                  cover image.
                </p>
              </div>
              <SortableImageUploadField
                control={form.control}
                name='images'
                coverIndexName='coverIndex'
                label='Product Images'
                description={({ loading }) =>
                  loading
                    ? 'Loading saved images...'
                    : 'Upload between 1 and 200 images. Drag to reorder.'
                }
                existingImages={existingImages}
                maxFiles={200}
                gridClassName='grid-cols-2 sm:grid-cols-4 xl:grid-cols-6'
                disabled={isLoadingImages || isSavingImages}
                loading={isLoadingImages}
              />
            </section>

            <section className='border-border bg-card rounded-lg border p-5 shadow-sm'>
              <div className='mb-5 space-y-1'>
                <h2 className='text-lg font-semibold'>Cover Upload</h2>
                <p className='text-muted-foreground text-sm'>
                  Upload a cover image and drag the preview to crop it before
                  submit.
                </p>
              </div>
              <CoverUploadField
                control={form.control}
                name='cover'
                label='Product Cover'
                description='Upload a cover image, then drag it inside the frame to crop before submit.'
                accept='image/png'
                disabled={isSavingImages}
              />
            </section>

            <div className='flex justify-center gap-4'>
              <Button type='submit' size='lg' disabled={isSavingImages}>
                {isSavingImages ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='lg'
                onClick={handleReset}
                disabled={isSavingImages}
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </Main>
    </>
  )
}
