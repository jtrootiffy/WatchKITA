import { z } from 'zod'
import { badRequest } from '../lib/errors.js'

export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw badRequest(issue?.message ?? 'Invalid request parameters.')
  }
  return result.data as z.output<S>
}

export const titleIdSchema = z
  .string()
  .regex(/^\d{1,10}$/, 'A numeric title id is required.')

export const regionSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'Region must be a two-letter country code.')
  .transform((value) => value.toUpperCase())

export const searchTermSchema = z
  .string()
  .trim()
  .min(2, 'Enter at least two characters to search.')
  .max(80, 'Search terms must be 80 characters or fewer.')

export const typeFilterSchema = z.enum(['all', 'movie', 'tv']).default('all')
