import { useMemo, useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { useDataTable } from '@/hooks/use-data-table'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { DataTable } from '@/components/data-table/data-table'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useDataPolarBenefits } from '../queries'
import type { PolarBenefitSchema } from '../schema'
import { BenefitDialog } from './benefit-dialog'
import { BenefitGrantsModal } from './benefit-grants-modal'
import { getBenefitsTableColumns } from './columns'

export function PagePolarBenefits() {
  const { t } = useTranslation()
  const { ability } = useAuthStore()
  const canManage =
    ability.can('create', 'PAYMENT_PRODUCT') ||
    ability.can('update', 'PAYMENT_PRODUCT')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [grantsModalBenefit, setGrantsModalBenefit] =
    useState<PolarBenefitSchema | null>(null)
  const [grantsModalOpen, setGrantsModalOpen] = useState(false)

  const { data, isFetching } = useDataPolarBenefits()

  const handleViewGrants = (benefit: PolarBenefitSchema) => {
    setGrantsModalBenefit(benefit)
    setGrantsModalOpen(true)
  }

  const columns = useMemo(
    () => getBenefitsTableColumns({ onViewGrants: handleViewGrants }),
    []
  )

  const { table } = useDataTable({
    data: data ?? [],
    columns,
    pageCount: 1,
    getRowId: (row) => row.id,
  })

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
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              {t('polar.benefits.title', {
                defaultValue: 'Benefits & Entitlements',
              })}
            </h2>
            <p className='text-muted-foreground'>
              {t('polar.benefits.description', {
                defaultValue:
                  'Manage customer benefits, software license keys, Discord/GitHub access, and audit customer grants.',
              })}
            </p>
          </div>
          <div className='flex items-center gap-2'>
            {canManage && (
              <Button onClick={() => setDialogOpen(true)}>
                <PlusIcon className='mr-1.5 size-4' />
                Create Benefit
              </Button>
            )}
          </div>
        </div>

        <DataTable table={table} isFetching={isFetching}>
          <DataTableToolbar table={table} />
        </DataTable>

        <BenefitDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        <BenefitGrantsModal
          benefit={grantsModalBenefit}
          open={grantsModalOpen}
          onOpenChange={setGrantsModalOpen}
        />
      </Main>
    </>
  )
}

export default PagePolarBenefits
