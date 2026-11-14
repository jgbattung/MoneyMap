import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { monthSchema } from "@/lib/mcp/dates";
import { getSnapshot } from "@/lib/mcp/queries/snapshot";
import { getMonthlyTrends } from "@/lib/mcp/queries/trends";
import { getSpendingBreakdown } from "@/lib/mcp/queries/spending";
import { getBudgetStatus } from "@/lib/mcp/queries/budget";
import { getSavingsFlows } from "@/lib/mcp/queries/savings";
import { getPayPlanAdherence } from "@/lib/mcp/queries/pay-plans";
import { getCreditCards } from "@/lib/mcp/queries/cards";
import { getInstallments } from "@/lib/mcp/queries/installments";
import { searchTransactions, MAX_TAKE } from "@/lib/mcp/queries/search";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const UNITS =
  "All amounts are Philippine pesos (PHP) as plain numbers. Months are calendar months in Philippine time, formatted YYYY-MM. MoneyMap data starts in January 2026, so there is no earlier history to compare against.";

const fromArg = monthSchema
  .optional()
  .describe("First month of the window, YYYY-MM. Defaults to 5 months before `to`.");
const toArg = monthSchema
  .optional()
  .describe("Last month of the window, YYYY-MM. Defaults to the current month. Windows are capped at 24 months.");

