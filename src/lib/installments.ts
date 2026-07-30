/**
 * Installment lifecycle states, as stored in
 * `ExpenseTransaction.installmentStatus`.
 *
 * This lives here rather than in a route file because Next.js App Router route
 * modules may only export the request handlers and a fixed set of config names
 * (`dynamic`, `revalidate`, ...). Exporting anything else fails the generated
 * route type-check at build time with "does not satisfy the constraint
 * '{ [x: string]: never; }'". It previously sat in
 * `src/app/api/expense-transactions/[id]/route.ts` and was imported across
 * routes from there, which broke `npm run build`.
 */
export const INSTALLMENT_STATUS = {
  active: "ACTIVE",
  cancelled: "CANCELLED",
  completed: "COMPLETED",
}
