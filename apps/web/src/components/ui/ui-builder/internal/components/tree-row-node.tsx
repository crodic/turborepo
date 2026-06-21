// @ts-nocheck
import React, { useCallback, useState, memo, useMemo } from 'react'
import isDeepEqual from 'fast-deep-equal'
import type { NodeAttrs } from 'he-tree-react'
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
} from 'lucide-react'
import { useGlobalLayerActions } from '@/lib/ui-builder/hooks/use-layer-actions'
import { useEditorStore } from '@/lib/ui-builder/store/editor-store'
import { useLayerStore } from '@/lib/ui-builder/store/layer-store'
import { hasLayerChildren } from '@/lib/ui-builder/store/layer-utils'
import { canComponentAcceptChildren } from '@/lib/ui-builder/store/schema-utils'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover'
import { NameEdit } from '@/components/ui/ui-builder/internal/components/name-edit'
import type { ComponentLayer } from '@/components/ui/ui-builder/types'

interface TreeRowNodeProps {
  node: ComponentLayer
  id: number | string
  level: number
  open: boolean
  draggable: boolean
  onToggle: (id: number | string, open: boolean) => void
  nodeAttributes: NodeAttrs
  selectedLayerId: string | null
  selectLayer: (id: string) => void
}

export const TreeRowNode: React.FC<TreeRowNodeProps> = memo(
  ({
    node,
    id,
    level,
    open,
    draggable,
    onToggle,
    nodeAttributes,
    selectedLayerId,
    selectLayer,
  }) => {
    const componentRegistry = useEditorStore((state) => state.registry)
    const updateLayer = useLayerStore((state) => state.updateLayer)

    // Use global layer actions for delete and duplicate
    const { handleDelete, handleDuplicate, canDuplicate, canDelete } =
      useGlobalLayerActions(node.id)

    const [isRenaming, setIsRenaming] = useState(false)

    const [popoverOrMenuOpen, setPopoverOrMenuOpen] = useState(false)

    const handleOpen = useCallback(() => {
      onToggle(id, !open)
    }, [id, open, onToggle])

    const handleSelect = useCallback(() => {
      selectLayer(node.id)
    }, [node.id, selectLayer])

    const handleRenameClick = useCallback(() => {
      setIsRenaming(true)
    }, [])

    const handleSaveRename = useCallback(
      (newName: string) => {
        updateLayer(node.id, {}, { name: newName })
        setIsRenaming(false)
      },
      [node.id, updateLayer]
    )

    const handleCancelRename = useCallback(() => {
      setIsRenaming(false)
    }, [])

    const canRenderAddChild = useMemo(() => {
      const componentDef =
        componentRegistry[node.type as keyof typeof componentRegistry]
      if (!componentDef) return false

      return canComponentAcceptChildren(componentDef.schema)
    }, [node, componentRegistry])

    const { key, ...rest } = nodeAttributes

    if (!node) {
      return null
    }

    return (
      <div
        key={key}
        {...rest}
        className='group relative flex w-fit items-center'
      >
        <RowOffset level={level} />

        {hasLayerChildren(node) && node.children.length > 0 ? (
          <Button
            className='ml-3 w-4 p-0'
            variant='ghost'
            size='sm'
            onClick={handleOpen}
          >
            {open ? (
              <ChevronDown className='bg-secondary size-4 rounded-full' />
            ) : (
              <ChevronRight className='bg-secondary size-4 rounded-full' />
            )}
          </Button>
        ) : (
          <div className='ml-3 size-4 rounded-none opacity-0' />
        )}

        {isRenaming ? (
          <NameEdit
            initialName={node.name ?? ''}
            onSave={handleSaveRename}
            onCancel={handleCancelRename}
          />
        ) : (
          <Button
            variant='ghost'
            size='sm'
            className={cn(
              'gap-0 pl-0',
              node.id === selectedLayerId
                ? 'text-primary'
                : 'text-muted-foreground'
            )}
            onClick={handleSelect}
          >
            <div
              className={cn(
                'hover:bg-muted-foreground hover:text-muted flex h-full w-4 cursor-move items-center justify-center rounded opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100',
                popoverOrMenuOpen ? 'opacity-100' : 'opacity-0'
              )}
              draggable={draggable}
            >
              <GripVertical className='size-4' />
            </div>
            {node.name}
          </Button>
        )}
        {canRenderAddChild && (
          <AddComponentsPopover
            parentLayerId={node.id}
            onOpenChange={setPopoverOrMenuOpen}
          >
            <Button
              variant='ghost'
              size='icon'
              className={cn(
                'opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100',
                popoverOrMenuOpen ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Plus className='h-4 w-4' />
              <span className='sr-only'>Add component</span>
            </Button>
          </AddComponentsPopover>
        )}
        <DropdownMenu onOpenChange={setPopoverOrMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              className={cn(
                'opacity-0 transition-opacity duration-200 ease-in-out group-hover:opacity-100',
                popoverOrMenuOpen ? 'opacity-100' : 'opacity-0'
              )}
              variant='ghost'
              size='icon'
              aria-label='More options'
            >
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={handleRenameClick}>
              Rename
            </DropdownMenuItem>
            {canDuplicate && (
              <DropdownMenuItem onClick={handleDuplicate}>
                Duplicate
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem onClick={handleDelete}>Remove</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Custom equality check to prevent unnecessary re-renders

    // Check node identity and core properties
    if (prevProps.node.id !== nextProps.node.id) return false
    if (!isDeepEqual(prevProps.node, nextProps.node)) return false

    // Check simple props
    if (prevProps.id !== nextProps.id) return false
    if (prevProps.level !== nextProps.level) return false
    if (prevProps.open !== nextProps.open) return false
    if (prevProps.draggable !== nextProps.draggable) return false
    if (prevProps.selectedLayerId !== nextProps.selectedLayerId) return false

    // Check nodeAttributes - these often change reference but may have same values
    if (!isDeepEqual(prevProps.nodeAttributes, nextProps.nodeAttributes))
      return false

    // Function props should be stable if parent memoization is working correctly
    // If not, these will cause re-renders but that might be necessary
    if (prevProps.onToggle !== nextProps.onToggle) return false
    if (prevProps.selectLayer !== nextProps.selectLayer) return false

    return true
  }
)

TreeRowNode.displayName = 'TreeRowNode'

const RowOffset = ({ level }: { level: number }) => {
  const style = useMemo(
    () => ({
      width: level * 20,
    }),
    [level]
  )

  const arr = useMemo(() => Array.from({ length: level }), [level])

  return (
    <div
      className='pointer-events-none absolute bottom-[20px] left-0 z-[-1] flex h-full flex-row'
      style={style}
    >
      {arr.map((_, index) => (
        <div
          key={index}
          className={cn(
            'border-primary bg-background h-full w-5 border-l border-dashed',
            index === level - 1 && 'border-b'
          )}
        />
      ))}
    </div>
  )
}

export const TreeRowPlaceholder: React.FC<
  Pick<TreeRowNodeProps, 'nodeAttributes'>
> = ({ nodeAttributes }) => {
  const { key, ...rest } = nodeAttributes
  return (
    <div key={key} {...rest} className='h-2 w-40'>
      <div className='size-full border-b-2 border-dashed border-blue-500' />
    </div>
  )
}
