export function VersionInfo() {
  return (
    <div className='text-muted-foreground flex items-center justify-between px-2 py-1.5 text-[11px]'>
      <span>Version</span>
      <span className='font-mono font-medium'>v{__APP_VERSION__}</span>
    </div>
  )
}
