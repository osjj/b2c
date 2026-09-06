import { z } from 'zod'

export const customerProfileSchema = z.object({
  company: z.string().trim().max(240).default(''),
  gender: z.enum(['', 'MALE', 'FEMALE', 'OTHER']).default(''),
})
export const customerDirectorySchema = customerProfileSchema.extend({
  id: z.string().cuid().optional(), expectedUpdatedAt: z.string().datetime().optional(),
  name: z.string().trim().min(1, '请填写客户名字').max(240),
  country: z.string().trim().max(100).default(''),
  email: z.union([z.literal(''), z.string().trim().email('邮箱格式不正确').max(320)]).default(''),
  phone: z.string().trim().max(100).default(''), notes: z.string().max(10000).default(''), active: z.boolean().default(true),
})
export type CustomerDirectoryInput = z.infer<typeof customerDirectorySchema>
export const customerProfileKey = (id: string) => `quotation.customer-profile.${id}`

// Existing column keeps the display name; optional company/gender use quote-only metadata.
export function directoryCustomer(row: { id: string; companyName: string; countryCode: string | null; email: string | null; phone: string | null; notes: string | null; isActive: boolean; updatedAt: Date }, profile: unknown): CustomerDirectoryInput {
  return { id: row.id, name: row.companyName, country: row.countryCode || '', email: row.email || '', phone: row.phone || '', notes: row.notes || '', active: row.isActive, expectedUpdatedAt: row.updatedAt.toISOString(), ...customerProfileSchema.parse(profile ?? {}) }
}
