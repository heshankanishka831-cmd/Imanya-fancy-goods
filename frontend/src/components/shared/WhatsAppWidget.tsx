import React, { useState } from 'react';
import { MessageSquare, X, ChevronRight, CreditCard, ExternalLink } from 'lucide-react';

interface WhatsAppWidgetProps {
  onOpenBankDetails?: () => void;
}

export const WhatsAppWidget: React.FC<WhatsAppWidgetProps> = ({
  onOpenBankDetails,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 font-sans">
      {/* Popover Card */}
      {isOpen && (
        <div className="mb-3 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">Imanya WhatsApp Desk</h4>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Online & Ready to Help
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Support Actions */}
          <div className="p-3.5 space-y-2 text-xs bg-slate-50">
            {/* Direct WhatsApp Chat */}
            <a
              href="https://wa.me/94766611606?text=Hello%20Imanya%20Fancy%20Goods%2C%20I%20would%20like%20to%20inquire%20about%20products%20and%20orders."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition-all text-slate-800 hover:text-emerald-900 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-bold text-xs">Chat on WhatsApp</p>
                  <p className="text-[10px] text-slate-400">Order verification & inquiries</p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
            </a>

            {/* Official Bank Accounts */}
            {onOpenBankDetails && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenBankDetails();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white hover:bg-[#EEF6F6] border border-slate-200 hover:border-[#4C9091]/30 transition-all text-left text-slate-800 hover:text-[#4C9091] group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#EEF6F6] text-[#4C9091] flex items-center justify-center shrink-0">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Official Bank Accounts</p>
                    <p className="text-[10px] text-slate-400">Commercial Bank & HNB numbers</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#4C9091]" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all"
        title="WhatsApp Support & Helpdesk"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden sm:inline">WhatsApp Help</span>
      </button>
    </div>
  );
};
