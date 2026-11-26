import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import {
  MailCheck,
  Clock,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

interface EmailOTPVerificationPanelProps {
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
  changeEmailLabel?: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<{ expires_in_seconds: number; resend_cooldown_seconds: number }>;
  onChangeEmail?: () => void;
}

const formatSeconds = (total: number) => {
  const mins = Math.floor(Math.max(0, total) / 60);
  const secs = Math.max(0, total) % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const EmailOTPVerificationPanel: React.FC<EmailOTPVerificationPanelProps> = ({
  email,
  expiresInSeconds,
  resendCooldownSeconds,
  title = 'Verify Your Email Address',
  subtitle = 'We sent a 6-digit one-time verification code to:',
  submitLabel = 'Verify Email',
  changeEmailLabel = 'Edit Registration Details / Change Email',
  onVerify,
  onResend,
  onChangeEmail,
}) => {
  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds || 300);
  const [cooldownLeft, setCooldownLeft] = useState(resendCooldownSeconds || 60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    setSecondsLeft(expiresInSeconds || 300);
    setCooldownLeft(resendCooldownSeconds || 60);
    setOtp('');
    setError(null);
  }, [email, expiresInSeconds, resendCooldownSeconds]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanOTP = otp.replace(/[^0-9]/g, '');
    if (cleanOTP.length !== 6) {
      setError('Please enter the complete 6-digit verification code sent to your email.');
      return;
    }

    if (secondsLeft === 0) {
      setError('This verification code has expired. Please click Resend OTP to receive a new code.');
      return;
    }

    try {
      setIsVerifying(true);
      await onVerify(cleanOTP);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Verification failed. Please check your 6-digit code and try again.';
      setError(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldownLeft > 0 || isResending) return;
    setError(null);
    setInfoMessage(null);

    try {
      setIsResending(true);
      const updated = await onResend();
      setSecondsLeft(updated.expires_in_seconds || 300);
      setCooldownLeft(updated.resend_cooldown_seconds || 60);
      setOtp('');
      setInfoMessage(`A fresh 6-digit verification code has been sent to ${email}.`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Unable to resend verification email. Please verify your email address or try again.';
      setError(msg);
    } finally {
      setIsResending(false);
    }
  };

  const isExpired = secondsLeft === 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5 animate-in fade-in">
      <div className="text-center space-y-2">
        <div className="h-12 w-12 rounded-2xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center mx-auto border border-[#2C6291]/20">
          <MailCheck className="h-6 w-6" />
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900">
          <span>{email}</span>
        </div>
      </div>

      {/* Countdown & Expiry Bar */}
      <div
        className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
          isExpired
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-[#EBF2F7] border-[#2C6291]/20 text-[#1C4263]'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Clock className="h-4 w-4 shrink-0" />
          <span>
            {isExpired
              ? 'Verification code expired (5-minute limit reached).'
              : 'Code expires in 5 minutes'}
          </span>
        </div>
        <span className="font-mono font-black text-sm shrink-0">
          {formatSeconds(secondsLeft)}
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{infoMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 text-center uppercase tracking-wider">
            Enter 6-Digit Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full py-3 px-4 text-center font-mono text-2xl font-black tracking-[0.45em] text-slate-900 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:border-transparent shadow-xs"
            autoFocus
          />
          <p className="text-[11px] text-slate-400 text-center mt-1.5">
            Never share this code with anyone. Check spam/junk if you don't see it within a minute.
          </p>
        </div>

        <Button
          type="submit"
          isLoading={isVerifying}
          disabled={isVerifying || isExpired || otp.length !== 6}
          className="w-full py-2.5 bg-[#2C6291] hover:bg-[#235077] text-white font-bold rounded-xl shadow-xs"
        >
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          <span>{submitLabel}</span>
        </Button>
      </form>

      {/* Resend & Change Email Controls */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldownLeft > 0 || isResending}
          className="inline-flex items-center gap-1.5 font-bold text-[#2C6291] hover:text-[#1C4263] disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isResending ? 'animate-spin' : ''}`} />
          <span>
            {cooldownLeft > 0
              ? `Resend OTP in ${cooldownLeft}s`
              : isResending
              ? 'Sending OTP...'
              : 'Resend OTP'}
          </span>
        </button>

        {onChangeEmail && (
          <button
            type="button"
            onClick={onChangeEmail}
            className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{changeEmailLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
