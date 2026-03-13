import {
  Icon,
  IconHome,
  IconHomeFilled,
  IconCashBanknote,
  IconCashBanknoteFilled,
  IconCreditCard,
  IconCreditCardFilled,
  IconSwitchHorizontal,
  IconReceiptFilled,
  IconPig,
  IconPigFilled,
  IconWallet,
  IconCoinFilled,
  IconTrendingUp,
  IconGraphFilled,
  IconArrowsExchange,
  IconExchangeFilled,
  IconChartBar,
  IconReportAnalyticsFilled,
  IconDots,
} from "@tabler/icons-react";

export interface NavRoute {
  name: string;
  path: string;
  icon: Icon;
  activeIcon: Icon;
}

export interface NavGroup {
  label: string;
  key: string;
  routes: NavRoute[];
}

export const dashboardRoute: NavRoute = {
  name: "Dashboard",
  path: "/dashboard",
  icon: IconHome,
  activeIcon: IconHomeFilled,
};

export const navGroups: NavGroup[] = [
  {
    label: "Accounts",
    key: "accounts",
    routes: [
      { name: "Accounts", path: "/accounts", icon: IconCashBanknote, activeIcon: IconCashBanknoteFilled },
      { name: "Cards", path: "/cards", icon: IconCreditCard, activeIcon: IconCreditCardFilled },
    ],
  },
  {
    label: "Activity",
    key: "activity",
    routes: [
      { name: "Transactions", path: "/transactions", icon: IconSwitchHorizontal, activeIcon: IconReceiptFilled },
      { name: "Expenses", path: "/expenses", icon: IconWallet, activeIcon: IconCoinFilled },
      { name: "Income", path: "/income", icon: IconTrendingUp, activeIcon: IconGraphFilled },
      { name: "Transfers", path: "/transfers", icon: IconArrowsExchange, activeIcon: IconExchangeFilled },
    ],
  },
  {
    label: "Planning",
    key: "planning",
    routes: [
      { name: "Budgets", path: "/budgets", icon: IconPig, activeIcon: IconPigFilled },
      { name: "Reports", path: "/reports", icon: IconChartBar, activeIcon: IconReportAnalyticsFilled },
    ],
  },
];

// Flat list of all nav routes
export const navRoutes: NavRoute[] = [
  dashboardRoute,
  ...navGroups.flatMap((g) => g.routes),
];

export const mobileNavRoutes: NavRoute[] = [
  { name: "Dashboard", path: "/dashboard", icon: IconHome, activeIcon: IconHomeFilled },
  { name: "Accounts", path: "/accounts", icon: IconCashBanknote, activeIcon: IconCashBanknoteFilled },
  { name: "Transactions", path: "/transactions", icon: IconSwitchHorizontal, activeIcon: IconReceiptFilled },
  { name: "More", path: "/more", icon: IconDots, activeIcon: IconDots },
];
