import { randomUUID } from 'node:crypto'

import { z } from '@hono/zod-openapi'
import { count, desc, asc, eq, and } from 'drizzle-orm'

const MAX_LIST_LIMIT = 1000
const DEFAULT_LIMIT = 50

// TODO: Offer better types here
type DB = {
  select: Function
  insert: Function
  delete: Function
  update: Function
}

type PgTable = any

export function genUuid() {
  return randomUUID()
}

export const ListQueryValidator = z.object({
  sortby: z.enum(['id', 'createdAt']).optional().default('id'),
  sortdir: z.enum(['asc', 'desc']).optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_LIMIT).optional().default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
  tenant: z.string().optional(),
})

export const ListRespValidator = z.object({
  offset: z.number(),
  limit: z.number(),
  total: z.number(),
})

type TListQuery = z.infer<typeof ListQueryValidator>
type TListResp<T> = z.infer<typeof ListRespValidator> & { result: Array<T> }

export const ErrRespValidator = z.object({
  err: z.string(),
  errDescription: z.string().optional(),
})

export const ErrInsertFailed = {
  err: 'insert_failed',
  errDescription: 'Object not created'
}

export const ErrNotFound = {
  err: 'not_found',
  errDescription: 'Object not found'
}

export const ErrForbiddenDescription = {
  description: 'Forbidden',
  content: {
    'application/json': {
      schema: ErrRespValidator
    }
  }
}

export const ErrForbidden = {
  err: 'forbidden',
  errDescription:' Please check your access token'
}

export async function crudList<T>(
  db: DB,
  table: PgTable,
  query: TListQuery,
  customWhere: any = null,
  omit?: Array<keyof T>,
  customOrderBy?: any
): Promise<TListResp<T>> {
  const sortOp = query.sortdir === 'asc' ? asc : desc
  const sortProp = table[query.sortby]

  if (query.tenant) {
    if (customWhere) {
      customWhere = and(
        eq(table.tenant, query.tenant),
        customWhere
      )
    } else {
      customWhere = eq(table.tenant, query.tenant)
    }
  }

  let req: any = db.select().from(table)
  if (customWhere) {
    req = req.where(customWhere)
  }

  if (customOrderBy) {
    req = req.orderBy(customOrderBy, asc(table.id))
  } else {
    req = req.orderBy(sortOp(sortProp))
  }

  const result = (await req
    .limit(query.limit)
    .offset(query.offset)) as Array<T>

  const sanitizedResult = omit
    ? result.map((row) => {
      const { ...clean } = row
      for (const key of omit) {
        delete clean[key]
      }
      return clean
		  })
    : result

  let totalReq: any = db.select({ count: count() }).from(table)
  if (customWhere) {
    totalReq = totalReq.where(customWhere)
  }

  const totalResult = await totalReq
  const total = totalResult[0]?.count ?? 0

  return {
    result: sanitizedResult,
    offset: query.offset,
    limit: query.limit,
    total,
  }
}

export async function crudCreate<T, M>(db: DB, table: PgTable, body: M): Promise<T | null> {
  const newObject = {
    ...body,
    uuid: genUuid()
  }

  const result = (await db.insert(table).values(newObject).returning()) as Array<T>
  if (result.length > 0 && result[0]) {
    return result[0]
  }

  return null
}

export async function crudRead<T>(
  db: DB,
  table: PgTable & { uuid: any },
  uuid: string,
  omit?: Array<keyof T>
): Promise<T | null> {
  const result = (await db
    .select()
    .from(table)
    .where(eq(table.uuid, uuid))
    .limit(1)
    .offset(0)) as Array<T>

  if (result.length === 0 || !result[0]) {
    return null
  }

  const row = { ...result[0] }

  if (omit) {
    for (const key of omit) {
      delete row[key]
    }
  }

  return row
}

export async function crudDelete(db: DB, table: PgTable & { uuid: any }, uuid: string): Promise<string> {
  await db.delete(table)
    .where(eq(table.uuid, uuid))
  return uuid
}

export async function crudUpdatePatch<T, M>(db: DB, table: PgTable & { uuid: any }, uuid: string, body: M): Promise<T | null> {
  const toUpdate = {
    ...body,
    updatedAt: new Date(),
  }

  const result = (await db.update(table)
    .set(toUpdate)
    .where(eq(table.uuid, uuid))
    .returning()) as Array<T>

  if (result.length > 0 && result[0]) {
    return result[0]
  }
  return null
}
