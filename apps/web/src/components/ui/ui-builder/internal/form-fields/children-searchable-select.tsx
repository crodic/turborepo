// @ts-nocheck
import React, { useCallback } from 'react'
import { X as XIcon, ChevronsUpDown } from 'lucide-react'
import { useLayerStore } from '@/lib/ui-builder/store/layer-store'
import { hasLayerChildren } from '@/lib/ui-builder/store/layer-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover'
import type { ComponentLayer } from '@/components/ui/ui-builder/types'

interface ChildrenSearchableSelectProps {
  layer: ComponentLayer
  onChange: ({
    layerType,
    parentLayerId,
    addPosition,
  }: {
    layerType: string
    parentLayerId: string
    addPosition?: number
  }) => void
}

export function ChildrenSearchableSelect({
  layer,
  onChange,
}: ChildrenSearchableSelectProps) {
  const { selectLayer, removeLayer, selectedLayerId, findLayerById } =
    useLayerStore()

  const selectedLayer = findLayerById(selectedLayerId)

  return (
    <div className='w-full space-y-4'>
      <AddComponentsPopover parentLayerId={layer.id} onChange={onChange}>
        <Button
          variant='outline'
          role='combobox'
          className='w-full justify-between'
        >
          Add Component
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </AddComponentsPopover>

      {hasLayerChildren(layer) && (
        <div className='flex w-full flex-wrap gap-2'>
          {selectedLayer &&
            hasLayerChildren(selectedLayer) &&
            selectedLayer.children.map((child) => (
              <ChildLayerBadge
                key={child.id}
                child={child}
                selectLayer={selectLayer}
                removeLayer={removeLayer}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function ChildLayerBadge({
  child,
  selectLayer,
  removeLayer,
}: {
  child: ComponentLayer
  selectLayer: (id: string) => void
  removeLayer: (id: string) => void
}) {
  const handleSelect = useCallback(() => {
    selectLayer(child.id)
  }, [selectLayer, child.id])

  const handleRemove = useCallback(() => {
    removeLayer(child.id)
  }, [removeLayer, child.id])
  return (
    <Badge
      key={child.id}
      className='flex items-center space-x-2 py-0 pr-0 pl-2'
      variant='secondary'
    >
      <Button
        className='h-5 p-0'
        variant='link'
        size='sm'
        onClick={handleSelect}
      >
        {nameForLayer(child)}
      </Button>
      <Button
        className='size-6 rounded-full p-0'
        variant='ghost'
        size='icon'
        onClick={handleRemove}
      >
        <XIcon className='h-4 w-4' />
      </Button>
    </Badge>
  )
}

const nameForLayer = (layer: ComponentLayer) => {
  return layer.name || layer.type.replaceAll('_', '')
}
