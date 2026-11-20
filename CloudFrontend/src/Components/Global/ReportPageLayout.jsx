import React from 'react';

const ReportPageLayout = ({ title, subtitle, children }) => (
  <div className="pd-page pd-report-page">
    <header className="pd-report-page-header">
      <div className="pd-report-page-header__accent" />
      <div className="pd-report-page-header__body">
        <p className="pd-report-page-header__eyebrow">Reports</p>
        <h1 className="pd-report-page-header__title">{title}</h1>
        {subtitle ? (
          <p className="pd-report-page-header__subtitle">{subtitle}</p>
        ) : null}
      </div>
    </header>
    <div className="pd-report-page-body">{children}</div>
  </div>
);

export default ReportPageLayout;