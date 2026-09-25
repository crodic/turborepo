import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { OrdersTab } from './components/orders-tab'
import { RefundRequestsTab } from './components/refund-requests-tab'
import { SubscriptionsTab } from './components/subscriptions-tab'
import { TransactionsTab } from './components/transactions-tab'

export function PagePaymentsOverview() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<
    'orders' | 'subscriptions' | 'transactions' | 'refund-requests'
  >('orders')

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
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>
            {t('payments.title', { defaultValue: 'Payments & Billing' })}
          </h2>
          <p className='text-muted-foreground'>
            {t('payments.description', {
              defaultValue:
                'Monitor global orders, SaaS recurring subscriptions, and payment transaction logs.',
            })}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          className='w-full'
        >
          <TabsList className='mb-4'>
            <TabsTrigger value='orders'>
              {t('payments.tabs.orders', { defaultValue: 'Orders' })}
            </TabsTrigger>
            <TabsTrigger value='subscriptions'>
              {t('payments.tabs.subscriptions', {
                defaultValue: 'Subscriptions',
              })}
            </TabsTrigger>
            <TabsTrigger value='transactions'>
              {t('payments.tabs.transactions', {
                defaultValue: 'Transactions',
              })}
            </TabsTrigger>
            <TabsTrigger value='refund-requests'>
              {t('payments.tabs.refundRequests', {
                defaultValue: 'Refund Requests',
              })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value='orders' className='mt-0'>
            <OrdersTab />
          </TabsContent>

          <TabsContent value='subscriptions' className='mt-0'>
            <SubscriptionsTab />
          </TabsContent>

          <TabsContent value='transactions' className='mt-0'>
            <TransactionsTab />
          </TabsContent>

          <TabsContent value='refund-requests' className='mt-0'>
            <RefundRequestsTab />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
