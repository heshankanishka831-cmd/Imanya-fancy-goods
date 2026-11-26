import React from 'react';
import { CustomerMembership } from '../../../types';
import { formatCurrency } from '../../../utils/formatters';
import { MembershipBadge } from '../../../components/ui/MembershipBadge';
import { Award, CheckCircle2, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

interface MembershipCardProps {
  membership: CustomerMembership;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ membership }) => {
  const {
    current_tier,
    lifetime_spent,
    next_tier,
    next_tier_min_spend,
    remaining_for_next_tier,
    progress_percentage,
    is_highest_tier,
  } = membership;

  return (
    <div className="space-y-6">
      {/* 1. Main Loyalty Status Surface Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0 border border-[#2C6291]/20">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Customer Loyalty & Tier Status
                </h3>
                <MembershipBadge tier={current_tier} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic tier progression derived from verified lifetime purchases
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Cumulative Qualifying Spend
            </span>
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(lifetime_spent)}
            </span>
          </div>
        </div>

        {/* 2. Progress Indicator to Next Tier */}
        {!is_highest_tier && next_tier ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700">
                Current Level: <strong className="text-[#2C6291]">{current_tier}</strong>
              </span>
              <span className="text-slate-500">
                Target: <strong className="text-slate-900">{next_tier}</strong> ({formatCurrency(next_tier_min_spend || 0)})
              </span>
            </div>

            {/* Progress Bar Container */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-200">
              <div
                className="bg-gradient-to-r from-[#2C6291] via-[#4C9091] to-[#9AC640] h-full rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${Math.min(100, Math.max(5, progress_percentage))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{Math.round(progress_percentage)}% completed</span>
              <span>
                Spend <strong className="text-[#2C6291]">{formatCurrency(remaining_for_next_tier)}</strong> more to reach <strong>{next_tier}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20 text-[#1C4263] text-xs flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-[#2C6291] shrink-0" />
            <div>
              <p className="font-bold">You are at our highest VIP Platinum status!</p>
              <p className="text-[#235077] text-[11px] mt-0.5">
                Enjoy premier container allocations, custom carton assortments, and priority dispatch.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. 4 Tier Overview Cards (Subtle Accents: Bronze/Copper, Silver/Slate, Gold/Amber, Platinum/Cyan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bronze Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
          current_tier === 'BRONZE' ? 'border-amber-600 ring-2 ring-amber-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              Bronze Tier
            </span>
            {current_tier === 'BRONZE' && (
              <span className="text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-2 py-0.5 rounded-md">
                Active
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900">Standard Customer</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Starting membership tier for all newly registered client accounts.
          </p>
          <div className="pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Spending Threshold</span>
            <span className="font-bold text-slate-800">Rs. 0</span>
          </div>
        </div>

        {/* Silver Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
          current_tier === 'SILVER' ? 'border-slate-500 ring-2 ring-slate-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
              Silver Member
            </span>
            {current_tier === 'SILVER' && (
              <span className="text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-2 py-0.5 rounded-md">
                Active
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900">Silver Member</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Priority order handling and fast packaging queue at warehouse dispatch.
          </p>
          <div className="pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Spending Threshold</span>
            <span className="font-bold text-slate-800">Rs. 100,000</span>
          </div>
        </div>

        {/* Gold Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
          current_tier === 'GOLD' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              Gold Partner
            </span>
            {current_tier === 'GOLD' && (
              <span className="text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-2 py-0.5 rounded-md">
                Active
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900">Gold Partner</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Advance reservation on new incoming container shipments before general store release.
          </p>
          <div className="pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Spending Threshold</span>
            <span className="font-bold text-slate-800">Configured by Admin</span>
          </div>
        </div>

        {/* Platinum Card */}
        <div className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3 transition-all ${
          current_tier === 'PLATINUM' ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-300">
              Platinum VIP
            </span>
            {current_tier === 'PLATINUM' && (
              <span className="text-[10px] font-bold text-[#2C6291] bg-[#EBF2F7] px-2 py-0.5 rounded-md">
                Active
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900">Platinum VIP</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            VIP trade desk support, customized carton packaging, and top-tier import rates.
          </p>
          <div className="pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Spending Threshold</span>
            <span className="font-bold text-slate-800">Rs. 1,000,000</span>
          </div>
        </div>
      </div>
    </div>
  );
};
