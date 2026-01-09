
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <header className="mb-10 border-b border-slate-200 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-slate-500 mt-3 text-lg font-medium">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
};

export default PageHeader;
