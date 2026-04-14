import React from 'react';

interface DiceInputProps {
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** Etiqueta debajo (ej: "Dado 1") */
  label?: string;
}

const SIZES = {
  sm: 'w-12 h-12 text-2xl rounded-xl',
  md: 'w-16 h-16 text-4xl rounded-2xl',
  lg: 'w-20 h-20 text-5xl rounded-2xl',
};

/**
 * DiceInput — input numérico simple para cargar el valor de un dado físico (1-6).
 * El barbero/cliente tira los dados reales y escribe el resultado.
 * - Acepta solo dígitos 1-6
 * - Caja grande, font display, focus highlight
 * - Selecciona automáticamente al focus para sobreescribir rápido
 */
export const DiceInput: React.FC<DiceInputProps> = ({
  value,
  onChange,
  disabled,
  size = 'md',
  label,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(-1); // solo último dígito
    if (raw === '') return;
    const n = Number(raw);
    if (n >= 1 && n <= 6) onChange(n);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        pattern="[1-6]"
        maxLength={1}
        disabled={disabled}
        value={value ?? ''}
        onChange={handleChange}
        onFocus={(e) => e.target.select()}
        placeholder="?"
        className={[
          SIZES[size],
          'text-center font-display tabular-nums',
          'bg-white dark:bg-iosDark-bg2',
          'border-2 transition-all duration-150',
          'focus:outline-none focus:scale-105',
          value !== null
            ? 'border-ios-accent text-ios-label dark:text-iosDark-label shadow-ios'
            : 'border-dashed border-ios-border dark:border-iosDark-border text-ios-label3 dark:text-iosDark-label3',
          'focus:border-ios-accent focus:shadow-ios-glow',
          'disabled:opacity-50',
        ].join(' ')}
        aria-label={label || 'Valor del dado'}
      />
      {label && (
        <span className="text-[10px] text-ios-label2 dark:text-iosDark-label2 uppercase tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
};

/** Set de 3 dados — atajo común para "tirada de servicio". */
export const DiceTrio: React.FC<{
  values: [number | null, number | null, number | null];
  onChange: (idx: 0 | 1 | 2, value: number) => void;
  disabled?: boolean;
}> = ({ values, onChange, disabled }) => (
  <div className="flex items-center justify-center gap-3">
    {values.map((v, i) => (
      <DiceInput
        key={i}
        value={v}
        onChange={(val) => onChange(i as 0 | 1 | 2, val)}
        disabled={disabled}
        label={`Dado ${i + 1}`}
      />
    ))}
  </div>
);

export default DiceInput;
