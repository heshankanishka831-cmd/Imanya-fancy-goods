import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={`flex justify-center items-center p-8 ${className}`}>
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeMap[size]}`}></div>
    </div>
  );
};
