'use client';

import Image from 'next/image';
import rakshakLogo from '../../logo.png';
import brandWordmark from '../../Rakshak-name.png';
import brandTagline from '../../rakshak-tagline.png';
import { useLanguage } from '@/components/language-provider';
import { cn } from '@/lib/utils';

type BrandVariant = 'sidebar' | 'navbar' | 'drawer';

interface BrandLogoFrameProps {
  className?: string;
  /** Tailwind size classes e.g. h-10 w-10 */
  imgClassName?: string;
}

export function BrandLogoFrame({ className, imgClassName }: BrandLogoFrameProps) {
  return (
    <div
      className={cn(
        'relative shrink-0 rounded-xl p-[3px]',
        'bg-gradient-to-br from-sky-50 via-white to-slate-100/90',
        'ring-1 ring-sky-200/70 shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
        className
      )}
    >
      <Image
        src={rakshakLogo}
        alt="Rakshak AI logo"
        width={56}
        height={56}
        className={cn('rounded-[10px] object-cover', imgClassName ?? 'h-10 w-10 sm:h-11 sm:w-11')}
        priority
      />
    </div>
  );
}

interface BrandTextBlockProps {
  variant?: BrandVariant;
  className?: string;
}

export function BrandTextBlock({ variant = 'sidebar', className }: BrandTextBlockProps) {
  const { t } = useLanguage();
  const isNav = variant === 'navbar';
  const isDrawer = variant === 'drawer';

  return (
    <div className={cn('min-w-0 flex-1 flex flex-col justify-center gap-1', isDrawer ? 'gap-0.5' : 'gap-1', className)}>
      <span className="sr-only">
        {t('brand.wordmark')}. {t('brand.taglineLine1')} {t('brand.taglineLine2')}
      </span>
      <Image
        src={brandWordmark}
        alt=""
        className={cn(
          'object-contain object-left w-auto h-auto',
          isNav &&
            'max-h-[30px] sm:max-h-[34px] max-w-[min(100%,280px)]',
          !isNav && !isDrawer && 'max-h-[24px] sm:max-h-[28px] max-w-[min(100%,200px)]',
          isDrawer && 'max-h-[18px] max-w-[min(100%,160px)]'
        )}
        sizes="(max-width: 640px) 200px, 280px"
        priority={isNav}
      />
      <Image
        src={brandTagline}
        alt=""
        className={cn(
          'object-contain object-left w-auto h-auto opacity-95',
          isNav && 'max-h-[18px] sm:max-h-[20px] max-w-[min(100%,320px)] mt-0.5',
          !isNav && !isDrawer && 'max-h-[14px] sm:max-h-[16px] max-w-[min(100%,220px)] mt-0.5',
          isDrawer && 'max-h-[11px] max-w-[min(100%,180px)]'
        )}
        sizes="(max-width: 640px) 220px, 320px"
      />
    </div>
  );
}

interface DashboardBrandProps {
  className?: string;
  compact?: boolean;
}

export function DashboardBrand({ className, compact }: DashboardBrandProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 min-w-0',
        compact ? 'px-3 py-3' : 'px-3 pt-4 pb-4',
        className
      )}
    >
      <BrandLogoFrame
        imgClassName={compact ? 'h-9 w-9' : 'h-10 w-10 sm:h-11 sm:w-11'}
      />
      <BrandTextBlock variant={compact ? 'drawer' : 'sidebar'} />
    </div>
  );
}
