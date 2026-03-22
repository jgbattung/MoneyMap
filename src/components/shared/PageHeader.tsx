import { UserMenu } from '@/components/shared/UserMenu'

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, actions }: PageHeaderProps) => {
  return (
    <>
      {/* Sticky: title row only */}
      <div className="sticky top-0 z-10 bg-background pt-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
            {title}
          </h1>
          <UserMenu />
        </div>
      </div>
      {/* Non-sticky: actions slot */}
      {actions && (
        <div className="flex justify-end mt-4 mb-3 md:mb-5">
          {actions}
        </div>
      )}
      {/* Spacing when there are no actions */}
      {!actions && <div className="mb-3 md:mb-5" />}
    </>
  );
};
