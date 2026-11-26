import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

function getInitials(name?: string): string {
  const clean = (name || '').trim();
  if (!clean) return '';
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className = '',
}) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>(
    src ? 'loading' : 'error'
  );

  useEffect(() => {
    if (src) {
      setImgStatus('loading');
    } else {
      setImgStatus('error');
    }
  }, [src]);

  const initials = getInitials(name);
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 flex items-center justify-center font-black select-none bg-gradient-to-br from-[#2C6291] to-[#1C4263] text-white border border-slate-200/80 shadow-xs ${sizeClass} ${className}`}
      aria-label={name ? `${name} avatar` : 'User avatar'}
    >
      {src && imgStatus !== 'error' && (
        <>
          {imgStatus === 'loading' && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
          <img
            src={src}
            alt={name || 'Customer profile'}
            loading="lazy"
            onLoad={() => setImgStatus('loaded')}
            onError={() => setImgStatus('error')}
            className={`h-full w-full object-cover transition-opacity duration-200 ${
              imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
          />
        </>
      )}

      {(!src || imgStatus === 'error') && (
        initials ? (
          <span>{initials}</span>
        ) : (
          <UserIcon className="h-1/2 w-1/2 opacity-90" />
        )
      )}
    </div>
  );
};
