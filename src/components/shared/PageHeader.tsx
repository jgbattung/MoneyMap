interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, actions }: PageHeaderProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <h1 className="text-2xl font-semibold md:text-3xl lg:text-4xl md:font-bold">
        {title}
      </h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
