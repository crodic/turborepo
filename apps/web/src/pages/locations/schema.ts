import z from 'zod'

// Region Schemas
export const regionSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type RegionSchema = z.infer<typeof regionSchema>

export const regionFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
})

export type RegionFormSchema = z.infer<typeof regionFormSchema>

// Country Schemas
export const countrySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  iso2: z.string().nullable().optional(),
  iso3: z.string().nullable().optional(),
  numericCode: z.string().nullable().optional(),
  phonecode: z.string().nullable().optional(),
  capital: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  currencyName: z.string().nullable().optional(),
  currencySymbol: z.string().nullable().optional(),
  tld: z.string().nullable().optional(),
  native: z.string().nullable().optional(),
  subregion: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  regionId: z
    .union([z.string(), z.number()])
    .transform(String)
    .nullable()
    .optional(),
  region: regionSchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type CountrySchema = z.infer<typeof countrySchema>

export const countryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  iso2: z.string().max(2).nullable().optional().or(z.literal('')),
  iso3: z.string().max(3).nullable().optional().or(z.literal('')),
  numericCode: z.string().max(3).nullable().optional().or(z.literal('')),
  phonecode: z.string().max(20).nullable().optional().or(z.literal('')),
  capital: z.string().max(100).nullable().optional().or(z.literal('')),
  currency: z.string().max(10).nullable().optional().or(z.literal('')),
  currencyName: z.string().max(100).nullable().optional().or(z.literal('')),
  currencySymbol: z.string().max(20).nullable().optional().or(z.literal('')),
  tld: z.string().max(10).nullable().optional().or(z.literal('')),
  native: z.string().max(255).nullable().optional().or(z.literal('')),
  subregion: z.string().max(100).nullable().optional().or(z.literal('')),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  regionId: z.string().nullable().optional().or(z.literal('')),
})

export type CountryFormSchema = z.infer<typeof countryFormSchema>

// State Schemas
export const stateSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  countryId: z.union([z.string(), z.number()]).transform(String),
  countryCode: z.string().nullable().optional(),
  iso2: z.string().nullable().optional(),
  iso3166_2: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string().nullable().optional(),
  country: countrySchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type StateSchema = z.infer<typeof stateSchema>

export const stateFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  countryId: z.string().min(1, 'Country is required'),
  countryCode: z.string().max(2).nullable().optional().or(z.literal('')),
  iso2: z.string().max(10).nullable().optional().or(z.literal('')),
  iso3166_2: z.string().max(10).nullable().optional().or(z.literal('')),
  type: z.string().max(191).nullable().optional().or(z.literal('')),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string().max(255).nullable().optional().or(z.literal('')),
})

export type StateFormSchema = z.infer<typeof stateFormSchema>

// City Schemas
export const citySchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  name: z.string(),
  stateId: z
    .union([z.string(), z.number()])
    .transform(String)
    .nullable()
    .optional(),
  stateCode: z.string().nullable().optional(),
  countryId: z
    .union([z.string(), z.number()])
    .transform(String)
    .nullable()
    .optional(),
  countryCode: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  state: stateSchema.nullable().optional(),
  country: countrySchema.nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export type CitySchema = z.infer<typeof citySchema>

export const cityFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  stateId: z.string().nullable().optional().or(z.literal('')),
  stateCode: z.string().max(10).nullable().optional().or(z.literal('')),
  countryId: z.string().nullable().optional().or(z.literal('')),
  countryCode: z.string().max(2).nullable().optional().or(z.literal('')),
  code: z.string().max(10).nullable().optional().or(z.literal('')),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
})

export type CityFormSchema = z.infer<typeof cityFormSchema>

export const CountryColumnKey = {
  name: 'name',
  iso2: 'iso2',
  capital: 'capital',
  phonecode: 'phonecode',
  currency: 'currency',
  regionId: 'regionId',
  createdAt: 'createdAt',
} as const

export const StateColumnKey = {
  name: 'name',
  countryCode: 'countryCode',
  iso2: 'iso2',
  type: 'type',
  timezone: 'timezone',
  createdAt: 'createdAt',
} as const

export const CityColumnKey = {
  name: 'name',
  stateCode: 'stateCode',
  countryCode: 'countryCode',
  code: 'code',
  createdAt: 'createdAt',
} as const

export const RegionColumnKey = {
  name: 'name',
  createdAt: 'createdAt',
} as const
