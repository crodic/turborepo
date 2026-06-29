import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import 'react-image-crop/dist/ReactCrop.css'
import { RichTextProvider } from 'reactjs-tiptap-editor'
import { RichTextBlockquote } from 'reactjs-tiptap-editor/blockquote'
import { RichTextBold } from 'reactjs-tiptap-editor/bold'
import {
  RichTextBubbleMenuDragHandle,
  RichTextBubbleText,
} from 'reactjs-tiptap-editor/bubble'
import { RichTextBulletList } from 'reactjs-tiptap-editor/bulletlist'
import { RichTextClear } from 'reactjs-tiptap-editor/clear'
import { RichTextColor } from 'reactjs-tiptap-editor/color'
import { RichTextColumn } from 'reactjs-tiptap-editor/column'
import { RichTextFontFamily } from 'reactjs-tiptap-editor/fontfamily'
import { RichTextFontSize } from 'reactjs-tiptap-editor/fontsize'
import { RichTextHeading } from 'reactjs-tiptap-editor/heading'
import { RichTextHighlight } from 'reactjs-tiptap-editor/highlight'
import { RichTextRedo, RichTextUndo } from 'reactjs-tiptap-editor/history'
import { RichTextHorizontalRule } from 'reactjs-tiptap-editor/horizontalrule'
import { RichTextImage } from 'reactjs-tiptap-editor/image'
import { RichTextIndent } from 'reactjs-tiptap-editor/indent'
import { RichTextItalic } from 'reactjs-tiptap-editor/italic'
import { RichTextLineHeight } from 'reactjs-tiptap-editor/lineheight'
import { RichTextLink } from 'reactjs-tiptap-editor/link'
import { RichTextMoreMark } from 'reactjs-tiptap-editor/moremark'
import { RichTextOrderedList } from 'reactjs-tiptap-editor/orderedlist'
import { RichTextStrike } from 'reactjs-tiptap-editor/strike'
import 'reactjs-tiptap-editor/style.css'
import { RichTextAlign } from 'reactjs-tiptap-editor/textalign'
import { RichTextUnderline } from 'reactjs-tiptap-editor/textunderline'
import { themeActions } from 'reactjs-tiptap-editor/theme'
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
  extensions?: any[]
}

type EditorThemeColor =
  | 'default'
  | 'blue'
  | 'red'
  | 'violet'
  | 'yellow'
  | 'green'
  | 'orange'
  | 'rose'

function getEditorThemeColor(colorKey: string): EditorThemeColor {
  if (colorKey === 'pink') {
    return 'rose'
  }

  if (
    colorKey === 'blue' ||
    colorKey === 'red' ||
    colorKey === 'violet' ||
    colorKey === 'yellow' ||
    colorKey === 'green' ||
    colorKey === 'orange'
  ) {
    return colorKey
  }

  return 'default'
}

function TiptapEditor({ className, ...props }: Props) {
  const { colorKey, resolvedTheme } = useTheme()

  const onValueChange = debounce((value: string) => {
    props.onChangeContent(value)
  }, 300)

  const editor = useEditor({
    content: props.content || '',
    editable: !props.disabled,
    extensions: props.extensions || extensions,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const value =
        props.output === 'text'
          ? editor.getText()
          : props.output === 'json'
            ? JSON.stringify(editor.getJSON())
            : editor.getHTML()

      onValueChange(value)
    },
  })

  useEffect(() => {
    editor?.setEditable(!props.disabled)
  }, [editor, props.disabled])

  useEffect(() => {
    themeActions.setTheme(resolvedTheme)
    themeActions.setColor(getEditorThemeColor(colorKey))
  }, [colorKey, resolvedTheme])

  useEffect(() => {
    if (!editor) {
      return
    }

    const content = props.content || ''
    const currentContent =
      props.output === 'text'
        ? editor.getText()
        : props.output === 'json'
          ? JSON.stringify(editor.getJSON())
          : editor.getHTML()

    if (content !== currentContent) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, props.content, props.output])

  return (
    <div className={cn('relative', className)}>
      {editor ? (
        <div
          className='bg-background overflow-hidden rounded-lg'
          style={{ border: '1px solid var(--border)' }}
        >
          <RichTextProvider editor={editor} dark={resolvedTheme === 'dark'}>
            <div className='flex max-h-full w-full flex-col'>
              <div
                className='flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2'
                style={{ borderBottom: '1px solid hsl(var(--border))' }}
              >
                <RichTextUndo />
                <RichTextRedo />
                <RichTextClear />
                <RichTextFontFamily />
                <RichTextHeading />
                <RichTextFontSize />
                <RichTextBold />
                <RichTextItalic />
                <RichTextUnderline />
                <RichTextStrike />
                <RichTextMoreMark />
                <RichTextColor />
                <RichTextHighlight />
                <RichTextBulletList />
                <RichTextOrderedList />
                <RichTextAlign />
                <RichTextIndent />
                <RichTextLineHeight />
                <RichTextLink />
                <RichTextImage />
                <RichTextBlockquote />
                <RichTextHorizontalRule />
                <RichTextColumn />
              </div>

              <EditorContent className='min-h-[150px]' editor={editor} />
              <RichTextBubbleText />
              <RichTextBubbleMenuDragHandle />
            </div>
          </RichTextProvider>
        </div>
      ) : null}
    </div>
  )
}

export default TiptapEditor
