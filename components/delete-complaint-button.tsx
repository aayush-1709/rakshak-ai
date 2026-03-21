'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { deleteComplaint } from '@/lib/api';
import { useDashboardRefresh } from '@/components/dashboard/dashboard-refresh-context';
import { useLanguage } from '@/components/language-provider';

type DeleteComplaintButtonProps = {
  complaintId: string;
  /** Called after successful delete (e.g. remove from local list). */
  onDeleted?: () => void;
  /** Table row: icon-only; drawer: text button. */
  variant?: 'icon' | 'outline';
  className?: string;
};

export default function DeleteComplaintButton({
  complaintId,
  onDeleted,
  variant = 'icon',
  className,
}: DeleteComplaintButtonProps) {
  const { t } = useLanguage();
  const { bumpDataRefresh } = useDashboardRefresh();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      await deleteComplaint(complaintId);
      toast.success(t('complaints.toastDeleted'));
      bumpDataRefresh();
      onDeleted?.();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('complaints.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn('h-8 w-8 text-slate-500 hover:text-red-600', className)}
          disabled={deleting}
          aria-label={t('complaints.deleteAria')}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('gap-1.5 text-red-600 border-red-200 hover:bg-red-50', className)}
          disabled={deleting}
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          {t('complaints.delete')}
        </Button>
      )}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('complaints.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('complaints.deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
            >
              {t('complaints.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
