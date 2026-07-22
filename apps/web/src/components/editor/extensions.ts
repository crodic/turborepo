import { Blockquote } from 'reactjs-tiptap-editor/blockquote'
import { Bold } from 'reactjs-tiptap-editor/bold'
import { BulletList } from 'reactjs-tiptap-editor/bulletlist'
import { Clear } from 'reactjs-tiptap-editor/clear'
import { Color } from 'reactjs-tiptap-editor/color'
import { Column } from 'reactjs-tiptap-editor/column'
import { FontFamily } from 'reactjs-tiptap-editor/fontfamily'
import { FontSize } from 'reactjs-tiptap-editor/fontsize'
import { Heading } from 'reactjs-tiptap-editor/heading'
import { Highlight } from 'reactjs-tiptap-editor/highlight'
import { History } from 'reactjs-tiptap-editor/history'
import { HorizontalRule } from 'reactjs-tiptap-editor/horizontalrule'
import { Image } from 'reactjs-tiptap-editor/image'
import { Indent } from 'reactjs-tiptap-editor/indent'
import { Italic } from 'reactjs-tiptap-editor/italic'
import { LineHeight } from 'reactjs-tiptap-editor/lineheight'
import { Link } from 'reactjs-tiptap-editor/link'
import { MoreMark } from 'reactjs-tiptap-editor/moremark'
import { OrderedList } from 'reactjs-tiptap-editor/orderedlist'
import { Strike } from 'reactjs-tiptap-editor/strike'
import { TextAlign } from 'reactjs-tiptap-editor/textalign'
import { TextUnderline } from 'reactjs-tiptap-editor/textunderline'
import http from '@/lib/http'
import { baseExtensions } from './base-kit'

export const extensions = [
  ...baseExtensions,
  History,
  Clear,
  FontFamily,
  Heading.configure({ spacer: true }),
  FontSize,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  MoreMark,
  Color.configure({ spacer: true }),
  Highlight,
  BulletList,
  OrderedList,
  TextAlign.configure({ types: ['heading', 'paragraph'], spacer: true }),
  Indent,
  LineHeight,
  Link,
  Image.configure({
    upload: async (files: File) => {
      try {
        const formData = new FormData()
        formData.append('file', files)
        formData.append('folder', 'cms')
        formData.append('disk', 'public')

        const res = await http.post<{ url: string }>(
          '/files/upload',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        )

        return res.data.url
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to upload image:', err)
        return ''
      }
    },
  }),
  Blockquote,
  HorizontalRule,
  Column,
]
