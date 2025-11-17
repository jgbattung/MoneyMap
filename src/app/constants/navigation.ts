import { Icon, IconHomeFilled, IconCashBanknoteFilled, IconPigFilled, IconSwitchHorizontal, IconCreditCardFilled, IconDots, IconCreditCard, IconHome, IconCashBanknote, IconTrendingUp, IconWallet, IconArrowsExchange, IconChartBar  } from "@tabler/icons-react";

export const navRoutes: { name: string, path: string, icon: Icon }[] = [
  { name: 'Dashboard', path: '/dashboard', icon: IconHomeFilled },
  { name: 'Accounts', path: '/accounts', icon: IconCashBanknoteFilled },
  { name: 'Cards', path: '/cards', icon: IconCreditCardFilled },
  { name: 'Transactions', path: '/transactions', icon: IconSwitchHorizontal },
  { name: 'Budgets', path: '/budgets', icon: IconPigFilled },
  { name: 'Expenses', path: '/expenses', icon: IconWallet },
  { name: 'Income', path: '/income', icon: IconTrendingUp },
  { name: 'Transfers', path: '/transfers', icon: IconArrowsExchange },
  { name: 'Reports', path: '/reports', icon: IconChartBar },
];

export const mobileNavRoutes = [
  { name: 'Dashboard', path: '/dashboard', icon: IconHome },
  { name: 'Accounts', path: '/accounts', icon: IconCashBanknote },
  { name: 'Cards', path: '/cards', icon: IconCreditCard },
  { name: 'More', path: '/more', icon: IconDots },
];
