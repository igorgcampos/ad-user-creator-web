import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const dotClass = sizeClasses[size];

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <div
        className={cn(
          'rounded-full bg-current animate-pulse',
          dotClass
        )}
        style={{ animationDelay: '0ms', animationDuration: '1000ms' }}
      />
      <div
        className={cn(
          'rounded-full bg-current animate-pulse',
          dotClass
        )}
        style={{ animationDelay: '200ms', animationDuration: '1000ms' }}
      />
      <div
        className={cn(
          'rounded-full bg-current animate-pulse',
          dotClass
        )}
        style={{ animationDelay: '400ms', animationDuration: '1000ms' }}
      />
    </div>
  );
};