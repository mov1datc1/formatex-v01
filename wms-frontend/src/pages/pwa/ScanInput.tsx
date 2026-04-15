import { useRef, useEffect, useState } from 'react';
import { WmsIcon } from '../../components/icons/WmsIcons';
import { Keyboard } from 'lucide-react';

interface ScanInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function ScanInput({ onScan, placeholder = 'Escanear código...', disabled = false }: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    // Auto-focus for Zebra scanner input
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onScan(trimmed);
      setValue('');
    }
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <WmsIcon.Scan size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-gray-800 border-2 border-gray-600 rounded-2xl text-white text-lg font-mono focus:border-primary-400 focus:outline-none transition-colors disabled:opacity-40"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="px-6 bg-primary-500 text-white rounded-2xl font-medium text-lg disabled:opacity-40 active:scale-95 transition-transform"
        >
          OK
        </button>
      </div>
      <button
        onClick={() => setManualMode(!manualMode)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        <Keyboard size={12} />
        {manualMode ? 'Modo escáner' : 'Ingresar manualmente'}
      </button>
    </div>
  );
}
