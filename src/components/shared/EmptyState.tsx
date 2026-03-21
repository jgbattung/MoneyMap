import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: EmptyStateAction;
  variant: 'page' | 'widget' | 'table';
}

const variantConfig = {
  page: {
    container: 'flex-1 flex flex-col items-center justify-center text-center py-16',
    iconSize: 'h-20 w-20',
    iconColor: 'text-muted-foreground/40',
    iconStrokeWidth: 1.25,
    iconMargin: 'mb-6',
    titleSize: 'text-xl md:text-2xl',
    titleWeight: 'font-semibold',
    titleColor: 'text-foreground',
    descSize: 'text-sm md:text-base',
    descColor: 'text-muted-foreground',
    descMaxWidth: 'max-w-sm',
    descMargin: 'mt-2',
    ctaMargin: 'mt-8',
  },
  widget: {
    container: 'flex flex-col items-center justify-center text-center py-8 gap-1.5',
    iconSize: 'h-8 w-8',
    iconColor: 'text-muted-foreground/40',
    iconStrokeWidth: 1.5,
    iconMargin: 'mb-1',
    titleSize: 'text-sm',
    titleWeight: 'font-medium',
    titleColor: 'text-muted-foreground',
    descSize: 'text-xs',
    descColor: 'text-muted-foreground/70',
    descMaxWidth: 'max-w-[240px]',
    descMargin: '',
    ctaMargin: 'mt-2',
  },
  table: {
    container: 'flex flex-col items-center justify-center text-center h-32 gap-1.5',
    iconSize: 'h-6 w-6',
    iconColor: 'text-muted-foreground/30',
    iconStrokeWidth: 1.5,
    iconMargin: 'mb-1',
    titleSize: 'text-sm',
    titleWeight: 'font-normal',
    titleColor: 'text-muted-foreground',
    descSize: 'text-xs',
    descColor: 'text-muted-foreground/70',
    descMaxWidth: '',
    descMargin: '',
    ctaMargin: '',
  },
};

export function EmptyState({ icon: Icon, title, description, action, variant }: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div className={config.container}>
      <Icon
        className={`${config.iconSize} ${config.iconColor} ${config.iconMargin}`}
        strokeWidth={config.iconStrokeWidth}
        aria-hidden="true"
      />
      <p className={`${config.titleSize} ${config.titleWeight} ${config.titleColor}`}>
        {title}
      </p>
      <p className={`${config.descSize} ${config.descColor} ${config.descMaxWidth}`}>
        {description}
      </p>
      {action && variant !== 'table' && (
        <div className={config.ctaMargin}>
          {action.href ? (
            variant === 'widget' ? (
              <Link
                href={action.href}
                className="text-xs text-primary hover:text-primary/80 hover:underline"
              >
                {action.label}
              </Link>
            ) : (
              <Button asChild className="h-9 md:h-10 px-4 md:px-6 text-sm md:text-base">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            )
          ) : action.onClick ? (
            <Button
              onClick={action.onClick}
              className="h-9 md:h-10 px-4 md:px-6 text-sm md:text-base"
            >
              {action.label}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
