import { z } from "zod";

export const _DynamicValueSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.lazy(() => _DynamicValueSchema)),
    z.record(z.string(), z.lazy(() => _DynamicValueSchema)),
  ])
);