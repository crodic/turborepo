import z from 'zod'
import { useQuery } from '@tanstack/react-query'
import {
  type ApiMetadata,
  apiMetadataSchema,
  type PaginateQueryParams,
} from '@/global'
import http from '@/lib/http'
import { type AsyncSelectResponse } from '@/components/data-table/data-table-async-select-filter'
import {
  type CityFormSchema,
  type CitySchema,
  citySchema,
  type CountryFormSchema,
  type CountrySchema,
  countrySchema,
  type RegionFormSchema,
  type RegionSchema,
  regionSchema,
  type StateFormSchema,
  type StateSchema,
  stateSchema,
} from './schema'

// ==================== COUNTRIES ====================
export async function apiGetCountriesListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: CountrySchema[] }> {
  const response = await http.get('/countries', { params })
  return apiMetadataSchema
    .extend({
      data: z.array(countrySchema),
    })
    .parse(response.data)
}

export async function apiGetCountryById(id: string): Promise<CountrySchema> {
  const response = await http.get(`/countries/${id}`)
  return countrySchema.parse(response.data)
}

export async function apiCreateCountry(
  data: CountryFormSchema
): Promise<CountrySchema> {
  const response = await http.post('/countries', data)
  return countrySchema.parse(response.data)
}

export async function apiUpdateCountry({
  id,
  data,
}: {
  id: string
  data: CountryFormSchema
}): Promise<CountrySchema> {
  const response = await http.put(`/countries/${id}`, data)
  return countrySchema.parse(response.data)
}

export async function apiDeleteCountry(id: string) {
  return http.delete(`/countries/${id}`)
}

export const useCountriesQuery = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['countries', params],
    queryFn: () => apiGetCountriesListing(params),
  })

// ==================== STATES ====================
export async function apiGetStatesListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: StateSchema[] }> {
  const response = await http.get('/states', { params })
  return apiMetadataSchema
    .extend({
      data: z.array(stateSchema),
    })
    .parse(response.data)
}

export async function apiGetStateById(id: string): Promise<StateSchema> {
  const response = await http.get(`/states/${id}`)
  return stateSchema.parse(response.data)
}

export async function apiCreateState(
  data: StateFormSchema
): Promise<StateSchema> {
  const response = await http.post('/states', data)
  return stateSchema.parse(response.data)
}

export async function apiUpdateState({
  id,
  data,
}: {
  id: string
  data: StateFormSchema
}): Promise<StateSchema> {
  const response = await http.put(`/states/${id}`, data)
  return stateSchema.parse(response.data)
}

export async function apiDeleteState(id: string) {
  return http.delete(`/states/${id}`)
}

export const useStatesQuery = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['states', params],
    queryFn: () => apiGetStatesListing(params),
  })

// ==================== CITIES ====================
export async function apiGetCitiesListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: CitySchema[] }> {
  const response = await http.get('/cities', { params })
  return apiMetadataSchema
    .extend({
      data: z.array(citySchema),
    })
    .parse(response.data)
}

export async function apiGetCityById(id: string): Promise<CitySchema> {
  const response = await http.get(`/cities/${id}`)
  return citySchema.parse(response.data)
}

export async function apiCreateCity(data: CityFormSchema): Promise<CitySchema> {
  const response = await http.post('/cities', data)
  return citySchema.parse(response.data)
}

export async function apiUpdateCity({
  id,
  data,
}: {
  id: string
  data: CityFormSchema
}): Promise<CitySchema> {
  const response = await http.put(`/cities/${id}`, data)
  return citySchema.parse(response.data)
}

export async function apiDeleteCity(id: string) {
  return http.delete(`/cities/${id}`)
}

export const useCitiesQuery = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['cities', params],
    queryFn: () => apiGetCitiesListing(params),
  })

// ==================== REGIONS ====================
export async function apiGetRegionsListing(
  params: PaginateQueryParams
): Promise<ApiMetadata & { data: RegionSchema[] }> {
  const response = await http.get('/regions', { params })
  return apiMetadataSchema
    .extend({
      data: z.array(regionSchema),
    })
    .parse(response.data)
}

