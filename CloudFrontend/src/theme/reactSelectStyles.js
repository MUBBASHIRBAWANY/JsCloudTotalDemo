import { useMemo } from 'react';
import { useThemeMode } from './ThemeModeContext.jsx';

/** CSS variable refs — update instantly when data-theme changes (no getComputedStyle). */
const v = {
  surface: 'var(--pd-surface-container-lowest)',
  onSurface: 'var(--pd-on-surface)',
  onSurfaceVariant: 'var(--pd-on-surface-variant)',
  outline: 'var(--pd-outline-variant)',
  outlineHover: 'var(--pd-outline)',
  primary: 'var(--pd-primary)',
  onPrimary: 'var(--pd-on-primary)',
  primaryContainer: 'var(--pd-primary-container)',
  surfaceLow: 'var(--pd-surface-container-low)',
  surfaceContainer: 'var(--pd-surface-container)',
  borderCard: 'var(--pd-border-card)',
  shadow: 'var(--shadow-modal)',
  disabledBg: 'var(--pd-surface-container)',
  disabledText: 'var(--pd-on-surface-variant)',
};

export const buildReactSelectStyles = (options = {}) => {
  const { menuPortalZIndex = 9999, minHeight = '38px' } = options;

  return {
    container: (base) => ({
      ...base,
      pointerEvents: 'auto',
    }),
    control: (base, state) => ({
      ...base,
      minHeight,
      backgroundColor: state.isDisabled ? v.disabledBg : v.surface,
      borderColor: state.isFocused ? v.primary : v.outline,
      borderWidth: state.isFocused ? '2px' : '1px',
      borderRadius: 'var(--radius-md, 4px)',
      boxShadow: 'none',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      opacity: state.isDisabled ? 0.7 : 1,
      transition: 'border-color 0.15s ease',
      '&:hover': undefined,
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '2px 8px',
    }),
    input: (base) => ({
      ...base,
      color: v.onSurface,
      margin: 0,
      padding: 0,
    }),
    placeholder: (base, state) => ({
      ...base,
      color: state.isDisabled ? v.disabledText : v.onSurfaceVariant,
    }),
    singleValue: (base, state) => ({
      ...base,
      color: state.isDisabled ? v.disabledText : v.onSurface,
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: v.surfaceLow,
      borderRadius: 'var(--radius-md, 4px)',
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: v.onSurface,
      fontSize: '0.875rem',
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: v.onSurfaceVariant,
      borderRadius: '0 var(--radius-md, 4px) var(--radius-md, 4px) 0',
      ':hover': undefined,
    }),
    indicatorsContainer: (base) => ({
      ...base,
    }),
    indicatorSeparator: (base, state) => ({
      ...base,
      backgroundColor: state.isDisabled ? 'transparent' : v.outline,
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isDisabled ? v.disabledText : v.onSurfaceVariant,
      padding: '6px',
    }),
    clearIndicator: (base, state) => ({
      ...base,
      color: state.isDisabled ? v.disabledText : v.onSurfaceVariant,
      padding: '6px',
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: v.surface,
      border: `1px solid ${v.borderCard}`,
      borderRadius: 'var(--radius-lg, 8px)',
      boxShadow: v.shadow,
      overflow: 'hidden',
      zIndex: menuPortalZIndex,
    }),
    menuList: (base) => ({
      ...base,
      padding: '4px',
      backgroundColor: v.surface,
    }),
    option: (base, state) => ({
      ...base,
      borderRadius: "10px",
      marginBottom: "4px",
      padding: "4px",
      fontSize: '1rem',

      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      backgroundColor: state.isSelected
        ? v.primary
        : state.isFocused
          ? v.surfaceLow
          : 'transparent',
      color: state.isSelected ? v.onPrimary : v.onSurface,
      opacity: state.isDisabled ? 0.5 : 1,
      ':active': undefined,
    }),
    group: (base) => ({
      ...base,
      paddingBottom: 0,
    }),
    groupHeading: (base) => ({
      ...base,
      color: v.onSurfaceVariant,
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: '4px',
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: menuPortalZIndex,
    }),
    loadingIndicator: (base) => ({
      ...base,
      color: v.primary,
    }),
    loadingMessage: (base) => ({
      ...base,
      color: v.onSurfaceVariant,
      fontSize: '0.875rem',
      padding: '8px 12px',
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: v.onSurfaceVariant,
      fontSize: '0.875rem',
      padding: '8px 12px',
    }),
  };
};

export const mergeReactSelectStyles = (baseStyles, overrides = {}) => {
  if (!overrides || Object.keys(overrides).length === 0) return baseStyles;

  const merged = { ...baseStyles };

  Object.entries(overrides).forEach(([key, override]) => {
    const baseFn = merged[key];
    merged[key] = (base, state) => {
      const themed = typeof baseFn === 'function' ? baseFn(base, state) : base;
      const patch = typeof override === 'function' ? override(themed, state) : override;
      return { ...themed, ...patch };
    };
  });

  return merged;
};

export const useReactSelectStyles = (options = {}) => {
  const { mode } = useThemeMode();
  const { menuPortalZIndex, minHeight } = options;

  return useMemo(
    () => buildReactSelectStyles({ menuPortalZIndex, minHeight }),
    [mode, menuPortalZIndex, minHeight],
  );
};