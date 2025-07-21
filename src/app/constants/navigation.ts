import { Icon, IconHomeFilled, IconCashBanknoteFilled, IconPigFilled, IconSwitchHorizontal } from "@tabler/icons-react";

export const navRoutes: { name: string, path: string, icon: Icon }[] = [
  { name: 'Dashboard', path: '/dashboard', icon: IconHomeFilled },
  { name: 'Accounts', path: '/accounts', icon: IconCashBanknoteFilled },
  { name: 'Transactions', path: '/transactions', icon: IconSwitchHorizontal },
  { name: 'Budgets', path: '/budgets', icon: IconPigFilled },
]