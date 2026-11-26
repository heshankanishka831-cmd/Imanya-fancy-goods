import React, { useState, useEffect, useRef } from 'react';
import {
  Customer,
  CustomerMembership,
  Order,
  OTPChallenge,
  UpdateCustomerProfilePayload,
  User,
} from '../../../types';
import { customerApi } from '../../../services/endpoints';
import { useAuth } from '../../auth/AuthContext';
import { EmailOTPVerificationPanel } from '../../auth/EmailOTPVerificationPanel';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import { MembershipBadge } from '../../../components/ui/MembershipBadge';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Truck,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Award,
  ShoppingBag,
  Clock,
  Check,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Calendar,
  KeyRound,
  RefreshCw,
  Camera,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

interface CustomerProfileSectionProps {
  profile: Customer | null;
  user: User | null;
  membership: CustomerMembership | null;
  orders: Order[];
  isLoading?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  onProfileUpdated: (updated: Customer) => void;
  onNavigateTab: (tab: 'orders' | 'membership' | 'shop') => void;
}

interface AddressFields {
  houseNo: string;
  street: string;
  city: string;
  district: string;
  postalCode: string;
}

interface DeliveryFields extends AddressFields {
  recipientName: string;
  contactPhone: string;
}

const parseLegacyAddress = (raw?: string): AddressFields => {
  const clean = (raw || '').replace(/\s*\(Recipient:[^)]*\)\s*$/i, '').trim();
  if (!clean) {
    return { houseNo: '', street: '', city: '', district: 'Colombo', postalCode: '' };
  }
  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  const matchedDistrict = parts.find((p) =>
    SRI_LANKA_DISTRICTS.some((d) => d.toLowerCase() === p.toLowerCase())
  );
  const postalCandidate = parts[parts.length - 1]?.match(/^\d{5}$/)?.[0] || '';
  return {
    houseNo: parts[0] || '',
    street: parts[1] || '',
    city: parts[2] && parts[2] !== matchedDistrict ? parts[2] : '',
    district: matchedDistrict || 'Colombo',
    postalCode: postalCandidate,
  };
};

const parseLegacyDeliveryMeta = (raw?: string): { recipientName: string; contactPhone: string } => {
  if (!raw) return { recipientName: '', contactPhone: '' };
  const match = raw.match(/\(Recipient:\s*([^,)]+)(?:,\s*Contact:\s*([^)]+))?\)/i);
  return {
    recipientName: match?.[1]?.trim() || '',
    contactPhone: match?.[2]?.trim() || '',
  };
};

const formatAddressText = (addr: AddressFields): string =>
  [addr.houseNo, addr.street, addr.city, addr.district, addr.postalCode]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(', ');

const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) => {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 9 && digits.length <= 15;
};

