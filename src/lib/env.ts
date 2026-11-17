import { z } from 'zod'

const schema = z.object({
  VITE_API_URL: z
    .string()
    .trim()
    .min(1)
    .default('/api/v1')
    .transform((value) => value.replace(/\/+$/, '')),
})

export const env = schema.parse(import.meta.env)
