import React, { useState, useEffect } from 'react';
import { Settings, Shield, Award, Crown, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { adminApi } from '../../services/endpoints';
import { LoyaltySettingsResponse } from '../../types';

interface MembershipSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const MembershipSettingsModal: React.FC<MembershipSettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [silverSpend, setSilverSpend] = useState<number>(100000);
  const [goldSpend, setGoldSpend] = useState<number>(500000);
  const [platinumSpend, setPlatinumSpend] = useState<number>(1000000);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getMembershipSettings();
      if (res.success && res.data?.tiers) {
        for (const t of res.data.tiers) {
          if (t.tier_name === 'SILVER') setSilverSpend(t.min_spend);
          if (t.tier_name === 'GOLD') setGoldSpend(t.min_spend);
          if (t.tier_name === 'PLATINUM') setPlatinumSpend(t.min_spend);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to load membership settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Front-end validation
    if (silverSpend <= 0) {
      setError('Silver threshold must be greater than Rs. 0');
      return;
    }
    if (goldSpend <= silverSpend) {
      setError('Gold threshold must be strictly higher than Silver threshold');
      return;
    }
    if (platinumSpend <= goldSpend) {
      setError('Platinum threshold must be strictly higher than Gold threshold');
      return;
    }

    try {
      setSaving(true);
      const res = await adminApi.updateMembershipSettings({
        silver_min_spend: Number(silverSpend),
        gold_min_spend: Number(goldSpend),
        platinum_min_spend: Number(platinumSpend),
      });

      if (res.success) {
        setSuccessMsg('Membership thresholds updated successfully! All customer tiers have been recalculated.');
        if (onSaved) onSaved();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to update membership thresholds');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configure Customer Membership Thresholds" maxWidth="lg">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3.5 text-xs text-slate-300 space-y-1.5">
          <p className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-emerald-400" />
            Automatic Dynamic Tier Progression
          </p>
          <p>
            Customer ranks are calculated purely from verified lifetime customer orders. When you update spending thresholds, all customer ranks are immediately recalculated in real time.
          </p>
          <p className="text-amber-400 font-medium">
            * Note: Manual customer rank assignments are prohibited to prevent tier manipulation.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-lg text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-lg text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-sm">Loading current settings...</div>
        ) : (
          <div className="space-y-4">
            {/* Bronze (Read-only) */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-amber-900/40 bg-amber-950/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-950/60 border border-amber-700/50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-amber-200">Bronze Tier</h4>
                  <p className="text-xs text-slate-400">Default for all newly registered customers</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-slate-400 block">Minimum Spend</span>
                <span className="text-sm font-semibold text-white">Rs. 0 (Fixed)</span>
              </div>
            </div>

            {/* Silver Tier Input */}
            <div className="p-3 rounded-lg border border-slate-700/80 bg-slate-800/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center">
                    <Award className="w-4 h-4 text-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">Silver Tier Threshold</h4>
                    <p className="text-xs text-slate-400">Starting loyalty tier for established customers</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">Rs.</span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={silverSpend}
                  onChange={(e) => setSilverSpend(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Gold Tier Input */}
            <div className="p-3 rounded-lg border border-amber-600/40 bg-amber-950/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-yellow-950/60 border border-amber-500/50 flex items-center justify-center">
                    <Crown className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-200">Gold Tier Threshold</h4>
                    <p className="text-xs text-slate-400">High-volume partner tier</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">Rs.</span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={goldSpend}
                  onChange={(e) => setGoldSpend(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Platinum Tier Input */}
            <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-950/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-950/60 border border-cyan-400/50 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-200">Platinum VIP Tier Threshold</h4>
                    <p className="text-xs text-slate-400">Top-tier elite customers with priority support</p>
                  </div>
                </div>
              </div>
              <div className="relative mt-2">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">Rs.</span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={platinumSpend}
                  onChange={(e) => setPlatinumSpend(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving || loading}>
            {saving ? 'Recalculating Ranks...' : 'Save & Recalculate Tiers'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