export const CustomerProfileSection: React.FC<CustomerProfileSectionProps> = ({
  profile,
  user,
  membership,
  orders,
  isLoading = false,
  loadError = null,
  onRetryLoad,
  onProfileUpdated,
  onNavigateTab,
}) => {
  const { syncCustomerSession } = useAuth();
  const securityRef = useRef<HTMLDivElement>(null);
  const personalRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Profile Photo State
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Personal Info Form State
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalForm, setPersonalForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    businessName: '',
  });
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);

  // Verified Email Change State
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailChangeChallenge, setEmailChangeChallenge] = useState<OTPChallenge | null>(null);
  const [isSendingEmailOTP, setIsSendingEmailOTP] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

  // Address Form State
  const [isEditingAddresses, setIsEditingAddresses] = useState(false);
  const [resAddr, setResAddr] = useState<AddressFields>({
    houseNo: '',
    street: '',
    city: '',
    district: 'Colombo',
    postalCode: '',
  });
  const [sameAsResidential, setSameAsResidential] = useState(true);
  const [delAddr, setDelAddr] = useState<DeliveryFields>({
    recipientName: '',
    contactPhone: '',
    houseNo: '',
    street: '',
    city: '',
    district: 'Colombo',
    postalCode: '',
  });
  const [isSavingAddresses, setIsSavingAddresses] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Change Password Form State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Synchronize forms whenever authoritative backend profile refreshes
  useEffect(() => {
    if (!profile && !user) return;

    const firstName = profile?.first_name || user?.first_name || '';
    const lastName = profile?.last_name || user?.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim();

    setPersonalForm({
      firstName,
      lastName,
      phone: profile?.phone || '',
      businessName: profile?.business_name || '',
    });

    const parsedRes = parseLegacyAddress(profile?.residential_address);
    setResAddr({
      houseNo: profile?.res_house_no || parsedRes.houseNo,
      street: profile?.res_street || parsedRes.street,
      city: profile?.res_city || parsedRes.city,
      district: profile?.res_district || parsedRes.district || 'Colombo',
      postalCode: profile?.res_postal_code || parsedRes.postalCode,
    });

    const isSame =
      profile?.delivery_same_as_residential !== undefined
        ? profile.delivery_same_as_residential
        : !profile?.delivery_address ||
          profile.delivery_address.trim() === (profile.residential_address || '').trim();
    setSameAsResidential(isSame);

    const parsedDel = parseLegacyAddress(profile?.delivery_address);
    const parsedMeta = parseLegacyDeliveryMeta(profile?.delivery_address);
    setDelAddr({
      recipientName: profile?.del_recipient_name || parsedMeta.recipientName || fullName,
      contactPhone: profile?.del_phone || parsedMeta.contactPhone || profile?.phone || '',
      houseNo: profile?.del_house_no || (!isSame ? parsedDel.houseNo : ''),
      street: profile?.del_street || (!isSame ? parsedDel.street : ''),
      city: profile?.del_city || (!isSame ? parsedDel.city : ''),
      district: profile?.del_district || (!isSame ? parsedDel.district : 'Colombo') || 'Colombo',
      postalCode: profile?.del_postal_code || (!isSame ? parsedDel.postalCode : ''),
    });
  }, [profile, user]);

  // Helper to construct complete validated payload keeping unaffected fields intact
  const buildUpdatePayload = (
    nextPersonal = personalForm,
    nextRes = resAddr,
    nextSame = sameAsResidential,
    nextDel = delAddr
  ): UpdateCustomerProfilePayload => {
    const formattedRes = formatAddressText(nextRes) || profile?.residential_address || '';
    const fullName = `${nextPersonal.firstName.trim()} ${nextPersonal.lastName.trim()}`.trim();
    const formattedDelAddress = nextSame
      ? formattedRes
      : `${formatAddressText(nextDel)} (Recipient: ${nextDel.recipientName.trim() || fullName}, Contact: ${nextDel.contactPhone.trim() || nextPersonal.phone.trim()})`;

    return {
      first_name: nextPersonal.firstName.trim(),
      last_name: nextPersonal.lastName.trim(),
      email: (profile?.email || user?.email || '').trim().toLowerCase(),
      phone: nextPersonal.phone.trim(),
      business_name: nextPersonal.businessName.trim(),
      residential_address: formattedRes,
      delivery_address: formattedDelAddress,
      res_house_no: nextRes.houseNo.trim(),
      res_street: nextRes.street.trim(),
      res_city: nextRes.city.trim(),
      res_district: nextRes.district.trim(),
      res_postal_code: nextRes.postalCode.trim(),
      delivery_same_as_residential: nextSame,
      del_recipient_name: nextDel.recipientName.trim(),
      del_phone: nextDel.contactPhone.trim(),
      del_house_no: nextDel.houseNo.trim(),
      del_street: nextDel.street.trim(),
      del_city: nextDel.city.trim(),
      del_district: nextDel.district.trim(),
      del_postal_code: nextDel.postalCode.trim(),
    };
  };

  const applySavedProfile = (updated: Customer) => {
    onProfileUpdated(updated);
    syncCustomerSession(
      {
        username: updated.username || updated.email,
        email: updated.email,
        first_name: updated.first_name || personalForm.firstName.trim(),
        last_name: updated.last_name || personalForm.lastName.trim(),
        email_verified: true,
      },
      {
        business_name: updated.business_name,
        phone: updated.phone,
        residential_address: updated.residential_address,
        delivery_address: updated.delivery_address,
        address: updated.delivery_address || updated.residential_address,
        membership_tier: updated.membership_tier,
        lifetime_spent: updated.lifetime_spent,
        profile_photo_url: updated.profile_photo_url,
      }
    );
  };

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    setPhotoSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Unsupported image format. Please choose a JPG, PNG, or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError('Image file size must be 5 MB or less.');
      e.target.value = '';
      return;
    }

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const handleCancelPhotoSelection = () => {
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setUploadProgress(0);
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const handleUploadPhoto = async () => {
    if (!selectedPhotoFile) return;
    try {
      setIsUploadingPhoto(true);
      setUploadProgress(0);
      setPhotoError(null);
      const res = await customerApi.uploadProfilePhoto(selectedPhotoFile, (pct) => {
        setUploadProgress(pct);
      });
      if (res.success && res.data) {
        applySavedProfile(res.data);
        handleCancelPhotoSelection();
        setPhotoSuccess('Profile photo updated successfully.');
        setTimeout(() => setPhotoSuccess(null), 4000);
      }
    } catch (err: any) {
      setPhotoError(
        err?.response?.data?.error?.message ||
          'Failed to upload profile photo. Please ensure the file is a valid JPG, PNG, or WebP image under 5 MB.'
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profile?.profile_photo_url) return;
    try {
      setIsRemovingPhoto(true);
      setPhotoError(null);
      setPhotoSuccess(null);
      const res = await customerApi.removeProfilePhoto();
      if (res.success && res.data) {
        applySavedProfile(res.data);
        setPhotoSuccess('Profile photo removed. Default avatar restored.');
        setTimeout(() => setPhotoSuccess(null), 4000);
      }
    } catch (err: any) {
      setPhotoError(
        err?.response?.data?.error?.message || 'Failed to remove profile photo.'
      );
    } finally {
      setIsRemovingPhoto(false);
    }
  };

  // Initiate Email Change (requires OTP verification before switching active email)
  const handleInitiateEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailChangeError(null);
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!validateEmail(trimmed)) {
      setEmailChangeError('Please enter a valid email address.');
      return;
    }
    if (trimmed === (profile?.email || user?.email || '').toLowerCase()) {
      setEmailChangeError('Please enter a different email address than your current email.');
      return;
    }

    try {
      setIsSendingEmailOTP(true);
      const res = await customerApi.initiateEmailChange(trimmed);
      if (res.success && res.data) {
        setEmailChangeChallenge(res.data);
      }
    } catch (err: any) {
      setEmailChangeError(
        err?.response?.data?.error?.message ||
          'Unable to send verification code to that email address.'
      );
    } finally {
      setIsSendingEmailOTP(false);
    }
  };

  const handleVerifyEmailChange = async (otp: string) => {
    if (!emailChangeChallenge) return;
    const res = await customerApi.verifyEmailChange({
      verification_id: emailChangeChallenge.verification_id,
      new_email: emailChangeChallenge.email,
      otp,
    });
    if (res.success && res.data) {
      applySavedProfile(res.data);
      setIsChangingEmail(false);
      setEmailChangeChallenge(null);
      setNewEmailInput('');
      setPersonalSuccess(
        `Email & login ID verified and updated to ${res.data.email}.`
      );
      setTimeout(() => setPersonalSuccess(null), 5000);
    }
  };

  const handleResendEmailChangeOTP = async () => {
    if (!emailChangeChallenge) {
      throw new Error('Verification session missing.');
    }
    const res = await customerApi.resendEmailChangeOTP(emailChangeChallenge.verification_id);
    if (res.success && res.data) {
      setEmailChangeChallenge(res.data);
      return res.data;
    }
    throw new Error('Unable to resend OTP.');
  };

  // Save Personal Info
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalError(null);
    setPersonalSuccess(null);

    if (!personalForm.firstName.trim() || !personalForm.lastName.trim()) {
      setPersonalError('First Name and Last Name are required.');
      return;
    }
    if (!validatePhone(personalForm.phone.trim())) {
      setPersonalError('Please enter a valid WhatsApp phone number (9–15 digits).');
      return;
    }

    try {
      setIsSavingPersonal(true);
      const payload = buildUpdatePayload(personalForm, resAddr, sameAsResidential, delAddr);
      const res = await customerApi.updateProfile(payload);
      if (res.success && res.data) {
        applySavedProfile(res.data);
        setPersonalSuccess('Personal information updated successfully.');
        setIsEditingPersonal(false);
        setTimeout(() => setPersonalSuccess(null), 4000);
      }
    } catch (err: any) {
      setPersonalError(
        err?.response?.data?.error?.message ||
          'Could not save personal details. Please verify your entries and try again.'
      );
    } finally {
      setIsSavingPersonal(false);
    }
  };

  // Save Residential & Delivery Addresses
  const handleSaveAddresses = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    setAddressSuccess(null);

    if (
      !resAddr.houseNo.trim() ||
      !resAddr.street.trim() ||
      !resAddr.city.trim() ||
      !resAddr.district.trim()
    ) {
      setAddressError('House/Building, Street, City/Town, and District are required for Residential Address.');
      return;
    }

    if (!sameAsResidential) {
      if (
        !delAddr.houseNo.trim() ||
        !delAddr.street.trim() ||
        !delAddr.city.trim() ||
        !delAddr.district.trim()
      ) {
        setAddressError('House/Building, Street, City/Town, and District are required for Separate Delivery Address.');
        return;
      }
      if (!delAddr.contactPhone.trim() || !validatePhone(delAddr.contactPhone.trim())) {
        setAddressError('Please enter a valid Delivery Contact Number (9–15 digits).');
        return;
      }
    }

    try {
      setIsSavingAddresses(true);
      const payload = buildUpdatePayload(personalForm, resAddr, sameAsResidential, delAddr);
      const res = await customerApi.updateProfile(payload);
      if (res.success && res.data) {
        applySavedProfile(res.data);
        setAddressSuccess('Address preferences updated successfully.');
        setIsEditingAddresses(false);
        setTimeout(() => setAddressSuccess(null), 4000);
      }
    } catch (err: any) {
      setAddressError(
        err?.response?.data?.error?.message ||
          'Failed to update address details. Please try again.'
      );
    } finally {
      setIsSavingAddresses(false);
    }
  };

  // Change Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await customerApi.changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
        confirm_password: passwordForm.confirmPassword,
      });
      if (res.success) {
        setPasswordSuccess('Password updated securely!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setShowPasswordForm(false);
          setPasswordSuccess(null);
        }, 2500);
      }
    } catch (err: any) {
      setPasswordError(
        err?.response?.data?.error?.message ||
          'Failed to change password. Please verify your current password.'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-14 text-center space-y-3 shadow-xs">
        <Spinner size="lg" />
        <p className="text-xs font-semibold text-slate-500">Loading your customer profile...</p>
      </div>
    );
  }

  if (loadError && !profile) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-3 shadow-xs">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Unable to Load Profile</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{loadError}</p>
        {onRetryLoad && (
          <Button onClick={onRetryLoad} size="sm" variant="outline">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            <span>Retry</span>
          </Button>
        )}
      </div>
    );
  }

  const displayFirstName = profile?.first_name || user?.first_name || '';
  const displayLastName = profile?.last_name || user?.last_name || '';
  const displayFullName =
    `${displayFirstName} ${displayLastName}`.trim() || profile?.name || user?.username || 'Customer';
  const initials = `${(displayFirstName || displayFullName || 'C')[0]}${(displayLastName || '')[0] || ''}`.toUpperCase();

  const displayUsername = profile?.username || user?.username || '—';
  const displayEmail = profile?.email || user?.email || '—';
  const displayPhone = profile?.phone || 'Not configured';
  const currentTier = membership?.current_tier || profile?.membership_tier || 'BRONZE';
  const isAccountActive = profile ? profile.is_active : user?.is_active ?? true;
  const registrationDate = formatDate(profile?.created_at || user?.created_at || '');

  // Authoritative server-side order statistics with safe fallback
  const orderStats = profile?.order_stats || {
    total_orders: orders.length,
    completed_orders: orders.filter((o) => o.status === 'COMPLETED').length,
    pending_orders: orders.filter((o) => o.status === 'PENDING').length,
    processing_orders: orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PROCESSING').length,
    cancelled_orders: orders.filter((o) => o.status === 'CANCELLED').length,
    total_amount_spent:
      membership?.lifetime_spent ??
      profile?.lifetime_spent ??
      orders.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + (o.total_amount || 0), 0),
  };

  const hasStructuredRes = Boolean(
    profile?.res_house_no || profile?.res_street || profile?.res_city || profile?.res_district
  );
  const effectiveSameAsRes =
    profile?.delivery_same_as_residential !== undefined
      ? profile.delivery_same_as_residential
      : sameAsResidential;
  const hasStructuredDel = Boolean(
    profile?.del_house_no || profile?.del_street || profile?.del_city || profile?.del_district
  );

  const passwordScore = (() => {
    const p = passwordForm.newPassword;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* A. PROFILE OVERVIEW BANNER CARD                                           */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-gradient-to-r from-[#1C4263] via-[#2C6291] to-[#3A79AE] px-6 py-5 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              {/* Circular Profile Avatar with Camera Overlay */}
              <div className="relative group shrink-0">
                <Avatar
                  src={photoPreviewUrl || profile?.profile_photo_url}
                  name={displayFullName}
                  size="xl"
                  className="border-2 border-white/40 shadow-lg"
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoFileSelect}
                  className="hidden"
                  aria-label="Select profile photo"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto || isRemovingPhoto}
                  title="Change profile photo"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-white text-[#1C4263] hover:bg-blue-50 border border-slate-200 shadow-md flex items-center justify-center transition-transform hover:scale-105 disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                    {displayFullName}
                  </h2>
                  <MembershipBadge tier={currentTier} size="sm" />
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      isAccountActive
                        ? 'bg-emerald-500/20 text-emerald-100 border-emerald-300/30'
                        : 'bg-rose-500/20 text-rose-100 border-rose-300/30'
                    }`}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{isAccountActive ? 'Active Account' : 'Inactive'}</span>
                  </span>
                </div>

                {profile?.business_name && (
                  <p className="text-xs font-semibold text-blue-100 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{profile.business_name}</span>
                  </p>
                )}

                {/* Profile Photo Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isUploadingPhoto || isRemovingPhoto}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg border border-white/20 transition-colors disabled:opacity-50"
                  >
                    <Camera className="h-3 w-3" />
                    <span>{profile?.profile_photo_url ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {profile?.profile_photo_url && !selectedPhotoFile && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isRemovingPhoto || isUploadingPhoto}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-100 hover:text-white bg-rose-500/25 hover:bg-rose-500/40 px-2.5 py-1 rounded-lg border border-rose-300/30 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>{isRemovingPhoto ? 'Removing...' : 'Remove Photo'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditingPersonal(true);
                  setPersonalSuccess(null);
                  setPersonalError(null);
                  personalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#1C4263] hover:bg-blue-50 font-bold text-xs shadow-xs transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(true);
                  securityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 font-semibold text-xs transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>

        {/* Photo Preview / Upload Progress / Feedback Bar */}
        {(selectedPhotoFile || photoSuccess || photoError) && (
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 space-y-2.5">
            {selectedPhotoFile && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#2C6291]/20 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={photoPreviewUrl} name={displayFullName} size="md" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Preview: {selectedPhotoFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {(selectedPhotoFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to save
                    </p>
                    {isUploadingPhoto && (
                      <div className="mt-1.5 w-48 max-w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#2C6291] h-full transition-all duration-200"
                          style={{ width: `${uploadProgress || 25}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUploadPhoto}
                    isLoading={isUploadingPhoto}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    <span>Save Photo</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCancelPhotoSelection}
                    disabled={isUploadingPhoto}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    <span>Cancel</span>
                  </Button>
                </div>
              </div>
            )}

            {photoSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{photoSuccess}</span>
              </div>
            )}

            {photoError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}
          </div>
        )}

        {/* Contact & Account Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/70 px-6 py-3.5 text-xs">
          <div className="py-1.5 sm:py-0 sm:pr-4 flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-[#2C6291] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">
                Email Address (Login ID)
              </span>
              <span className="font-semibold text-slate-800 truncate block">{displayEmail}</span>
            </div>
          </div>

          <div className="py-1.5 sm:py-0 sm:px-4 flex items-center gap-2.5">
            <Phone className="h-4 w-4 text-[#6F9128] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">WhatsApp Number</span>
              <span className="font-bold text-slate-800 truncate block">{displayPhone}</span>
            </div>
          </div>

          <div className="py-1.5 sm:py-0 sm:pl-4 flex items-center gap-2.5">
            <Calendar className="h-4 w-4 text-[#4C9091] shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Registered Since</span>
              <span className="font-semibold text-slate-800 truncate block">{registrationDate}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* F. ORDER SUMMARY METRICS BAR                                              */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[#2C6291]" />
              <span>Order Summary</span>
            </h3>
            <p className="text-xs text-slate-500">
              Live purchase statistics recorded for your account
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2C6291] hover:text-[#1C4263] hover:underline self-start sm:self-auto"
          >
            <span>View Full Order History</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Orders
              </span>
              <span className="text-xl font-black text-slate-900 mt-0.5 block">
                {orderStats.total_orders}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Completed
              </span>
              <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                {orderStats.completed_orders}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Pending Orders
              </span>
              <span className="text-xl font-black text-amber-600 mt-0.5 block">
                {orderStats.pending_orders}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Spent
              </span>
              <span className="text-lg sm:text-xl font-black text-[#2C6291] mt-0.5 block truncate">
                {formatCurrency(orderStats.total_amount_spent)}
              </span>
            </div>
            <div className="h-9 w-9 rounded-xl bg-[#F4F9EC] text-[#6F9128] flex items-center justify-center shrink-0">
              <Award className="h-4 w-4" />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MAIN RESPONSIVE TWO-COLUMN WORKSPACE                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Personal Information + Address Information */}
        <div className="lg:col-span-7 space-y-6">
          {/* B. PERSONAL INFORMATION CARD */}
          <section
            ref={personalRef}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Personal Information</h3>
                  <p className="text-[11px] text-slate-500">
                    Manage your personal profile, verified email login ID, and WhatsApp number
                  </p>
                </div>
              </div>

              {!isEditingPersonal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingPersonal(true);
                    setPersonalSuccess(null);
                    setPersonalError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF2F7] hover:bg-[#DCE9F4] text-[#2C6291] font-bold text-xs transition-colors shrink-0"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            {personalSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{personalSuccess}</span>
              </div>
            )}

            {personalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{personalError}</span>
              </div>
            )}

            {isEditingPersonal ? (
              <form onSubmit={handleSavePersonal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalForm.firstName}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, firstName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalForm.lastName}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, lastName: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={personalForm.phone}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, phone: e.target.value })
                      }
                      placeholder="077 123 4567"
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business / Shop Name <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={personalForm.businessName}
                      onChange={(e) =>
                        setPersonalForm({ ...personalForm, businessName: e.target.value })
                      }
                      placeholder="e.g. Royal Fancy Stores"
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between gap-2">
                  <span>
                    Login Email: <strong className="text-slate-900">{displayEmail}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPersonal(false);
                      setIsChangingEmail(true);
                      setEmailChangeChallenge(null);
                      setEmailChangeError(null);
                      setNewEmailInput('');
                    }}
                    className="font-bold text-[#2C6291] hover:underline shrink-0"
                  >
                    Change Email via OTP
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingPersonal(false);
                      setPersonalError(null);
                      setPersonalForm({
                        firstName: profile?.first_name || user?.first_name || '',
                        lastName: profile?.last_name || user?.last_name || '',
                        phone: profile?.phone || '',
                        businessName: profile?.business_name || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={isSavingPersonal}>
                    Save Personal Info
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">First Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{displayFirstName || '—'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{displayLastName || '—'}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Email Address (Login ID)
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-900 break-all">{displayEmail}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Verified
                        </span>
                      </div>
                    </div>
                    {!isChangingEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingEmail(true);
                          setEmailChangeChallenge(null);
                          setEmailChangeError(null);
                          setNewEmailInput('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EBF2F7] text-[#2C6291] border border-slate-200 font-bold text-xs transition-colors shrink-0 self-start sm:self-center"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span>Change Email</span>
                      </button>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">WhatsApp Number</span>
                    <span className="font-bold text-[#6F9128] mt-0.5 block">{displayPhone}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Business / Shop Name</span>
                    <span className="font-semibold text-[#2C6291] mt-0.5 block">
                      {profile?.business_name || 'Individual Customer'}
                    </span>
                  </div>
                </div>

                {/* Verified Email Change Panel */}
                {isChangingEmail && (
                  <div className="p-4 rounded-2xl bg-[#EBF2F7]/50 border border-[#2C6291]/25 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black text-[#1C4263] uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-[#2C6291]" />
                        <span>Update & Verify New Email Address</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingEmail(false);
                          setEmailChangeChallenge(null);
                          setEmailChangeError(null);
                        }}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Your current email (<strong>{displayEmail}</strong>) stays active until the new email is verified via 6-digit OTP.
                    </p>

                    {emailChangeError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>{emailChangeError}</span>
                      </div>
                    )}

                    {emailChangeChallenge ? (
                      <EmailOTPVerificationPanel
                        email={emailChangeChallenge.email}
                        expiresInSeconds={emailChangeChallenge.expires_in_seconds}
                        resendCooldownSeconds={emailChangeChallenge.resend_cooldown_seconds}
                        title="Verify Your New Email"
                        subtitle="Enter the 6-digit OTP sent to:"
                        submitLabel="Verify & Update Email"
                        changeEmailLabel="Use a Different Email"
                        onVerify={handleVerifyEmailChange}
                        onResend={handleResendEmailChangeOTP}
                        onChangeEmail={() => {
                          setEmailChangeChallenge(null);
                          setEmailChangeError(null);
                        }}
                      />
                    ) : (
                      <form onSubmit={handleInitiateEmailChange} className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          required
                          value={newEmailInput}
                          onChange={(e) => setNewEmailInput(e.target.value)}
                          placeholder="Enter new email address"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                        <Button type="submit" size="sm" isLoading={isSendingEmailOTP}>
                          Send Verification OTP
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* C. ADDRESS INFORMATION CARD */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Address Information</h3>
                  <p className="text-[11px] text-slate-500">
                    Manage your residential address and islandwide delivery destination
                  </p>
                </div>
              </div>

              {!isEditingAddresses && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAddresses(true);
                    setAddressSuccess(null);
                    setAddressError(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EBF2F7] hover:bg-[#DCE9F4] text-[#2C6291] font-bold text-xs transition-colors shrink-0"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit Addresses</span>
                </button>
              )}
            </div>

            {addressSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{addressSuccess}</span>
              </div>
            )}

            {addressError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{addressError}</span>
              </div>
            )}

            {isEditingAddresses ? (
              <form onSubmit={handleSaveAddresses} className="space-y-5">
                {/* Residential Address Fields */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#2C6291]" />
                    <span>Residential Address</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        House / Building <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={resAddr.houseNo}
                        onChange={(e) => setResAddr({ ...resAddr, houseNo: e.target.value })}
                        placeholder="No. 45 / Apt 2B"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Street Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={resAddr.street}
                        onChange={(e) => setResAddr({ ...resAddr, street: e.target.value })}
                        placeholder="Temple Road"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        City / Town <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={resAddr.city}
                        onChange={(e) => setResAddr({ ...resAddr, city: e.target.value })}
                        placeholder="Maharagama"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        District <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={resAddr.district}
                        onChange={(e) => setResAddr({ ...resAddr, district: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      >
                        {SRI_LANKA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={resAddr.postalCode}
                        onChange={(e) => setResAddr({ ...resAddr, postalCode: e.target.value })}
                        placeholder="10280"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address ON/OFF Toggle */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#2C6291] shrink-0" />
                      <span className="text-xs font-bold text-slate-800">
                        Use residential address for deliveries
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {sameAsResidential
                        ? 'ON — Orders will be shipped to your residential address.'
                        : 'OFF — Ship to the separate commercial or alternate delivery address below.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        sameAsResidential
                          ? 'bg-[#EBF2F7] text-[#2C6291] border border-[#2C6291]/20'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {sameAsResidential ? 'ON' : 'OFF'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={sameAsResidential}
                      onClick={() => setSameAsResidential(!sameAsResidential)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2C6291] focus:ring-offset-1 ${
                        sameAsResidential ? 'bg-[#2C6291]' : 'bg-slate-300'
                      }`}
                      title="Toggle delivery address preference"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          sameAsResidential ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {sameAsResidential ? (
                  <div className="p-3.5 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20 text-xs text-[#1C4263] flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-[#2C6291] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[11px]">
                        Delivery Address Synchronized with Residential Address
                      </p>
                      <p className="text-[11px] text-[#235077] mt-0.5">
                        {formatAddressText(resAddr) || 'Complete your residential fields above.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-[#2C6291]" />
                      <span>Separate Delivery Address</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Recipient Name
                        </label>
                        <input
                          type="text"
                          value={delAddr.recipientName}
                          onChange={(e) =>
                            setDelAddr({ ...delAddr, recipientName: e.target.value })
                          }
                          placeholder={displayFullName}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Delivery Contact Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsResidential}
                          value={delAddr.contactPhone}
                          onChange={(e) =>
                            setDelAddr({ ...delAddr, contactPhone: e.target.value })
                          }
                          placeholder="077 123 4567"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          House / Building <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsResidential}
                          value={delAddr.houseNo}
                          onChange={(e) => setDelAddr({ ...delAddr, houseNo: e.target.value })}
                          placeholder="Suite 8"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Street Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsResidential}
                          value={delAddr.street}
                          onChange={(e) => setDelAddr({ ...delAddr, street: e.target.value })}
                          placeholder="Main Street"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          City / Town <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={!sameAsResidential}
                          value={delAddr.city}
                          onChange={(e) => setDelAddr({ ...delAddr, city: e.target.value })}
                          placeholder="Colombo 11"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          District <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={delAddr.district}
                          onChange={(e) => setDelAddr({ ...delAddr, district: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        >
                          {SRI_LANKA_DISTRICTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          value={delAddr.postalCode}
                          onChange={(e) => setDelAddr({ ...delAddr, postalCode: e.target.value })}
                          placeholder="01100"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingAddresses(false);
                      setAddressError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={isSavingAddresses}>
                    Save Address Details
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Residential View Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[#2C6291] uppercase tracking-wider">
                      Residential Address
                    </span>
                  </div>

                  {hasStructuredRes ? (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">House / Building</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.res_house_no || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Street</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.res_street || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">City / Town</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.res_city || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">District</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.res_district || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Postal Code</span>
                        <span className="font-mono font-semibold text-slate-900 text-right">
                          {profile?.res_postal_code || '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="font-semibold text-slate-800 leading-relaxed">
                      {profile?.residential_address || 'No residential address saved yet.'}
                    </p>
                  )}
                </div>

                {/* Delivery View Box */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-[#2C6291] uppercase tracking-wider">
                      Delivery Address
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        effectiveSameAsRes
                          ? 'bg-[#EBF2F7] text-[#2C6291] border-[#2C6291]/20'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {effectiveSameAsRes ? 'Same as Residential' : 'Separate Address'}
                    </span>
                  </div>

                  {effectiveSameAsRes ? (
                    <div className="p-3 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20 text-[#1C4263] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px]">
                        <Check className="h-3.5 w-3.5 text-[#2C6291]" />
                        <span>Uses Residential Address</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {profile?.delivery_address ||
                          profile?.residential_address ||
                          'Synchronized with residential address'}
                      </p>
                    </div>
                  ) : hasStructuredDel ? (
                    <div className="space-y-1.5 text-xs">
                      {profile?.del_recipient_name && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Recipient</span>
                          <span className="font-semibold text-slate-900 text-right">
                            {profile.del_recipient_name}
                          </span>
                        </div>
                      )}
                      {profile?.del_phone && (
                        <div className="flex justify-between gap-2">
                          <span className="text-slate-500">Contact</span>
                          <span className="font-semibold text-slate-900 text-right">
                            {profile.del_phone}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">House / Building</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.del_house_no || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Street</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.del_street || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">City / Town</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.del_city || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">District</span>
                        <span className="font-semibold text-slate-900 text-right">{profile?.del_district || '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Postal Code</span>
                        <span className="font-mono font-semibold text-slate-900 text-right">
                          {profile?.del_postal_code || '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="font-semibold text-slate-800 leading-relaxed">
                      {profile?.delivery_address || 'Separate delivery address not specified.'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols): Membership Information + Account Security */}
        <div className="lg:col-span-5 space-y-6">
          {/* D. MEMBERSHIP INFORMATION CARD */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Membership Status</h3>
                  <p className="text-[11px] text-slate-500">Automatically calculated from orders</p>
                </div>
              </div>
              <MembershipBadge tier={currentTier} size="sm" />
            </div>

            {membership ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Total Qualifying Spend
                    </span>
                    <span className="text-xl font-black text-slate-900">
                      {formatCurrency(membership.lifetime_spent)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">
                      Eligible Orders
                    </span>
                    <span className="text-sm font-black text-[#2C6291]">
                      {membership.eligible_orders_count}
                    </span>
                  </div>
                </div>

                {!membership.is_highest_tier && membership.next_tier ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">
                        Progress to <strong className="text-[#2C6291]">{membership.next_tier}</strong>
                      </span>
                      <span className="font-bold text-slate-900">
                        {Math.round(membership.progress_percentage)}%
                      </span>
                    </div>

                    <div className="w-full h-3 rounded-full bg-slate-100 border border-slate-200 overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#2C6291] via-[#4C9091] to-[#9AC640] transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(4, membership.progress_percentage))}%`,
                        }}
                      />
                    </div>

                    <p className="text-xs text-slate-600">
                      Remaining needed:{' '}
                      <strong className="text-[#2C6291]">
                        {formatCurrency(membership.remaining_for_next_tier)}
                      </strong>{' '}
                      to reach <strong>{membership.next_tier}</strong> (target{' '}
                      {formatCurrency(membership.next_tier_min_spend || 0)})
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20 text-xs text-[#1C4263] font-semibold">
                    You have reached our highest <strong>{currentTier}</strong> tier!
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onNavigateTab('membership')}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-[#EBF2F7] text-[#2C6291] border border-slate-200 hover:border-[#2C6291]/30 font-bold text-xs transition-colors"
                >
                  <span>View Membership Tier Benefits</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                Current tier: <strong className="text-slate-800">{currentTier}</strong>. Qualifying spend:{' '}
                <strong className="text-slate-800">
                  {formatCurrency(profile?.lifetime_spent || 0)}
                </strong>
                .
              </div>
            )}
          </section>

          {/* E. ACCOUNT SECURITY CARD */}
          <section
            ref={securityRef}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-[#EBF2F7] text-[#2C6291] flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Account Security</h3>
                  <p className="text-[11px] text-slate-500">Password protection & credentials</p>
                </div>
              </div>

              {!showPasswordForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors shrink-0"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Change Password</span>
                </button>
              )}
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            {showPasswordForm ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      required
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                      }
                      className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showCurrentPw ? 'Hide current password' : 'Show current password'}
                    >
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    New Password (min 8 chars) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      placeholder="Enter at least 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showNewPw ? 'Hide new password' : 'Show new password'}
                    >
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {passwordForm.newPassword && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 flex gap-1 h-1.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`flex-1 rounded-full ${
                              passwordScore >= level
                                ? passwordScore >= 3
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-500'
                                : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {passwordScore >= 4
                          ? 'Strong'
                          : passwordScore === 3
                          ? 'Good'
                          : passwordScore === 2
                          ? 'Fair'
                          : 'Weak'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="w-full pr-10 pl-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2C6291]"
                      placeholder="Re-enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showConfirmPw ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswordError(null);
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" isLoading={isChangingPassword}>
                    Update Password
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-600">Password Status</span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{profile?.password_status || 'Protected'}</span>
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#EBF2F7] border border-[#2C6291]/20 text-[11px] text-[#1C4263] leading-relaxed">
                  You can sign in using either your registered email (<strong>{displayEmail}</strong>) or your username (<strong>@{displayUsername}</strong>).
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
