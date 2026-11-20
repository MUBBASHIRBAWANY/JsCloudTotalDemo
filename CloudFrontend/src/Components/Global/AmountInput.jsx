import React, { useState } from 'react';
import { formatAmount } from '../../utils/amountToWords';

export const parseAmountInput = (value) => {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (cleaned === "") return 0;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const AmountInput = ({
  value,
  onChange,
  className = "w-full p-1 text-xs md:text-sm border rounded",
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  const unformatted = String(value ?? "").replace(/,/g, "");
  const displayValue = focused
    ? draft
    : formatAmount(parseAmountInput(value));

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={`${className} text-right`.trim()}
      style={style}
      value={displayValue}
      onFocus={(e) => {
        setDraft(unformatted === "0" ? "" : unformatted);
        setFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/,/g, "");
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        onChange?.(raw);
      }}
    />
  );
};

export default AmountInput;
