"use client";

import { IMaskInput } from "react-imask";

type Props = {
  name?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  required?: boolean;
  invalid?: boolean;
  id?: string;
};

export function BrazilianPhoneInput({
  name = "telefone",
  value,
  onValueChange,
  className = "input",
  required,
  invalid,
  id,
}: Props) {
  return (
    <IMaskInput
      id={id}
      name={name}
      mask="(00) 00000-0000"
      value={value}
      unmask={false}
      lazy
      inputMode="tel"
      autoComplete="tel"
      placeholder="(00) 00000-0000"
      required={required}
      aria-invalid={invalid}
      className={className}
      onAccept={(next) => onValueChange?.(String(next))}
      onPaste={(event) => {
        const pasted = event.clipboardData.getData("text");
        let digits = pasted.replace(/\D/g, "");
        if (digits.startsWith("55") && digits.length >= 12)
          digits = digits.slice(2);
        if (digits.length === 11) {
          event.preventDefault();
          onValueChange?.(
            `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`,
          );
        }
      }}
    />
  );
}
