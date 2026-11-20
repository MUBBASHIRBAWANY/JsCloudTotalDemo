import React from 'react';

const ReportPopupHeader = ({ title, subtitle, meta }) => (
  <header className="pd-report-popup-header">
    <div className="pd-report-popup-header__inner">
      <p className="pd-report-popup-header__eyebrow">Pearl Dynamic (pvt) ltdERP</p>
      <h1 className="pd-report-popup-header__title">{title}</h1>
      {subtitle ? (
        <p className="pd-report-popup-header__subtitle">{subtitle}</p>
      ) : null}
      {meta ? (
        <div className="pd-report-popup-header__meta">{meta}</div>
      ) : null}
    </div>
  </header>
);

export default ReportPopupHeader;