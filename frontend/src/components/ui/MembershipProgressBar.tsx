import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { CustomerMembership } from '../../types';
import { MembershipBadge } from './MembershipBadge';

interface MembershipProgressBarProps {
  membership: CustomerMembership;
  compact?: boolean;
}

export const MembershipProgressBar: React.FC<MembershipProgressBarProps> = ({
  membership,
  compact = false,
}) => {
  const {
    current_tier,
    lifetime_spent,
    next_tier,
    next_tier_min_spend,
    remaining_for_next_tier,
    progress_percentage,
    is_highest_tier,
    tier_message,
  } = membership;

  const formatCurrency = (val: number) => {
    return `Rs. ${Math.round(val).toLocaleString()}`;
  };

  if (is_highest_tier) {
    return (
      <div className="rounded-2xl border border-cyan-300 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MembershipBadge tier={current_tier} size="md" />
            <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600" />
              Highest VIP Tier Achieved
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Eligible Lifetime Spend</span>
            <span className="text-xl font-black text-slate-900">{formatCurrency(lifetime_spent)}</span>
          </div>
        </div>

        {/* 100% full progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full rounded-full bg-cyan-600 transition-all duration-700 ease-out shadow-xs"
            style={{ width: '100%' }}
          />
        </div>

        <p className="text-xs text-slate-600 flex items-start gap-1.5 leading-relaxed">
          <Sparkles className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
          <span>{tier_message}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4 ${compact ? 'py-4' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MembershipBadge tier={current_tier} size="md" />
          {next_tier && (
            <div className="flex items-center text-xs text-slate-500 gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Next Tier:</span>
              <MembershipBadge tier={next_tier} size="xs" />
            </div>
          )}
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Eligible Lifetime Spend</span>
          <span className="text-xl font-black text-slate-900">{formatCurrency(lifetime_spent)}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out shadow-xs"
          style={{ width: `${Math.max(4, Math.min(100, progress_percentage))}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Progress: <strong className="text-slate-900">{progress_percentage}%</strong></span>
        {next_tier_min_spend && (
          <span>Target: <strong className="text-slate-900">{formatCurrency(next_tier_min_spend)}</strong></span>
        )}
      </div>

      <div className="rounded-xl bg-blue-50/70 border border-blue-200 p-3 sm:p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span>{tier_message}</span>
          {remaining_for_next_tier > 0 && (
            <span className="block mt-0.5 font-bold text-blue-700">
              Only {formatCurrency(remaining_for_next_tier)} remaining to unlock {next_tier}!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
