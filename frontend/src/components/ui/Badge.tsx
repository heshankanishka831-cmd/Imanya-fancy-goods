import React from 'react';
import { getStatusBadgeClass } from '../../utils/formatters';

interface BadgeProps {
  status?: string;
  variant?: 'gray' | 'blue' | 'green' | 'red' | 'amber';
  children?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  children,
  className = '',
}) => {
  let styleClass = '';

  if (status) {
    styleClass = getStatusBadgeClass(status);
  } else {
    const variants = {
      gray: 'bg-gray-100 text-gray-700 border-gray-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      red: 'bg-rose-100 text-rose-800 border-rose-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
    };
    styleClass = variants[variant || 'gray'];
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styleClass} ${className}`}>
      {children || status}
    </span>
  );
};
