import { z } from 'zod';

export const productSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
}).passthrough();

export const productListSchema = z.object({
  status: z.literal('success'),
  data: z.array(productSchema),
}).passthrough();

export const singleProductResponseSchema = z.object({
  status: z.literal('success'),
  data: productSchema,
}).passthrough();

export const loginSchema = z.object({
  authentication: z.object({
    token: z.string().min(1),
    bid: z.number(),
    umail: z.string().email(),
  }).passthrough(),
}).passthrough();

export const basketSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    id: z.number(),
    Products: z.array(z.object({ id: z.number() }).passthrough()),
  }).passthrough(),
}).passthrough();
