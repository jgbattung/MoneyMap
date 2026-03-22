import { UserMenu } from '@/components/shared/UserMenu'

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, actions }: PageHeaderProps) => {
  return (
    <div className="mb-6 border-b border-border pb-4">
      {/* Row 1: title + UserMenu */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
          {title}
        </h1>
        <UserMenu />
      </div>
      {/* Row 2: actions (right-aligned), only when provided */}
      {actions && (
        <div className="flex justify-end mt-3">
          {actions}
        </div>
      )}
    </div>
  );
};
