// Built by vsrupeshkumar
import React from 'react';
import { cn } from '@/lib/utils';

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "row-span-1 rounded-3xl group/bento hover:shadow-xl transition duration-200 glass-panel p-6 justify-between flex flex-col space-y-4",
        className
      )}
    >
      {header}
      <div className="group-hover/bento:translate-x-2 transition duration-200">
        <div className="p-2 w-fit rounded-xl bg-white/5 mb-2">
          {icon}
        </div>
        <div className="font-bold text-slate-100 mb-1 mt-2">
          {title}
        </div>
        <div className="font-normal text-slate-400 text-sm">
          {description}
        </div>
      </div>
    </div>
  );
}
