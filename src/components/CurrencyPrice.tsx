import React from 'react';

interface CurrencyPriceProps {
  amount: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CurrencyPrice: React.FC<CurrencyPriceProps> = ({
  amount,
  className = '',
  size = 'md',
}) => {
  const formatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);

  const sizeClasses = {
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-xl font-bold tracking-tight',
    xl: 'text-2xl font-extrabold tracking-tight',
  };

  return (
    <span className={`text-slate-900 ${sizeClasses[size]} ${className}`}>
      {formatted}
    </span>
  );
};
