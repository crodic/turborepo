import { Document } from '@tiptap/extension-document'
import { HardBreak } from '@tiptap/extension-hard-break'
import { ListItem } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { TextStyle } from '@tiptap/extension-text-style'
import {
  Dropcursor,
  Gapcursor,
  Placeholder,
  TrailingNode,
} from '@tiptap/extensions'
import {
  Column,
  ColumnNode,
  MultipleColumnNode,
} from 'reactjs-tiptap-editor/column'

const DocumentColumn = Document.extend({
  content: '(block|columns)+',
})

export const baseExtensions = [
  DocumentColumn,
  Text,
  Dropcursor.configure({
    class: 'reactjs-tiptap-editor-theme',
    color: 'hsl(var(--primary))',
    width: 2,
  }),
  Gapcursor,
  HardBreak,
  Paragraph,
  TrailingNode,
  ListItem,
  TextStyle,
  Placeholder.configure({
    showOnlyCurrent: true,
    placeholder: 'Type something...',
  }),
  Column,
  ColumnNode,
  MultipleColumnNode,
]
