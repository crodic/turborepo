import {
  BookOpenIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Code2Icon,
  HelpCircleIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  RocketIcon,
  SearchIcon,
  ServerCogIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TerminalIcon,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const featuredTopics = [
  {
    title: 'Project setup',
    description:
      'Install dependencies, configure environment variables, and start the portal locally.',
    icon: RocketIcon,
    items: ['Install packages', 'Copy env files', 'Run the dev server'],
  },
  {
    title: 'Authentication',
    description:
      'Understand protected routes, session handling, and how the admin portal loads the current user.',
    icon: KeyRoundIcon,
    items: ['Sign-in flow', 'Refresh tokens', 'Route guards'],
  },
  {
    title: 'Roles and permissions',
    description:
      'Manage role based access with source-controlled permissions and admin-friendly metadata.',
    icon: ShieldCheckIcon,
    items: ['Permission sync', 'Role assignment', 'Protected actions'],
  },
  {
    title: 'Deployment',
    description:
      'Prepare a production build, run migrations, and validate service health after release.',
    icon: ServerCogIcon,
    items: ['Build assets', 'Run migrations', 'Check health endpoints'],
  },
]

const quickCommands = [
  {
    label: 'Start the portal',
    command: 'pnpm dev',
  },
  {
    label: 'Check types',
    command: 'pnpm type-check',
  },
  {
    label: 'Production build',
    command: 'pnpm build',
  },
]

const workflows = [
  {
    title: 'Create an admin user',
    description:
      'Use the Admins section to create a user, assign one or more roles, and confirm the user can sign in.',
  },
  {
    title: 'Add a new permission',
    description:
      'Add the permission in the backend constants, sync it to the database, then assign it through the Roles screen.',
  },
  {
    title: 'Prepare a release',
    description:
      'Run lint, type-check, and build locally before opening a pull request. CI should repeat the same checks.',
  },
]

const faqs = [
  {
    question: 'Where should a new page live?',
    answer:
      'Create feature pages under src/pages, keep API calls in a local queries file, and register the route in src/routes/router.tsx.',
  },
  {
    question: 'How should protected UI be handled?',
    answer:
      'Use route authorization for page access and still hide or disable unsafe actions inside the page for a clearer user experience.',
  },
  {
    question: 'When should I add a backend migration?',
    answer:
      'Add or update migrations when the database shape changes. For this boilerplate, keep migrations clean and avoid unnecessary churn.',
  },
]

export function PageHelpCenter() {
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

      <Main className='space-y-8'>
        <section className='grid gap-6 lg:grid-cols-[1fr_360px] lg:items-stretch'>
          <div className='border-border/70 bg-card rounded-lg border p-6 sm:p-8'>
            <Badge variant='secondary' className='mb-5 gap-1.5'>
              <SparklesIcon className='size-3.5' />
              Boilerplate portal guide
            </Badge>
            <div className='max-w-3xl space-y-4'>
              <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
                Help Center
              </h1>
              <p className='text-muted-foreground text-base leading-7 sm:text-lg'>
                Find the essentials for working with this admin portal:
                onboarding, authentication, role management, deployment, and
                common development workflows.
              </p>
            </div>
            <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
              <div className='relative flex-1'>
                <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
                <Input
                  className='pl-9'
                  placeholder='Search docs, workflows, or troubleshooting'
                  aria-label='Search help articles'
                />
              </div>
              <Button>
                Browse topics
                <ChevronRightIcon className='size-4' />
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <LifeBuoyIcon className='text-primary size-5' />
                Need a fast answer?
              </CardTitle>
              <CardDescription>
                Start with these checks before opening a ticket.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              {[
                'Confirm the environment file matches the API you are using.',
                'Check the browser console and network response payload.',
                'Run type-check and build before reviewing a UI issue.',
              ].map((item) => (
                <div key={item} className='flex gap-3'>
                  <CheckCircle2Icon className='text-primary mt-0.5 size-4 shrink-0' />
                  <p className='text-muted-foreground text-sm leading-6'>
                    {item}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {featuredTopics.map((topic) => {
            const Icon = topic.icon

            return (
              <Card key={topic.title}>
                <CardHeader>
                  <div className='bg-primary/10 text-primary mb-3 flex size-10 items-center justify-center rounded-md'>
                    <Icon className='size-5' />
                  </div>
                  <CardTitle>{topic.title}</CardTitle>
                  <CardDescription>{topic.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-2'>
                    {topic.items.map((item) => (
                      <div
                        key={item}
                        className='text-muted-foreground flex items-center gap-2 text-sm'
                      >
                        <ChevronRightIcon className='size-3.5' />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className='grid gap-6 lg:grid-cols-[1fr_380px]'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <BookOpenIcon className='text-primary size-5' />
                Common workflows
              </CardTitle>
              <CardDescription>
                Practical paths that new developers usually need first.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              {workflows.map((workflow, index) => (
                <div key={workflow.title}>
                  <div className='flex gap-4'>
                    <div className='bg-muted flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold'>
                      {index + 1}
                    </div>
                    <div className='space-y-1'>
                      <h3 className='font-semibold'>{workflow.title}</h3>
                      <p className='text-muted-foreground text-sm leading-6'>
                        {workflow.description}
                      </p>
                    </div>
                  </div>
                  {index < workflows.length - 1 && (
                    <Separator className='mt-5' />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <TerminalIcon className='text-primary size-5' />
                Useful commands
              </CardTitle>
              <CardDescription>
                Keep these close while customizing the portal.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {quickCommands.map((item) => (
                <div key={item.command} className='rounded-md border p-3'>
                  <p className='text-muted-foreground mb-2 text-sm'>
                    {item.label}
                  </p>
                  <code className='bg-muted block rounded px-3 py-2 font-mono text-sm'>
                    {item.command}
                  </code>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-6 lg:grid-cols-[360px_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Code2Icon className='text-primary size-5' />
                Developer notes
              </CardTitle>
              <CardDescription>
                Small conventions that keep the boilerplate easy to maintain.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-6'>
              <p className='text-muted-foreground'>
                Prefer local feature folders for schemas, queries, tables, and
                forms. Reuse shared UI components before adding new patterns.
              </p>
              <p className='text-muted-foreground'>
                Keep API contracts validated with schemas on the frontend and
                DTOs on the backend so integration errors are visible early.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <HelpCircleIcon className='text-primary size-5' />
                Frequently asked questions
              </CardTitle>
              <CardDescription>
                Answers for the first week of working inside the portal.
              </CardDescription>
            </CardHeader>
            <CardContent className='grid gap-4 md:grid-cols-3'>
              {faqs.map((faq) => (
                <div key={faq.question} className='rounded-md border p-4'>
                  <h3 className='font-semibold'>{faq.question}</h3>
                  <p className='text-muted-foreground mt-2 text-sm leading-6'>
                    {faq.answer}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </Main>
    </>
  )
}
