# MoneyMap MCP connector

MoneyMap exposes a read-only MCP server at `/api/mcp`. Add it once in claude.ai as a custom connector and Claude can read your finances (net worth, trends, budgets, savings, cards, installments, transactions). It cannot change anything: no tool writes to the database.

## 1. Before you connect

1. **Apply the database migration.** The connector stores OAuth clients and tokens in three new tables. The migration is `prisma/migrations/20261113124343_add_mcp_oauth_tables`; run it yourself with `npx prisma migrate deploy` (confirm Prisma prints the database you expect first). It has already been applied to production. It only creates the tables `oauthApplication`, `oauthAccessToken` and `oauthConsent` (and their unique indexes); it does not touch any existing table.
   - Rollback: `DROP TABLE "oauthConsent", "oauthAccessToken", "oauthApplication";` (plus deleting the matching row from `_prisma_migrations`).
2. **Check `BETTER_AUTH_URL` on Vercel.** It must be the production origin (`https://money-map-beryl.vercel.app`). The OAuth discovery document uses it as the issuer, so a wrong value breaks the sign-in handshake.
3. **Deploy**, then check the endpoint answers with a challenge that names your real domain:

   ```bash
   curl -i -X POST https://money-map-beryl.vercel.app/api/mcp
   ```

   Expect `401` and `WWW-Authenticate: Bearer resource_metadata="https://money-map-beryl.vercel.app/.well-known/oauth-protected-resource"`. Also open `https://money-map-beryl.vercel.app/.well-known/oauth-authorization-server` while signed out: it must return JSON, not the sign-in page.

## 2. Add the connector in claude.ai

1. Open claude.ai, then Customize > Connectors > Add custom connector.
2. Name: `MoneyMap`. URL: `https://money-map-beryl.vercel.app/api/mcp`.
3. Leave the OAuth client settings empty so Claude registers itself automatically (Dynamic Client Registration).
4. Choose "Sign in now". A MoneyMap sign-in page opens: sign in with email and password or with Google. If you are already signed in to MoneyMap in that browser, the sign-in page is skipped.
5. Back in a chat, the MoneyMap tools appear under the connector. The same connector is available to Claude Code and to scheduled tasks on your account.

## 3. Tools and example questions

All amounts are PHP. Months are calendar months in Philippine time. Data starts in January 2026, so there is no earlier history to compare against.

| Tool | Answers |
|---|---|
| `get_snapshot` | "What is my net worth?" "How much do I have in each account?" "How am I doing this month?" |
| `get_monthly_trends` | "How much did I save each month this year?" "What is my savings rate?" |
| `get_spending_breakdown` | "Where did my money go last month?" "Is anything unusually high versus my 3-month average?" (group by category, subcategory, tag or account) |
| `get_budget_status` | "Which budgets am I about to blow?" "What will I spend by month end at this pace?" |
| `get_savings_flows` | "How much went into savings and investments this quarter?" "How many months of expenses does my emergency fund cover?" (average monthly expenses are included; Tonik holds several Stashes that MoneyMap does not split, so ask or read the hub profile for the emergency fund portion) |
| `get_pay_plan_adherence` | "Did I follow my pay plan the last few paydays?" |
| `get_credit_cards` | "What do I owe on my cards and when is each due?" |
| `get_installments` | "What installments am I still paying and how much is committed next month?" |
| `search_transactions` | "How much did the Taiwan trip cost?" (kind `expense`, tag `Taiwan`) "Show my biggest expenses in March." "When did I last pay X?" |

## 4. Sessions and tokens

- Access tokens last 1 hour. Claude refreshes them automatically.
- Refresh tokens last 30 days and a new one is issued on every refresh (the old one stays valid until it expires; this is how better-auth 1.2.12 behaves), so the connection stays alive as long as it is used at least once a month. A daily scheduled task keeps it alive.
- If the connection lapses, Claude shows the connector as needing sign-in again; sign in again and it resumes.

## 5. Revoking access

- In claude.ai, remove the connector (Customize > Connectors). This stops Claude using it but does not delete the tokens on the MoneyMap side.
- To cut access immediately, delete the rows in the `oauthAccessToken` table for that client (or all rows to sign every connector out). It is a plain SQL delete, for example `DELETE FROM "oauthAccessToken";`. A deleted token is rejected with `401` on the next request.
- Changing your MoneyMap password does not revoke existing connector tokens; delete the rows as above.

## Notes

- The connector is read-only by design. There are no write tools.
- It uses better-auth 1.2.12's `mcp` plugin. That plugin is replaced by `@better-auth/oauth-provider` in newer better-auth versions; revisit this connector (and the small compatibility shims in `src/lib/mcp/public-client.ts` and `src/lib/mcp/plugin-log-filter.ts`) whenever better-auth is upgraded.
