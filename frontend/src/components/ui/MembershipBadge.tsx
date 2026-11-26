import React from 'react';
import { Shield, Award, Crown, Sparkles } from 'lucide-react';
import { MembershipTier } from '../../types';

interface MembershipBadgeProps {
  tier?: MembershipTier | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  tier = 'BRONZE',
  size = 'sm',
  showIcon = true,
  className = '',
}) => {
  const normalizedTier = (tier || 'BRONZE').toUpperCase();

  const getTierConfig = () => {
    switch (normalizedTier) {
      case 'PLATINUM':
        return {
          label: 'Platinum VIP',
          bg: 'bg-cyan-50',
          text: 'text-cyan-800 font-bold',
          border: 'border-cyan-300',
          icon: <Sparkles className="shrink-0 text-cyan-600" />,
        };
      case 'GOLD':
        return {
          label: 'Gold Partner',
          bg: 'bg-amber-50',
          text: 'text-amber-800 font-bold',
          border: 'border-amber-300',
          icon: <Crown className="shrink-0 text-amber-600" />,
        };
      case 'SILVER':
        return {
          label: 'Silver Member',
          bg: 'bg-slate-100',
          text: 'text-slate-800 font-bold',
          border: 'border-slate-300',
          icon: <Award className="shrink-0 text-slate-600" />,
        };
      case 'BRONZE':
      default:
        return {
          label: 'Bronze Customer',
          bg: 'bg-amber-50/50',
          text: 'text-amber-900 font-semibold',
          border: 'border-amber-200',
          icon: <Shield className="shrink-0 text-amber-700" />,
        };
    }
  };

  const config = getTierConfig();

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  }[size];

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
      title={`Membership Level: ${config.label}`}
    >
      {showIcon && (
        <span className={iconSizes}>
          {React.cloneElement(config.icon, { className: `${iconSizes} shrink-0` })}
        </span>
      )}
      <span>{config.label}</span>
    </span>
  );
};
