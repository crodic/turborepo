type SortDirection = 'ASC' | 'DESC'

interface FilterCondition {
  field: string
  operator?: string
  value?: any
}

export class PaginateQueryBuilder {
  private pageParam?: number
  private limitParam?: number
  private cursorParam?: string
  private searchParam?: string
  private searchByParam?: string[]
  private sortBys: [string, SortDirection][] = []
  private selectParams?: string[]
  private withDeletedParam?: boolean
  private filters: FilterCondition[] = []
  private extraParams: Record<string, any> = {}

  constructor(initialParams?: Record<string, any>) {
    if (initialParams) {
      this.loadFromParams(initialParams)
    }
  }

  private loadFromParams(params: Record<string, any>): void {
    if (!params || typeof params !== 'object') return

    if (this.isValidValue(params.page)) this.pageParam = params.page
    if (this.isValidValue(params.limit)) this.limitParam = params.limit
    if (this.isValidValue(params.cursor)) this.cursorParam = params.cursor
    if (this.isValidValue(params.search)) this.searchParam = params.search

    if (Array.isArray(params.searchBy))
      this.searchByParam = params.searchBy.filter(
        (x: any) => typeof x === 'string' && x.trim() !== ''
      )

    if (Array.isArray(params.select))
      this.selectParams = params.select.filter(
        (x: any) => typeof x === 'string' && x.trim() !== ''
      )

    if (params.withDeleted === true) this.withDeletedParam = true

    if (typeof params.sort === 'string') {
      this.sortBys = params.sort.split(',').map((s: string) => {
        const [field, dir] = s.split(':')
        return [field, (dir as SortDirection) || 'ASC']
      })
    }

    if (params.filter && typeof params.filter === 'object') {
      for (const field in params.filter) {
        const cond = params.filter[field]
        if (cond !== Object(cond)) {
          this.additionalFilter(field, cond)
          continue
        }

        for (const op in cond) {
          const val = cond[op]

          this.addFilterCondition(field, op.replace(/^\$/, ''), val)
        }
      }
    }

    /** =====================
     *  extra params
     *  ===================== */
    const knownParams = new Set([
      'page',
      'limit',
      'cursor',
      'search',
      'searchBy',
      'select',
      'withDeleted',
      'sort',
      'filter',
    ])

    for (const key in params) {
      if (knownParams.has(key)) continue

      const value = params[key]
      if (!this.isValidValue(value)) continue

      this.extraParams[key] = value
    }
  }

