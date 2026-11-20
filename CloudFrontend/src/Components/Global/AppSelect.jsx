import React from 'react';
import Select from 'react-select';
import { useThemeMode } from '../../theme/ThemeModeContext.jsx';
import { mergeReactSelectStyles, useReactSelectStyles } from '../../theme/reactSelectStyles.js';

const AppSelect = ({
  styles: styleOverrides,
  menuPortalTarget,
  classNamePrefix = 'pd-select',
  compact = false,
  ...props
}) => {
  const { mode } = useThemeMode();
  const baseStyles = useReactSelectStyles({
    menuPortalZIndex: 9999,
    minHeight: compact ? '35px' : '38px',
  });

  const styles = mergeReactSelectStyles(baseStyles, styleOverrides);

  return (
    <Select
      key={mode}
      unstyled
      classNamePrefix={classNamePrefix}
      styles={styles}
      menuPortalTarget={
        menuPortalTarget !== undefined
          ? menuPortalTarget
          : typeof document !== 'undefined'
            ? document.body
            : null
      }
      menuPosition="fixed"
      {...props}
    />
  );
};

export default AppSelect;