const dayArg = (what: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")
    .optional()
    .describe(what);

type ToolContext = { http?: { authInfo?: { extra?: Record<string, unknown> } } };

/**
 * Runs a query for the authenticated user. The userId comes from the verified token (set by
 * `withMcpUser`), never from tool arguments. Failures are logged and returned as an MCP error
 * result without leaking internals.
 */
export async function runForUser(
  ctx: ToolContext,
  tool: string,
  query: (userId: string) => Promise<unknown>
) {
  const userId = ctx.http?.authInfo?.extra?.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    return { isError: true, content: [{ type: "text" as const, text: "Not authenticated." }] };
  }

  try {
    const result = await query(userId);
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (error) {
    console.error(`MCP tool ${tool} failed:`, error);
    return {
      isError: true,
      content: [{ type: "text" as const, text: `The ${tool} query failed. Try again or narrow the request.` }],
    };
  }
}

export const TOOL_NAMES = [
  "get_snapshot",
  "get_monthly_trends",
  "get_spending_breakdown",
  "get_budget_status",
  "get_savings_flows",
  "get_pay_plan_adherence",
  "get_credit_cards",
  "get_installments",
  "search_transactions",
] as const;

export function registerTools(server: McpServer) {
  server.registerTool(
    "get_snapshot",
    {
      title: "Financial snapshot",
      description: `Right-now picture of the user's money: net worth, change this month, net worth target, and every account balance with totals by account type. Use it for "how am I doing" and "what is my net worth". ${UNITS}`,
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    (_args, ctx) => runForUser(ctx, "get_snapshot", (userId) => getSnapshot(userId))
  );

  server.registerTool(
    "get_monthly_trends",
    {
      title: "Monthly income, spending and savings",
      description: `Per month: income, expenses, amount saved, savings rate (null when there was no income) and month-end net worth, oldest first. Months before the first recorded transaction are never returned; \`dataStartsAt\` says where history begins, so do not invent year-over-year comparisons. Transfers between accounts are not income or expenses. ${UNITS}`,
      inputSchema: z.object({ from: fromArg, to: toArg }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "get_monthly_trends", (userId) => getMonthlyTrends(userId, args))
  );

  server.registerTool(
    "get_spending_breakdown",
    {
      title: "Spending breakdown",
      description: `Spending per month grouped by category, subcategory, tag or account, with each group's trailing 3-month average and the latest month's change against it. Use it to spot unusual spending: it supplies the comparison, you judge. Installment plans are excluded (their monthly payments count). A transaction with several tags counts under each tag. Groups with no spend are omitted. ${UNITS}`,
      inputSchema: z.object({
        from: fromArg,
        to: toArg,
        groupBy: z
          .enum(["category", "subcategory", "tag", "account"])
          .default("category")
          .describe("How to group spending. Defaults to category."),
        category: z
          .string()
          .optional()
          .describe("Only include this category (case-insensitive name). Useful with groupBy subcategory."),
      }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "get_spending_breakdown", (userId) => getSpendingBreakdown(userId, args))
  );

  server.registerTool(
    "get_budget_status",
    {
      title: "Budget status",
      description: `Budget versus spending for each budgeted category in one month: budget, spent, remaining, percent used, projected month-end spend and projected overage. The current month projects pro-rata over Philippine days elapsed; past months project to what was spent. Also lists categories that have spending but no budget. ${UNITS}`,
      inputSchema: z.object({
        month: monthSchema.optional().describe("Month to check, YYYY-MM. Defaults to the current month."),
      }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "get_budget_status", (userId) => getBudgetStatus(userId, args))
  );

  server.registerTool(
    "get_savings_flows",
    {
      title: "Savings and investment flows",
      description: `Monthly inflow, outflow and net for SAVINGS, INVESTMENT and RETIREMENT accounts, grouped by account type, with current balances, plus the average monthly expenses over the last 3 full months (use it to compute emergency fund coverage). Inflow is income plus transfers in; outflow is expenses plus transfers out. Note: the Tonik account (SAVINGS) holds several Stashes (emergency fund, MP2 fund, ETF fund, sinking fund) that MoneyMap does not split, so the balance is the total of all of them. Ask the user, or read the hub profile, for the emergency fund portion. ${UNITS}`,
      inputSchema: z.object({ from: fromArg, to: toArg }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "get_savings_flows", (userId) => getSavingsFlows(userId, args))
  );

  server.registerTool(
    "get_pay_plan_adherence",
    {
      title: "Pay plan adherence",
      description: `The latest pay divisions (the plan applied to each paycheck), newest first: pay amount, planned savings, transfers actually recorded, pending transfers and earmarks, and the net amount that actually landed in the savings, investment and retirement accounts between that pay date and the next one. Use it to check whether the user stuck to their pay plan. ${UNITS}`,
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).default(6).describe("How many recent pay divisions to return. Defaults to 6."),
      }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "get_pay_plan_adherence", (userId) => getPayPlanAdherence(userId, args))
  );

  server.registerTool(
    "get_credit_cards",
    {
      title: "Credit cards",
      description: `Every credit card with its balance, statement balances, statement and due days, the next due date and days until due (Philippine time), plus the total owed. \`balance\` is negative when money is owed; \`owed\` is the same amount as a positive number. ${UNITS}`,
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    (_args, ctx) => runForUser(ctx, "get_credit_cards", (userId) => getCreditCards(userId))
  );

  server.registerTool(
    "get_installments",
    {
      title: "Installment plans",
      description: `Installment plans (purchases paid in monthly instalments): monthly and total amount, payments made and left, amount left, start date and estimated last payment month, plus how much is already committed for next month. ${UNITS}`,
      inputSchema: z.object({
        status: z
          .enum(["ACTIVE", "ALL"])
          .default("ACTIVE")
          .describe("ACTIVE (default) or ALL to include completed plans."),
      }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "get_installments", (userId) => getInstallments(userId, args))
  );

  server.registerTool(
    "search_transactions",
    {
      title: "Search transactions",
      description: `Find individual transactions and get the total of ALL matches (not just the returned page). For cost questions such as "how much did the Taiwan trip cost", pass kind: "expense" (with tag, category or search) and read \`totalOfAllMatches\`. With the default kind "all", totals are reported separately per kind (\`totals\`) because income and expenses cannot be added together. Names for category, account and tag are matched case-insensitively against the user's own records; an unknown name returns an empty result with a note. Returns up to ${MAX_TAKE} rows per page (use skip to page, hasMore says whether more exist). Installment plan parents are excluded. ${UNITS}`,
      inputSchema: z.object({
        kind: z.enum(["expense", "income", "transfer", "all"]).default("all").describe("Which kind of transaction. Use \"expense\" for cost questions."),
        from: dayArg("Earliest date, YYYY-MM-DD, inclusive."),
        to: dayArg("Latest date, YYYY-MM-DD, inclusive."),
        search: z.string().optional().describe("Text matched against name, description, account, category, subcategory and tag names."),
        category: z.string().optional().describe("Category name (expense category, income type or transfer type)."),
        account: z.string().optional().describe("Account name (for transfers, matches either side)."),
        tag: z.string().optional().describe("Tag name, e.g. a trip or event."),
        minAmount: z.number().min(0).optional().describe("Smallest amount in PHP."),
        maxAmount: z.number().min(0).optional().describe("Largest amount in PHP."),
        sort: z.enum(["date", "amount"]).default("date").describe("Newest first (date) or largest first (amount)."),
        skip: z.number().int().min(0).max(10000).default(0).describe("Rows to skip, for paging."),
        take: z.number().int().min(1).max(MAX_TAKE).default(20).describe(`Rows to return, up to ${MAX_TAKE}. Defaults to 20.`),
      }),
      annotations: READ_ONLY,
    },
    (args, ctx) => runForUser(ctx, "search_transactions", (userId) => searchTransactions(userId, args))
  );
}
