import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import {
  ActivityCalendar,
  type Activity,
  type BlockElement,
} from 'react-activity-calendar'
import { Tooltip as ReactTooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'
import { apiGetLoginActivity } from '@/pages/auth/queries'

export function ActivityHeatmap() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['loginActivity'],
    queryFn: apiGetLoginActivity,
  })

  if (isLoading) {
    return (
      <div className='border-border flex h-48 items-center justify-center rounded-md border'>
        <Loader2 className='text-muted-foreground h-6 w-6 animate-spin' />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className='border-border text-destructive flex h-48 items-center justify-center rounded-md border text-sm'>
        Failed to load activity data
      </div>
    )
  }

  return (
    <div className='bg-card text-card-foreground rounded-xl border shadow'>
      <div className='flex flex-col space-y-1.5 p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='leading-none font-semibold tracking-tight'>
              Login activity
            </h3>
            <p className='text-muted-foreground mt-1 text-sm'>
              Your session activity over the last 180 days.
            </p>
          </div>
          <div className='flex space-x-6 text-sm'>
            <div className='flex flex-col items-end'>
              <span className='font-bold'>{data.totalSessions}</span>
              <span className='text-muted-foreground'>sessions</span>
            </div>
            <div className='flex flex-col items-end'>
              <span className='font-bold'>{data.activeDays}</span>
              <span className='text-muted-foreground'>active days</span>
            </div>
          </div>
        </div>
      </div>
      <div className='flex justify-center overflow-x-auto p-6 pt-0'>
        <ActivityCalendar
          data={data.data}
          labels={{
            months: [
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ],
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            totalCount: '{{count}} sessions in the last half year',
            legend: {
              less: 'Less',
              more: 'More',
            },
          }}
          theme={{
            light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
            dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
          }}
          renderBlock={(block: BlockElement, activity: Activity) => (
            <rect
              {...block.props}
              data-tooltip-id='activity-tooltip'
              data-tooltip-content={`${activity.count} sessions on ${activity.date}`}
            />
          )}
          showTotalCount={false}
        />
        <ReactTooltip id='activity-tooltip' />
      </div>
    </div>
  )
}