  /**
   * Checks if a value is valid for usage in query building.
   *
   * A value is considered valid if it is not undefined, null, an empty string, an empty array, or false.
   *
   * @param {any} val The value to check.
   * @return {boolean} True if the value is valid, false otherwise.
   */
  private isValidValue(val: any): boolean {
    if (val === undefined || val === null) return false
    if (typeof val === 'string' && val.trim() === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    if (val === false) return false
    return true
  }

  /**
   * Adds a filter condition to the query builder.
   * The filter condition will be added with the given field, operator, and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * If the operator is 'null' or 'notnull', the value will be ignored.
   * If the operator is 'btw', the value must be an array with at least two elements.
   * If the operator is 'in' or 'notin', the value can be a single value or an array of values.
   * If the operator is 'contains', the value can be a single value or an array of values.
   * @param field The field to filter on.
   * @param operator The operator to use for filtering.
   * @param value The value to filter on.
   * @returns This query builder.
   */
  private addFilterCondition(
    field: string,
    operator: string,
    value?: any
  ): this {
    const op = operator.replace(/^\$/, '').toLowerCase()

    if (
      (op === 'null' || op === 'notnull') &&
      this.isValidValue(value) === false
    ) {
      this.filters.push({ field, operator: op })
      return this
    }

    if (!this.isValidValue(value)) {
      return this
    }

    if (op === 'btw') {
      if (!Array.isArray(value) || value.length < 2) return this
      const [minVal, maxVal] = value
      if (this.isValidValue(minVal) && this.isValidValue(maxVal)) {
        this.filters.push({ field, operator: 'btw', value: [minVal, maxVal] })
      }
      return this
    }

    if (op === 'in' || op === 'notin') {
      const vals = Array.isArray(value)
        ? value.filter((v) => this.isValidValue(v))
        : [value]
      if (vals.length > 0) {
        this.filters.push({ field, operator: op, value: vals })
      }
      return this
    }

    if (op === 'contains') {
      const vals = Array.isArray(value)
        ? value.filter((v) => this.isValidValue(v))
        : [value]
      if (vals.length > 0) {
        this.filters.push({ field, operator: 'contains', value: vals })
      }
      return this
    }

    this.filters.push({ field, operator: op, value })
    return this
  }

  /**
   * Adds a filter condition with the given field and value using the 'eq' operator.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   */
  public eq(field: string, value: any): this {
    return this.addFilterCondition(field, 'eq', value)
  }

  /**
   * Adds a filter condition with the given field and value using the 'not' operator.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   * */
  public not(field: string, value: any): this {
    return this.addFilterCondition(field, 'not', value)
  }

  /**
   * Adds a filter condition with the given field and values using the 'in' operator.
   * The filter condition will be added with the given field and values.
   * If the values are not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any[]} values The values to filter on.
   * @returns This query builder.
   */
  public in(field: string, values: any[]): this {
    return this.addFilterCondition(field, 'in', values)
  }

  /**
   * Adds a filter condition with the given field and values using the 'notin' operator.
   * The filter condition will be added with the given field and values.
   * If the values are not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any[]} values The values to filter on.
   * @returns This query builder.
   * */
  public notIn(field: string, values: any[]): this {
    return this.addFilterCondition(field, 'notin', values)
  }

  /**
   * Adds a filter condition with the given field and value using the 'gt' operator.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   */
  public gt(field: string, value: any): this {
    return this.addFilterCondition(field, 'gt', value)
  }

  /**
   * Adds a filter condition with the given field and value using the 'gte' operator.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   */
  public gte(field: string, value: any): this {
    return this.addFilterCondition(field, 'gte', value)
  }

  /**
   * Adds a filter condition with the given field and value using the 'lt' operator.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   */
  public lt(field: string, value: any): this {
    return this.addFilterCondition(field, 'lt', value)
  }

  /**
   * Adds a filter condition with the given field and value using the 'lte' operator.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   */
  public lte(field: string, value: any): this {
    return this.addFilterCondition(field, 'lte', value)
  }

  /**
   * Adds a filter condition with the given field and values using the 'btw' operator.
   * The filter condition will be added with the given field and values.
   * If the values are not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} min The minimum value to filter on.
   * @param {any} max The maximum value to filter on.
   * @returns This query builder.
   */
  public btw(field: string, min: any, max: any): this {
    return this.addFilterCondition(field, 'btw', [min, max])
  }

  /**
   * Adds a filter condition to the query builder to match values that are similar to a given value.
   * The filter condition will be added with the 'ilike' operator.
   * The filter value can be a string.
   * The filter condition will be added with the given field and value.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   * @example
   * qb.ilike('name', 'John Doe')
   */
  public ilike(field: string, value: any): this {
    return this.addFilterCondition(field, 'ilike', value)
  }

  /**
   * Adds a filter condition to the query builder to match values that start with a given string or strings.
   * The filter condition will be added with the 'sw' operator.
   * The filter value can be a string or an array of strings.
   * If the value is not valid (i.e. undefined, null, an empty string, an empty array, or false), the filter condition will not be added.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   * @example
   * qb.sw('name', 'John Doe')
   */
  public sw(field: string, value: any): this {
    return this.addFilterCondition(field, 'sw', value)
  }

  /**
   * Adds a filter condition to the query builder to match values that end with a given string or strings.
   * The filter condition will be added with the 'ew' operator.
   * The filter value can be a single string or an array of strings.
   * @param {string} field The field to filter on.
   * @param {any} value The value to filter on.
   * @returns This query builder.
   * @example
   * qb.ew('name', 'John Doe')
   */
  public ew(field: string, value: any): this {
    return this.addFilterCondition(field, 'ew', value)
  }

  /**
   * Adds a filter condition to the query builder to match values that are null.
   * The filter condition will be added with the 'null' operator.
   * @param field The field to filter on.
   * @returns This query builder.
   * @example
   * qb.isNull('name')
   */
  public isNull(field: string): this {
    return this.addFilterCondition(field, 'null')
  }

  /**
   * Adds a filter condition to the query builder to match values that are not null.
   * The filter condition will be added with the 'notnull' operator.
   * @param field The field to filter on.
   * @returns This query builder.
   * @example
   * qb.notNull('name')
   */
  public notNull(field: string): this {
    return this.addFilterCondition(field, 'notnull')
  }
  /**
   * Adds a filter condition to the query builder to match values that contain a given string or strings.
   * The filter condition will be added with the 'contains' operator.
   * The filter value can be a single string or an array of strings.
   * @param field The field to filter on.
   * @param values The values to filter on.
   * @returns This query builder.
   * @example
   * qb.contains('name', 'John Doe')
   * qb.contains('name', ['John Doe', 'Jane Doe'])
   */
  public contains(field: string, values: any[]): this {
    return this.addFilterCondition(field, 'contains', values)
  }

  /**
   * Adds a custom filter to the query builder.
   * The callback function will receive an `add` function as an argument.
   * The `add` function takes in three arguments: `field`, `operator`, and `value`.
   * The `add` function will add a filter condition to the query builder.
   * The callback function is expected to return nothing.
   * @example
   * qb.addFilterCustom((add) => {
   *   add('name', 'eq', 'John Doe')
   * })
   */
  public addFilterCustom(
    cb: (add: (field: string, operator: string, value?: any) => void) => void
  ): this {
    cb((field, operator, value) => {
      this.addFilterCondition(field, operator, value)
    })
    return this
  }

  /**
   * Set the page number for pagination.
   *
   * @param page - The page number to retrieve.
   * @returns This instance of PaginateQueryBuilder.
   */
  public page(page: number): this {
    if (this.isValidValue(page)) this.pageParam = page
    return this
  }
  /**
   * Set the limit for the number of items to retrieve per page.
   *
   * @param limit - The number of items to retrieve per page.
   * @returns This instance of PaginateQueryBuilder.
   */
  public limit(limit: number): this {
    if (this.isValidValue(limit)) this.limitParam = limit
    return this
  }
  /**
   * Set the cursor for pagination.
   *
   * @param cursor - The cursor string to use for pagination.
   * @returns This instance of PaginateQueryBuilder.
   */
  public cursor(cursor: string): this {
    if (this.isValidValue(cursor)) this.cursorParam = cursor
    return this
  }
  /**
   * Search for a keyword in all searchable columns.
   *
   * @param search - Keyword to search for.
   * @returns This instance of PaginateQueryBuilder.
   */
  public search(search: string): this {
    if (this.isValidValue(search)) this.searchParam = search
    return this
  }
  /**
   * Search for a keyword in a list of specific columns.
   *
   * @param columns - List of column names to search in.
   * @returns This instance of PaginateQueryBuilder.
   */
  public searchBy(columns: string[]): this {
    if (Array.isArray(columns)) {
      const validCols = columns.map((c) => c.trim()).filter((c) => c !== '')

      if (validCols.length > 0) {
        this.searchByParam = validCols
      }
    }
    return this
  }

  /**
   * Adds a list of column names to search in to the query builder.
   *
   * If `values` is provided and is an array with at least one element,
   * it will be used as the list of column names to search in. If `values`
   * is not provided or is an empty array, `defaultValues` will be used
   * instead.
   *
   * The provided list of column names will be trimmed and any empty strings
   * will be filtered out.
   *
   * @param values - List of column names to search in.
   * @param defaultValues - List of default column names to search in if `values` is not provided.
   * @returns This instance of PaginateQueryBuilder.
   * */
  public addSearchBy(
    values: string[] | undefined,
    defaultValues: string[]
  ): this {
    let cols: string[] = []

    const cleaned = Array.isArray(values)
      ? values.map((v) => v.trim()).filter((v) => v !== '')
      : undefined

    if (Array.isArray(cleaned) && cleaned.length > 0) {
      cols = cleaned
    } else {
      cols = defaultValues.map((v) => v.trim()).filter((v) => v !== '')
    }

    if (cols.length > 0) {
      this.searchByParam = cols
    }

    return this
  }

  /**
   * Sort by a field
   * @param field - Field name to sort by
   * @param direction - Sort direction (ASC or DESC)
   * @returns This instance of PaginateQueryBuilder
   */
  public sortBy(field: string, direction: SortDirection = 'ASC'): this {
    if (field && field.trim() !== '') this.sortBys.push([field, direction])
    return this
  }

  /**
   * Sort by a field in ascending order
   * @param field - Field name to sort by
   * @returns This instance of PaginateQueryBuilder
   */
  public sortByAsc(field: string): this {
    return this.sortBy(field, 'ASC')
  }
  /**
   * Sort by a field in descending order
   * @param field - Field name to sort by
   * @returns This instance of PaginateQueryBuilder
   */
  public sortByDesc(field: string): this {
    return this.sortBy(field, 'DESC')
  }
  /**
   * Select specific columns from the result set
   * @param columns - Array of column names to select
   * @returns This instance of PaginateQueryBuilder
   */
  public select(columns: string[]): this {
    if (Array.isArray(columns)) {
      const validCols = columns.filter(
        (col) => typeof col === 'string' && col.trim() !== ''
      )
      if (validCols.length > 0) this.selectParams = validCols
    }
    return this
  }
  /**
   * Include deleted records in the result set
   * @param withDeleted - Whether to include deleted records or not
   * @returns This instance of PaginateQueryBuilder
   */
  public withDeleted(withDeleted: boolean): this {
    if (withDeleted) this.withDeletedParam = true
    return this
  }

  public addExtraFilter(field: string, value: any): this {
    if (!field || field.trim() === '') return this
    if (!this.isValidValue(value)) return this

    this.extraParams[field] = value
    return this
  }

  public additionalFilter(field: string, value: any): this {
    if (!this.isValidValue(value)) return this

    this.filters.push({
      field,
      value,
    })

    return this
  }

  public toString(): string {
    const parts: string[] = []
    if (this.isValidValue(this.pageParam)) parts.push(`page=${this.pageParam}`)
    if (this.isValidValue(this.limitParam))
      parts.push(`limit=${this.limitParam}`)
    if (this.isValidValue(this.cursorParam))
      parts.push(`cursor=${encodeURIComponent(this.cursorParam!)}`)
    if (this.sortBys.length > 0) {
      const sortStr = this.sortBys.map(([f, dir]) => `${f}:${dir}`).join(',')
      parts.push(`sortBy=${encodeURIComponent(sortStr)}`)
    }
    if (this.isValidValue(this.searchParam))
      parts.push(`search=${encodeURIComponent(this.searchParam!)}`)
    if (this.searchByParam && this.searchByParam.length > 0) {
      this.searchByParam.forEach((col) => {
        parts.push(`searchBy=${col}`)
      })
    }
    if (this.selectParams && this.selectParams.length > 0)
      parts.push(`select=${this.selectParams.join(',')}`)
    if (this.withDeletedParam) parts.push(`withDeleted=true`)

    // Xây dựng các điều kiện filter
    for (const cond of this.filters) {
      const field = cond.field
      if (!cond.operator) {
        parts.push(`filter.${cond.field}=${encodeURIComponent(cond.value)}`)
        continue
      }
      const op = cond.operator.toLowerCase()
      let partValue = ''
      switch (op) {
        case 'eq':
          partValue = `$eq:${encodeURIComponent(cond.value)}`
          break
        case 'not':
          partValue = `$not:${encodeURIComponent(cond.value)}`
          break
        case 'in':
          partValue = `$in:${(cond.value as any[]).map((v) => encodeURIComponent(v)).join(',')}`
          break
        case 'notin':
          partValue = `$not:$in:${(cond.value as any[]).map((v) => encodeURIComponent(v)).join(',')}`
          break
        case 'gt':
          partValue = `$gt:${encodeURIComponent(cond.value)}`
          break
        case 'gte':
          partValue = `$gte:${encodeURIComponent(cond.value)}`
          break
        case 'lt':
          partValue = `$lt:${encodeURIComponent(cond.value)}`
          break
        case 'lte':
          partValue = `$lte:${encodeURIComponent(cond.value)}`
          break
        case 'btw':
          partValue = `$btw:${encodeURIComponent((cond.value as any[])[0])},${encodeURIComponent((cond.value as any[])[1])}`
          break
        case 'ilike':
          partValue = `$ilike:${encodeURIComponent(cond.value)}`
          break
        case 'sw':
          partValue = `$sw:${encodeURIComponent(cond.value)}`
          break
        case 'ew':
          partValue = `$ew:${encodeURIComponent(cond.value)}`
          break
        case 'null':
          partValue = `$null`
          break
        case 'notnull':
          partValue = `$not:$null`
          break
        case 'contains':
          partValue = `$contains:${(cond.value as any[]).map((v) => encodeURIComponent(v)).join(',')}`
          break
        default:
          partValue = `$${op}:${encodeURIComponent(cond.value)}`
      }
      parts.push(`filter.${field}=${partValue}`)
    }

    for (const key in this.extraParams) {
      const val = this.extraParams[key]
      if (this.isValidValue(val)) {
        parts.push(`${key}=${encodeURIComponent(val)}`)
      }
    }

    return parts.join('&')
  }

  /**
   * Build a query object based on the current state of the QueryBuilder.
   *
   * Returns an object with the following properties:
   * - page: The page number to retrieve.
   * - limit: The number of items to retrieve per page.
   * - cursor: The cursor to use for pagination.
   * - search: The search string to apply to all fields.
   * - searchBy: An array of field names to search.
   * - select: An array of field names to select.
   * - withDeleted: A boolean indicating whether to include deleted items.
   * - sort: An array of tuples containing the field name and direction to sort by.
   * - filter: An object containing the filter conditions to apply.
   *
   * @returns {Record<string, any>} A query object.
   * */
  public build(): Record<string, any> {
    const params: Record<string, any> = {}

    if (this.isValidValue(this.pageParam)) params.page = this.pageParam
    if (this.isValidValue(this.limitParam)) params.limit = this.limitParam
    if (this.isValidValue(this.cursorParam)) params.cursor = this.cursorParam
    if (this.isValidValue(this.searchParam)) params.search = this.searchParam
    if (this.searchByParam && this.searchByParam.length > 0)
      params.searchBy = this.searchByParam
    if (this.selectParams && this.selectParams.length > 0)
      params.select = this.selectParams
    if (this.withDeletedParam) params.withDeleted = true
    if (this.sortBys.length > 0)
      params.sort = this.sortBys.map(([f, dir]) => `${f}:${dir}`).join(',')

    // Build filter object
    if (this.filters.length > 0) {
      const filterObj: Record<string, any> = {}
      this.filters.forEach((cond) => {
        if (!cond.operator) {
          filterObj[cond.field] = cond.value
          return
        }
        const op = cond.operator.toLowerCase()
        switch (op) {
          case 'eq':
            filterObj[cond.field] = { $eq: cond.value }
            break
          case 'not':
            filterObj[cond.field] = { $not: cond.value }
            break
          case 'in':
            filterObj[cond.field] = { $in: cond.value }
            break
          case 'notin':
            filterObj[cond.field] = { $notin: cond.value }
            break
          case 'gt':
            filterObj[cond.field] = { $gt: cond.value }
            break
          case 'gte':
            filterObj[cond.field] = { $gte: cond.value }
            break
          case 'lt':
            filterObj[cond.field] = { $lt: cond.value }
            break
          case 'lte':
            filterObj[cond.field] = { $lte: cond.value }
            break
          case 'btw':
            filterObj[cond.field] = { $btw: cond.value }
            break
          case 'ilike':
            filterObj[cond.field] = { $ilike: cond.value }
            break
          case 'sw':
            filterObj[cond.field] = { $sw: cond.value }
            break
          case 'ew':
            filterObj[cond.field] = { $ew: cond.value }
            break
          case 'null':
            filterObj[cond.field] = { $null: true }
            break
          case 'notnull':
            filterObj[cond.field] = { $not: { $null: true } }
            break
          case 'contains':
            filterObj[cond.field] = { $contains: cond.value }
            break
          default:
            filterObj[cond.field] = { [op]: cond.value }
        }
      })
      params.filter = filterObj
    }

    for (const key in this.extraParams) {
      params[key] = this.extraParams[key]
    }

    return params
  }

  /**
   * Converts the current state of the QueryBuilder into a query string.
   *
   * If params is not provided, it will use the current state of the QueryBuilder.
   *
   * The query string is built by iterating over the params object and
   * constructing a query string in the following format:
   * key1=value1&key2=value2&...&keyN=valueN
   *
   * If a value is an array, it will be joined by a comma (, ) and
   * if a value is an object, it will be treated as a filter object and
   * will be converted into a query string in the following format:
   * filter.field1=$op1:$val1&filter.field2=$op2:$val2&...&filter.fieldN=$opN:$valN
   *
   * @param {Record<string, any>} [params] The params object to use.
   * @returns {string} The query string.
   * */
  public toQueryString(params?: Record<string, any>): string {
    const p = params || this.build()
    const parts: string[] = []

    for (const key in p) {
      const value = p[key]
      if (value === undefined || value === null) continue

      if (key === 'filter' && typeof value === 'object') {
        for (const field in value) {
          const cond = value[field]

          if (cond !== Object(cond)) {
            parts.push(`filter.${field}=${cond}`)
            continue
          }

          for (const op in cond) {
            const val = cond[op]
            if (Array.isArray(val)) {
              // btw, in, contains: join bằng dấu phẩy
              parts.push(`filter.${field}=${op}:${val.join(',')}`)
            } else {
              parts.push(`filter.${field}=${op}:${val}`)
            }
          }
        }
      } else if (Array.isArray(value)) {
        if (key === 'searchBy') {
          // chuẩn nestjs-paginate: searchBy=email&searchBy=username
          value.forEach((v) => {
            parts.push(`${key}=${v}`)
          })
        } else {
          // giữ nguyên behavior cũ cho các key khác
          parts.push(`${key}=${value.join(',')}`)
        }
      } else {
        parts.push(`${key}=${value}`)
      }
    }

    return parts.join('&')
  }
}
