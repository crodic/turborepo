import { BaseKit } from 'reactjs-tiptap-editor'
import { Blockquote } from 'reactjs-tiptap-editor/blockquote'
import { Bold } from 'reactjs-tiptap-editor/bold'
import { BulletList } from 'reactjs-tiptap-editor/bulletlist'
import { Clear } from 'reactjs-tiptap-editor/clear'
import { Heading } from 'reactjs-tiptap-editor/heading'
import { Italic } from 'reactjs-tiptap-editor/italic'
import { Link } from 'reactjs-tiptap-editor/link'
import { OrderedList } from 'reactjs-tiptap-editor/orderedlist'
import { Strike } from 'reactjs-tiptap-editor/strike'
import { TextAlign } from 'reactjs-tiptap-editor/textalign'
import { TextUnderline } from 'reactjs-tiptap-editor/textunderline'

export const extensions = [
  BaseKit.configure({
    placeholder: {
      showOnlyCurrent: true,
      placeholder: 'Type something...',
    },
  }),
  Clear,
  Heading.configure({ spacer: true }),
  Bold,
  Italic,
  TextUnderline,
  Strike,
  BulletList,
  OrderedList,
  TextAlign.configure({ types: ['heading', 'paragraph'], spacer: true }),
  Link,
  Blockquote,
]
