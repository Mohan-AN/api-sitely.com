import { z } from 'zod';

const cleanOptionalString = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const nameLike = (field: string, max = 100) =>
  z.preprocess(
    cleanOptionalString,
    z
      .string({ required_error: `${field} is required` })
      .min(3, `${field} must be at least 3 characters`)
      .max(max, `${field} must be at most ${max} characters`)
      .regex(/^[A-Za-z][A-Za-z0-9 ]*$/, `${field} must start with a letter and contain only letters, numbers and spaces`),
  );

const optionalNameLike = (field: string, max = 100) => nameLike(field, max).optional();

export const createClientSchema = z.object({
  name: nameLike('Name'),
  company: optionalNameLike('Company', 150),
  phone: z.preprocess(
    cleanOptionalString,
    z
      .string()
      .regex(/^[6-9]\d{9}$/, 'Phone number must start with 6-9 and contain exactly 10 digits')
      .refine((value) => !/^(\d)\1{9}$/.test(value), 'Phone number cannot contain a repeated digit pattern')
      .optional(),
  ),
  email: z.string().email().optional().or(z.literal('')),
  city: optionalNameLike('City'),
});

export const updateClientSchema = createClientSchema.partial();

export const clientListQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
