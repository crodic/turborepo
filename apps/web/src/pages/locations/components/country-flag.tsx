import * as Flags from 'country-flag-icons/react/3x2'

interface CountryFlagProps {
  iso2?: string | null
  className?: string
}

export function CountryFlag({
  iso2,
  className = 'size-4 inline-block shrink-0 rounded-xs object-cover shadow-2xs',
}: CountryFlagProps) {
  if (!iso2) return null
  const Flag = (
    Flags as Record<
      string,
      React.ComponentType<{ title?: string; className?: string }>
    >
  )[iso2.toUpperCase()]
  if (!Flag) return null
  return <Flag title={iso2.toUpperCase()} className={className} />
}