export async function apiCreateRegion(
  data: RegionFormSchema
): Promise<RegionSchema> {
  const response = await http.post('/regions', data)
  return regionSchema.parse(response.data)
}

export async function apiUpdateRegion({
  id,
  data,
}: {
  id: string
  data: RegionFormSchema
}): Promise<RegionSchema> {
  const response = await http.put(`/regions/${id}`, data)
  return regionSchema.parse(response.data)
}

export async function apiDeleteRegion(id: string) {
  return http.delete(`/regions/${id}`)
}

export const useRegionsQuery = (params: PaginateQueryParams) =>
  useQuery({
    queryKey: ['regions', params],
    queryFn: () => apiGetRegionsListing(params),
  })

// ==================== PUBLIC CASCADING SELECTORS ====================
export const usePublicRegionsQuery = () =>
  useQuery({
    queryKey: ['public-regions'],
    queryFn: async () => {
      const res = await http.get('/public/locations/regions')
      return z.array(regionSchema).parse(res.data)
    },
    staleTime: 1000 * 60 * 10,
  })

export const usePublicCountriesQuery = (regionId?: string) =>
  useQuery({
    queryKey: ['public-countries', regionId],
    queryFn: async () => {
      const res = await http.get('/public/locations/countries', {
        params: regionId ? { regionId } : undefined,
      })
      return z.array(countrySchema).parse(res.data)
    },
    staleTime: 1000 * 60 * 10,
  })

export const usePublicStatesQuery = (countryId?: string) =>
  useQuery({
    queryKey: ['public-states', countryId],
    queryFn: async () => {
      if (!countryId) return []
      const res = await http.get(
        `/public/locations/countries/${countryId}/states`
      )
      return z.array(stateSchema).parse(res.data)
    },
    enabled: !!countryId,
    staleTime: 1000 * 60 * 10,
  })

export const usePublicCitiesQuery = (stateId?: string) =>
  useQuery({
    queryKey: ['public-cities', stateId],
    queryFn: async () => {
      if (!stateId) return []
      const res = await http.get(`/public/locations/states/${stateId}/cities`)
      return z.array(citySchema).parse(res.data)
    },
    enabled: !!stateId,
    staleTime: 1000 * 60 * 10,
  })

// ==================== ASYNC SELECT FILTER FETCHERS ====================
export async function fetchCountryFilterOptions(
  params: PaginateQueryParams
): Promise<AsyncSelectResponse> {
  const page = params.page || 1
  const limit = params.per_page || params.limit || 15
  const search =
    typeof params.search === 'string' && params.search.trim()
      ? params.search.trim()
      : undefined

  const res = await http.get('/countries', {
    params: {
      page,
      limit,
      search,
      sortBy: 'name:ASC',
    },
  })

  const parsed = apiMetadataSchema
    .extend({
      data: z.array(countrySchema),
    })
    .parse(res.data)

  return {
    data: parsed.data.map((c) => ({
      label: `${c.name}${c.iso2 ? ` (${c.iso2})` : ''}`,
      value: c.iso2 || c.id,
    })),
    meta: {
      totalItems: parsed.meta.totalItems,
    },
  }
}

export async function fetchStateFilterOptions(
  params: PaginateQueryParams
): Promise<AsyncSelectResponse> {
  const page = params.page || 1
  const limit = params.per_page || params.limit || 15
  const search =
    typeof params.search === 'string' && params.search.trim()
      ? params.search.trim()
      : undefined

  const res = await http.get('/states', {
    params: {
      page,
      limit,
      search,
      sortBy: 'name:ASC',
    },
  })

  const parsed = apiMetadataSchema
    .extend({
      data: z.array(stateSchema),
    })
    .parse(res.data)

  return {
    data: parsed.data.map((s) => ({
      label: `${s.name}${s.country?.name ? ` (${s.country.name})` : s.countryCode ? ` (${s.countryCode})` : ''}`,
      value: s.iso2 || s.name,
    })),
    meta: {
      totalItems: parsed.meta.totalItems,
    },
  }
}
