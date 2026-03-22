import { UserMenu } from '@/components/shared/UserMenu'

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, actions }: PageHeaderProps) => {
  return (
    <div className="sticky top-0 z-10 bg-background pt-6 mb-3 md:mb-5">
      {/* Row 1: title + UserMenu */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
          {title}
        </h1>
        <UserMenu />
      </div>
      {/* Actions slot: below the divider, right-aligned */}
      {actions && (
        <div className="flex justify-end mt-4">
          {actions}
        </div>
      )}
    </div>
  );
};
