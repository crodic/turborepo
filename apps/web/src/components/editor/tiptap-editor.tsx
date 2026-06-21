import 'react-image-crop/dist/ReactCrop.css'
import RichTextEditor from 'reactjs-tiptap-editor'
import 'reactjs-tiptap-editor/style.css'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/theme-provider'
import { extensions } from './extensions'
import { debounce } from './utils'

interface Props {
  output: 'html' | 'text' | 'json'
  content: string | undefined
  onChangeContent: (value: string) => void
  disabled: boolean
  className?: string
}

function TiptapEditor({ className, ...props }: Props) {
  const { theme } = useTheme()

  const onValueChange = debounce((value: string) => {
    props.onChangeContent(value)
  }, 300)

  return (
    <div className={cn('relative', className)}>
      <RichTextEditor
        output={props.output}
        content={props.content || ''}
        onChangeContent={onValueChange}
        extensions={extensions}
        dark={theme === 'dark'}
        disabled={props.disabled}
        toolbar={{ tooltipSide: 'bottom' }}
      />
    </div>
  )
}

export default TiptapEditor
