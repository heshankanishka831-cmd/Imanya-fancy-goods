import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  MapPin,
  Clock,
  Phone,
} from 'lucide-react';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactUsModal: React.FC<ContactUsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Bank Deposit Accounts"
      maxWidth="xl"
    >
      <div className="space-y-4 font-sans text-xs">
        {/* Deposit Instructions */}
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed space-y-1">
          <p className="font-bold text-xs">Deposit & Payment Instructions:</p>
          <p className="text-[11px] text-amber-800">
            Please use your <strong>Order Reference</strong> (e.g. <code>ORD-20261123-XXXX</code>) as the bank transfer remark. After transferring, send your deposit slip / screenshot directly to our WhatsApp chat for instant order confirmation.
          </p>
        </div>

        {/* Bank Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Commercial Bank */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#2C6291] text-xs">Commercial Bank of Ceylon</span>
              <span className="text-[10px] font-semibold text-slate-400">Pettah City Branch</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Account Name</span>
              <p className="font-bold text-slate-900">Imanya Fancy Goods (Pvt) Ltd</p>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-slate-900 text-sm">1000 8923 4512</span>
              <button
                type="button"
                onClick={() => handleCopy('100089234512', 'comb')}
                className="p-1 text-slate-500 hover:text-[#2C6291] transition-colors"
                title="Copy Account Number"
              >
                {copiedAccount === 'comb' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Hatton National Bank */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#4C9091] text-xs">Hatton National Bank (HNB)</span>
              <span className="text-[10px] font-semibold text-slate-400">Sea Street Branch</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Account Name</span>
              <p className="font-bold text-slate-900">Imanya Fancy Goods</p>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-mono font-bold text-slate-900 text-sm">0340 1023 9981</span>
              <button
                type="button"
                onClick={() => handleCopy('034010239981', 'hnb')}
                className="p-1 text-slate-500 hover:text-[#2C6291] transition-colors"
                title="Copy Account Number"
              >
                {copiedAccount === 'hnb' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Warehouse Location Info */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <MapPin className="h-4 w-4 text-[#2C6291]" />
            <span>Main Distribution Warehouse & Dispatch Center</span>
          </div>
          <p className="text-slate-600 leading-relaxed pl-6 text-[11px]">
            Sea Street / Keyzer Street commercial import complex, Pettah, Colombo 11, Sri Lanka.
          </p>
          <div className="flex items-center gap-2 text-slate-500 pl-6 text-[10px]">
            <Clock className="h-3.5 w-3.5" />
            <span>Mon - Sat: 8:30 AM - 6:30 PM &bull; Closed on Sundays and Mercantile Holidays</span>
          </div>
        </div>

        {/* Direct WhatsApp Contact Bar */}
        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-slate-600">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            <span>Hotline: <strong>+94 11 234 5678</strong></span>
          </div>

          <a
            href="https://wa.me/message/DP4D3LSUQPX6L1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>WhatsApp: +94 76 661 1606</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
};
