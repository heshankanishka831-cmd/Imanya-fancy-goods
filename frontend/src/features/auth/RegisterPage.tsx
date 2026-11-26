import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../services/endpoints';
import { OTPChallenge } from '../../types';
import { EmailOTPVerificationPanel } from './EmailOTPVerificationPanel';
import { Button } from '../../components/ui/Button';
import {
  AlertCircle,
  ShoppingBag,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Lock,
  UserCheck,
  Truck,
  ArrowRight,
  LogIn,
} from 'lucide-react';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

type RegisterStep = 'form' | 'otp' | 'success';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<RegisterStep>('form');
  const [otpChallenge, setOtpChallenge] = useState<OTPChallenge | null>(null);
  const [verifiedMessage, setVerifiedMessage] = useState<string>('');
  const [verifiedEmail, setVerifiedEmail] = useState<string>('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    residentialAddress: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    termsAccepted: false,
  });

  // Modern ON/OFF Toggle Switch for Delivery Address (Default: ON = Same as Residential)
  const [sameAsResidential, setSameAsResidential] = useState(true);

  // Dedicated Delivery Address fields (preserved across toggles)
  const [deliveryDetails, setDeliveryDetails] = useState({
    recipientName: '',
    contactPhone: '',
    buildingNo: '',
    streetAddress: '',
    cityTown: '',
    district: 'Colombo',
    postalCode: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    return cleaned.length >= 9 && cleaned.length <= 15;
  };

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: '' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { score: 1, text: 'Weak', color: 'bg-rose-500 text-rose-600' };
    if (score === 2) return { score: 2, text: 'Fair', color: 'bg-amber-500 text-amber-600' };
    if (score === 3) return { score: 3, text: 'Good', color: 'bg-blue-500 text-blue-600' };
    return { score: 4, text: 'Strong', color: 'bg-emerald-500 text-emerald-600' };
  };

  const strength = calculatePasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('Please enter both your First Name and Last Name.');
      return;
    }

    if (!validateEmail(formData.email.trim())) {
      setError('Please provide a valid email address (e.g. buyer@gmail.com).');
      return;
    }

    if (!validatePhone(formData.phone.trim())) {
      setError('Please enter a valid WhatsApp contact number (e.g. 077 123 4567 or +94 77 123 4567).');
      return;
    }

    if (!formData.residentialAddress.trim()) {
      setError('Residential Address is required for verified registration.');
      return;
    }

    if (!sameAsResidential) {
      if (!deliveryDetails.buildingNo.trim()) {
        setError('House / Building number is required for the separate delivery address.');
        return;
      }
      if (!deliveryDetails.streetAddress.trim()) {
        setError('Street address is required for the separate delivery address.');
        return;
      }
      if (!deliveryDetails.cityTown.trim()) {
        setError('City / Town is required for the separate delivery address.');
        return;
      }
      if (deliveryDetails.contactPhone.trim() && !validatePhone(deliveryDetails.contactPhone.trim())) {
        setError('Please enter a valid delivery contact phone number.');
        return;
      }
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long for account security.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and Confirm Password do not match. Please verify your entries.');
      return;
    }

    if (!formData.termsAccepted) {
      setError('You must read and agree to the Terms & Conditions to register.');
      return;
    }

    let effectiveDeliveryAddress = formData.residentialAddress.trim();
    if (!sameAsResidential) {
      const parts = [
        deliveryDetails.buildingNo.trim(),
        deliveryDetails.streetAddress.trim(),
        deliveryDetails.cityTown.trim(),
        deliveryDetails.district.trim(),
      ];
      if (deliveryDetails.postalCode.trim()) {
        parts.push(deliveryDetails.postalCode.trim());
      }
      const addressString = parts.filter(Boolean).join(', ');
      const recipient =
        deliveryDetails.recipientName.trim() ||
        `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const phone = deliveryDetails.contactPhone.trim() || formData.phone.trim();
      effectiveDeliveryAddress = `${addressString} (Recipient: ${recipient}, Contact: ${phone})`;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const res = await authApi.initiateRegister({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        email: normalizedEmail,
        password: formData.password,
        confirm_password: formData.confirmPassword,
        phone: formData.phone.trim(),
        residential_address: formData.residentialAddress.trim(),
        business_name: formData.businessName.trim(),
        delivery_address: effectiveDeliveryAddress,
        address: effectiveDeliveryAddress,
        delivery_same_as_residential: sameAsResidential,
        ...(sameAsResidential
          ? {}
          : {
              del_recipient_name:
                deliveryDetails.recipientName.trim() ||
                `${formData.firstName.trim()} ${formData.lastName.trim()}`,
              del_phone: deliveryDetails.contactPhone.trim() || formData.phone.trim(),
              del_house_no: deliveryDetails.buildingNo.trim(),
              del_street: deliveryDetails.streetAddress.trim(),
              del_city: deliveryDetails.cityTown.trim(),
              del_district: deliveryDetails.district.trim(),
              del_postal_code: deliveryDetails.postalCode.trim(),
            }),
        terms_accepted: true,
      });

      if (res.success && res.data) {
        setOtpChallenge(res.data);
        setStep('otp');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Registration could not proceed. Please check your details and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!otpChallenge) return;
    const res = await authApi.verifyRegistrationOTP({
      verification_id: otpChallenge.verification_id,
      email: otpChallenge.email,
      otp,
    });
    if (res.success && res.data) {
      setVerifiedMessage(res.data.message);
      setVerifiedEmail(res.data.email);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleResendOTP = async () => {
    if (!otpChallenge) {
      throw new Error('Verification session expired. Please submit your registration again.');
    }
    const res = await authApi.resendRegistrationOTP({
      verification_id: otpChallenge.verification_id,
      recipient_name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
    });
    if (res.success && res.data) {
      setOtpChallenge(res.data);
      return res.data;
    }
    throw new Error('Unable to resend OTP.');
  };

  if (step === 'success') {
    return (
      <div className="max-w-lg mx-auto py-8 animate-in fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs space-y-5">
          <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Email Verified & Account Created!
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              {verifiedMessage ||
                'Your customer account is now active. Sign in using your email address and password.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#EBF2F7] border border-[#2C6291]/20 text-xs text-[#1C4263] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C6291] block">
              Your Login Email (Username)
            </span>
            <span className="font-mono font-black text-sm">{verifiedEmail}</span>
          </div>

          <Button
            type="button"
            onClick={() => navigate(`/login?email=${encodeURIComponent(verifiedEmail)}`)}
            className="w-full py-3 bg-[#2C6291] hover:bg-[#235077] text-white font-bold rounded-xl shadow-sm"
          >
            <LogIn className="h-4 w-4 mr-2" />
            <span>Sign In to Your Account</span>
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'otp' && otpChallenge) {
    return (
      <div className="max-w-lg mx-auto py-4 space-y-5">
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
          <span className="text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> 1. Details Entered
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-[#2C6291] px-2.5 py-0.5 rounded-full bg-[#EBF2F7] border border-[#2C6291]/20">
            2. Email OTP Verification
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
          <span className="text-slate-400">3. Complete</span>
        </div>

        <EmailOTPVerificationPanel
          email={otpChallenge.email}
          expiresInSeconds={otpChallenge.expires_in_seconds}
          resendCooldownSeconds={otpChallenge.resend_cooldown_seconds}
          submitLabel="Verify Email & Create Account"
          changeEmailLabel="Change Email / Edit Details"
          onVerify={handleVerifyOTP}
          onResend={handleResendOTP}
          onChangeEmail={() => {
            setError(null);
            setOtpChallenge(null);
            setStep('form');
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="h-12 w-12 bg-[#EBF2F7] text-[#2C6291] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight">Customer Registration</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Create your verified customer account. Your email address serves as your login ID.
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 font-medium shadow-2xs">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Section 1: Personal Identification */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3.5">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
            <UserCheck className="w-4 h-4 text-[#2C6291]" />
            <span>1. Personal & Contact Information</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Sunil"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Perera"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Email Address (Login ID) <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => {
                  const nextEmail = e.target.value;
                  setFormData({ ...formData, email: nextEmail });
                  if (otpChallenge && otpChallenge.email.toLowerCase() !== nextEmail.trim().toLowerCase()) {
                    setOtpChallenge(null);
                  }
                }}
                placeholder="sunil@gmail.com"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                We will send a 6-digit OTP to verify this email
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-[#6F9128]" />
                <span>WhatsApp Number <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="077 123 4567"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                Used for order slip verification & dispatch
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>Residential Address <span className="text-rose-500">*</span></span>
            </label>
            <textarea
              required
              rows={2}
              value={formData.residentialAddress}
              onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
              placeholder="e.g. No. 45, Temple Road, Maharagama"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
            />
          </div>
        </div>

        {/* Section 2: Business & Delivery Details */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3.5">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
            <Building2 className="w-4 h-4 text-[#2C6291]" />
            <span>2. Business Details & Delivery Preferences</span>
          </h4>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Business / Shop Name <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder="e.g. Perera Fancy Stores & Bookshop"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
            />
          </div>

          {/* Modern Delivery Address ON/OFF Switch */}
          <div className="pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#2C6291] shrink-0" />
                  <span className="text-xs font-bold text-slate-800">
                    Delivery Destination Address
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {sameAsResidential
                    ? 'Use residential address for deliveries.'
                    : 'Ship to a separate commercial or shop address.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  sameAsResidential
                    ? 'bg-[#EBF2F7] text-[#2C6291] border border-[#2C6291]/20'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  {sameAsResidential ? 'Same as Home' : 'Separate Address'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sameAsResidential}
                  onClick={() => setSameAsResidential(!sameAsResidential)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:ring-offset-1 ${
                    sameAsResidential ? 'bg-[#2C6291]' : 'bg-slate-300'
                  }`}
                  title="Toggle delivery address mode"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      sameAsResidential ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {sameAsResidential ? (
            <div className="p-3 bg-[#EBF2F7] border border-[#2C6291]/20 rounded-xl text-xs text-[#1C4263] flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#2C6291] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px]">Deliveries Will Be Shipped to Residential Address</p>
                <p className="text-[11px] text-[#235077]/90 mt-0.5 break-words">
                  {formData.residentialAddress.trim() ? (
                    <span>Destination: <strong>{formData.residentialAddress.trim()}</strong></span>
                  ) : (
                    <span className="italic text-slate-400">Please enter your residential address in Section 1 above.</span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <MapPin className="w-4 h-4 text-[#2C6291]" />
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Separate Delivery Destination Details
                </h5>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Delivery Recipient Name <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryDetails.recipientName}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, recipientName: e.target.value })}
                    placeholder={formData.firstName ? `${formData.firstName} ${formData.lastName}` : 'Recipient / Store Manager'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Delivery Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!sameAsResidential}
                    value={deliveryDetails.contactPhone}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, contactPhone: e.target.value })}
                    placeholder={formData.phone || '077 123 4567'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    House / Building No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!sameAsResidential}
                    value={deliveryDetails.buildingNo}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, buildingNo: e.target.value })}
                    placeholder="No. 45 / 2nd Floor"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Street Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!sameAsResidential}
                    value={deliveryDetails.streetAddress}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, streetAddress: e.target.value })}
                    placeholder="Main Street / Market Square"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    City / Town <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={!sameAsResidential}
                    value={deliveryDetails.cityTown}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, cityTown: e.target.value })}
                    placeholder="Pettah"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    District <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={deliveryDetails.district}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, district: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  >
                    {SRI_LANKA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Postal Code <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={deliveryDetails.postalCode}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, postalCode: e.target.value })}
                    placeholder="10100"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Account Security */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3.5">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
            <Lock className="w-4 h-4 text-[#2C6291]" />
            <span>3. Account Security</span>
          </h4>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
            Your verified <strong>Email Address</strong> will be used as your sign-in username — no separate username needed.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {formData.password && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4].map((stepIdx) => (
                      <div
                        key={stepIdx}
                        className={`h-full flex-1 transition-all ${
                          strength.score >= stepIdx ? strength.color.split(' ')[0] : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold ${strength.color.split(' ')[1]}`}>
                    {strength.text}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {formData.confirmPassword && (
                <div className="mt-1 flex items-center gap-1 text-[10px]">
                  {formData.password === formData.confirmPassword ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </span>
                  ) : (
                    <span className="text-rose-500 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 4: Terms & Conditions */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={formData.termsAccepted}
              onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
              className="mt-0.5 rounded border-gray-300 text-[#2C6291] focus:ring-[#2C6291] h-4 w-4"
            />
            <span className="text-gray-700 leading-relaxed">
              I agree to the <strong>Customer Terms & Conditions</strong> and acknowledge that orders are subject to verified bank transfer payment slips prior to warehouse dispatch.
            </span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.01]"
          disabled={isLoading}
        >
          {isLoading ? (
            <span>Sending Verification Code...</span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Continue & Verify Email</span>
            </span>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-[#2C6291] font-bold hover:text-[#235077] hover:underline">
          Sign in here
        </Link>
      </div>
    </div>
  );
};
