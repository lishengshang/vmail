// 通用二次确认弹窗：用于不可恢复的破坏性操作，dark 主题沿用 InfoModal 的视觉词汇。
import { useTranslation } from "react-i18next";
import { Modal } from "./modal";
import ExclamationCircle from "./icons/ExclamationCircle";

interface ConfirmDialogProps {
  showModal: boolean;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({
  showModal,
  setShowModal,
  title,
  children,
  confirmLabel,
  onConfirm,
  isPending = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <Modal showModal={showModal} setShowModal={setShowModal} theme="dark">
      <div className="w-full bg-neutral-800/95 backdrop-blur-xl shadow-xl p-6 md:max-w-md md:rounded-2xl md:border md:border-cyan-50/20">
        <div className="flex items-start gap-3">
          <ExclamationCircle className="mt-0.5 size-5 shrink-0 text-red-400" />
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-white">
              {title}
            </h3>
            <div className="mt-2 text-sm text-zinc-300">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            disabled={isPending}
            className="py-2.5 rounded-md w-full bg-white/10 text-zinc-100 hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-zinc-500 transition-colors">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="py-2.5 rounded-md w-full bg-red-600 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-zinc-500 transition-colors">
            {confirmLabel ?? t("Delete")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
