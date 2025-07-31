import { Icon, IconHomeFilled, IconCashBanknoteFilled, IconPigFilled, IconSwitchHorizontal, IconCreditCardFilled, IconDots, IconCreditCard, IconHome, IconCashBanknote } from "@tabler/icons-react";

export const navRoutes: { name: string, path: string, icon: Icon }[] = [
  { name: 'Dashboard', path: '/dashboard', icon: IconHomeFilled },
  { name: 'Accounts', path: '/accounts', icon: IconCashBanknoteFilled },
  { name: 'Transactions', path: '/transactions', icon: IconSwitchHorizontal },
  { name: 'Budgets', path: '/budgets', icon: IconPigFilled },
  { name: 'Cards', path: '/cards', icon: IconCreditCardFilled },
];

export const mobileNavRoutes = [
  { name: 'Dashboard', path: '/dashboard', icon: IconHome },
  { name: 'Accounts', path: '/accounts', icon: IconCashBanknote },
  { name: 'Cards', path: '/cards', icon: IconCreditCard },
  { name: 'More', path: '/more', icon: IconDots },
];
