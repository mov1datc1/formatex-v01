import { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ModalType = 'confirm' | 'danger' | 'prompt';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value?: string) => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  promptLabel?: string;
  promptPlaceholder?: string;
}

const typeStyles = {
  confirm: {
    icon: CheckCircle,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    btnGradient: 'from-blue-500 to-indigo-600',
    btnShadow: 'shadow-blue-500/20',
  },
  danger: {
    icon: AlertTriangle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    btnGradient: 'from-red-500 to-rose-600',
    btnShadow: 'shadow-red-500/20',
  },
  prompt: {
    icon: Info,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    btnGradient: 'from-blue-500 to-indigo-600',
    btnShadow: 'shadow-blue-500/20',
  },
};

export default function ConfirmModal({
  open, onClose, onConfirm, title, message,
  type = 'confirm', confirmText = 'Confirmar', cancelText = 'Cancelar',
  promptLabel, promptPlaceholder,
}: ConfirmModalProps) {
  const [promptValue, setPromptValue] = useState('');
  if (!open) return null;

  const style = typeStyles[type];
  const Icon = style.icon;

  const handleConfirm = () => {
    if (type === 'prompt' && !promptValue.trim()) return;
    onConfirm(type === 'prompt' ? promptValue.trim() : undefined);
    setPromptValue('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${style.iconBg}`}>
              <Icon size={24} className={style.iconColor} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{message}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg -mr-1 -mt-1">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {type === 'prompt' && (
            <div className="mt-4">
              {promptLabel && <label className="text-xs font-medium text-gray-500 mb-1 block">{promptLabel}</label>}
              <input
                value={promptValue}
                onChange={e => setPromptValue(e.target.value)}
                placeholder={promptPlaceholder || 'Escribe aquí...'}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors">
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={type === 'prompt' && !promptValue.trim()}
            className={`px-5 py-2.5 bg-gradient-to-r ${style.btnGradient} text-white rounded-xl font-semibold text-sm shadow-lg ${style.btnShadow} hover:opacity-90 transition-all disabled:opacity-50`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
