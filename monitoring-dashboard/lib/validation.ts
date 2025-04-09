import { z } from "zod"

// Alert creation schema
export const alertSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(5).max(500),
  severity: z.enum(["critical", "warning", "info"]),
  resource: z.string().min(1),
})

// Time range schema
export const timeRangeSchema = z
  .object({
    start: z.date(),
    end: z.date(),
    label: z.string(),
  })
  .refine((data) => data.start < data.end, {
    message: "Start date must be before end date",
    path: ["start"],
  })

// Custom time range schema
export const customTimeRangeSchema = z
  .object({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.start < data.end, {
    message: "Start date must be before end date",
    path: ["start"],
  })

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
