import * as z from "zod"

export const TransferTypeValidation = z.object({
  name: z.string()
    .min(1, "Transfer type name is required")
    .max(50, "Transfer type name must be less than 50 characters"),
});