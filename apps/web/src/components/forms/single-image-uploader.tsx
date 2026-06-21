import React from 'react'
import { IMAGE_ACCEPTED_FORMATS, MAX_IMAGE_SIZE_MB } from '@/global'
import ImageUploader, { type ImageUploaderProps } from './image-uploader'

type Props = ImageUploaderProps

const SingleImageUploader: React.FC<Props> = (props) => {
  return (
    <ImageUploader
      {...props}
      uploadOptions={{
        accept: {
          'image/*': IMAGE_ACCEPTED_FORMATS,
        },
        maxSizeMb: MAX_IMAGE_SIZE_MB,
        multiple: false,
        ...props.uploadOptions,
      }}
    />
  )
}

SingleImageUploader.displayName = 'SingleImageUploader'

export default SingleImageUploader
