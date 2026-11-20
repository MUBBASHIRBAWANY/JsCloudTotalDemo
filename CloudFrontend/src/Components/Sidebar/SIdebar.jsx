import React, { createContext, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux';
import { open } from '../../Redux/Reducers/sidebarReducer.js';
import { BiSupport } from "react-icons/bi"
import { NavLink } from 'react-router-dom';
import { Logout } from '../../Redux/Reducers/LoginerReducer.js';
import { endSession } from '../../utils/authSession.js';
import { GrSupport, GrUserAdmin } from "react-icons/gr";
import { TbLayoutDistributeHorizontal } from "react-icons/tb";

import {
  ReportsOpen, SetupOpen, Transtionopen, toggleReports,
  toggleSetup, toggleTranstion, ProductSetup, toggleProductSetup,
  UserSetup, toggleUserSetup,
  ClinetSetup,
  toggleClinetSetup,
  toggleOpeningBalance,
  OpeningBalanceOp,
  AccountsSetupopen,
  toggleAccountsSetup,
  DistributorOpen,
  toggleDistributor,
  OpenDistributorCust,
  toggleDistributorCust,
  OpenAdministravive,
  toggleAdministravive,
  OpenHrPayroll,
  toggleHrPayroll,
  OpenHrmsAdvanced,
  toggleHrmsAdvanced,
  OpenHrSetup, toggleHrSetup,
  OpenHrAttendance, toggleHrAttendance,
  OpenHrLeave, toggleHrLeave,
  OpenHrPayrollGroup, toggleHrPayrollGroup,
  OpenHrReports, toggleHrReports,
  OpenHrEmployees, toggleHrEmployees,

} from '../../Redux/Reducers/SiderBarOtionFalse';

const SidebarFlyoutContext = createContext(null);

const SIdebar = () => {
  const flyoutMountRef = useRef(null);
  const SidebarOpen = useSelector((state) => state.isSideBar.state)

  const dispatch = useDispatch()
  const openTransaction = useSelector((state) => state.sidebarOptions.transtionOpen)
  const openSetup = useSelector((state) => state.sidebarOptions.Setup)
  const openProductSetup = useSelector((state) => state.sidebarOptions.openProductSetup)
  const OpenDistributor = useSelector((state) => state.sidebarOptions.Distrbutor)
  const openReprts = useSelector((state) => state.sidebarOptions.Reports)
  const userSetupDrp = useSelector((state) => state.sidebarOptions.userSetup)
  const clientSetupDrp = useSelector((state) => state.sidebarOptions.clinetSetup)
  const OpeningBalance = useSelector((state) => state.sidebarOptions.openingBalance)
  const AccountsSetup = useSelector((state) => state.sidebarOptions.AccountsSetupopen)
  const DistributorCust = useSelector((state) => state.sidebarOptions.DistributorCust)
  const Administravive = useSelector((state) => state.sidebarOptions.Administravive)
  const HrPayroll = useSelector((state) => state.sidebarOptions.HrPayroll)
  const HrmsAdvanced = useSelector((state) => state.sidebarOptions.HrmsAdvanced)
  const hrSetup = useSelector((state) => state.sidebarOptions.hrSetup)
  const hrAttendance = useSelector((state) => state.sidebarOptions.hrAttendance)
  const hrLeave = useSelector((state) => state.sidebarOptions.hrLeave)
  const hrPayrollGroup = useSelector((state) => state.sidebarOptions.hrPayrollGroup)
  const hrReports = useSelector((state) => state.sidebarOptions.hrReports)
  const hrEmployees = useSelector((state) => state.sidebarOptions.hrEmployees)
  const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)

  const ChevronIcon = ({ isOpen }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );

  const ChevronFlyoutIcon = ({ isOpen }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`sidebar-chevron-flyout h-4 w-4 shrink-0 transition-transform ${isOpen ? "translate-x-0.5" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );

  const closeAllSections = () => {
    dispatch(toggleAdministravive(false));
    dispatch(toggleSetup(false));
    dispatch(toggleDistributor(false));
    dispatch(toggleTranstion(false));
    dispatch(toggleReports(false));
    dispatch(toggleUserSetup(false));
    dispatch(toggleProductSetup(false));
    dispatch(toggleClinetSetup(false));
    dispatch(toggleOpeningBalance(false));
    dispatch(toggleAccountsSetup(false));
    dispatch(toggleDistributorCust(false));
    dispatch(toggleHrPayroll(false));
    dispatch(toggleHrmsAdvanced(false));
    dispatch(toggleHrSetup(false));
    dispatch(toggleHrAttendance(false));
    dispatch(toggleHrLeave(false));
    dispatch(toggleHrPayrollGroup(false));
    dispatch(toggleHrReports(false));
    dispatch(toggleHrEmployees(false));
  };

  const toggleTopLevel = (isOpen, openAction, closeAction) => {
    if (isOpen) {
      closeAction();
    } else {
      closeAllSections();
      openAction();
    }
  };
  const toggleDistributorDropdown = () => {
    toggleTopLevel(OpenDistributor, () => dispatch(DistributorOpen(true)), () => dispatch(toggleDistributor(false)));
  };
  const togleAdministravive = () => {
    toggleTopLevel(Administravive, () => dispatch(OpenAdministravive(true)), () => dispatch(toggleAdministravive(false)));
  };
  const toggleHrPayrollDropdown = () => {
    toggleTopLevel(HrPayroll, () => dispatch(OpenHrPayroll(true)), () => dispatch(toggleHrPayroll(false)));
  };
  const toggleHrmsAdvancedDropdown = () => {
    toggleTopLevel(HrmsAdvanced, () => dispatch(OpenHrmsAdvanced(true)), () => dispatch(toggleHrmsAdvanced(false)));
  };
  const toggleHrSetupDropdown = () => {
    if (hrSetup) dispatch(toggleHrSetup(false));
    else dispatch(OpenHrSetup(true));
  };
  const toggleHrAttendanceDropdown = () => {
    if (hrAttendance) dispatch(toggleHrAttendance(false));
    else dispatch(OpenHrAttendance(true));
  };
  const toggleHrLeaveDropdown = () => {
    if (hrLeave) dispatch(toggleHrLeave(false));
    else dispatch(OpenHrLeave(true));
  };
  const toggleHrPayrollGroupDropdown = () => {
    if (hrPayrollGroup) dispatch(toggleHrPayrollGroup(false));
    else dispatch(OpenHrPayrollGroup(true));
  };
  const toggleHrReportsDropdown = () => {
    if (hrReports) dispatch(toggleHrReports(false));
    else dispatch(OpenHrReports(true));
  };
  const toggleHrEmployeesDropdown = () => {
    if (hrEmployees) dispatch(toggleHrEmployees(false));
    else dispatch(OpenHrEmployees(true));
  };
  const NavItem = ({ to, label }) => (
    <li>
      <NavLink
        to={to}
        onClick={closeAllSections}
        className={({ isActive }) =>
          `sidebar-nav-link ${isActive ? 'is-active' : ''}`
        }
      >
        {label}
      </NavLink>
    </li>
  );

  const DropdownSection = ({ title, isOpen, toggle, children, icon, nested = false }) => {
    const flyoutRef = useContext(SidebarFlyoutContext);
    const label = title.trim();

    if (!nested) {
      return (
        <>
          <li>
            <button
              type="button"
              onClick={toggle}
              className={`sidebar-section-btn sidebar-section-btn--flyout flex w-full items-center justify-between rounded-md px-4 py-2.5 text-left transition-colors hover:bg-[var(--pd-sidebar-hover)] ${isOpen ? 'is-open' : ''}`}
            >
              <span className="flex items-center gap-3">
                {icon}
                <span>{label}</span>
              </span>
              <ChevronFlyoutIcon isOpen={isOpen} />
            </button>
          </li>
          {isOpen && flyoutRef?.current && createPortal(
            <div className="sidebar-flyout-content">
              <div className="sidebar-flyout-header">
                <span className="sidebar-flyout-header-title">{label}</span>
              </div>
              <ul className="sidebar-flyout-list space-y-0.5">
                {children}
              </ul>
            </div>,
            flyoutRef.current
          )}
        </>
      );
    }

    return (
      <li className="sidebar-flyout-group">
        <button
          type="button"
          onClick={toggle}
          className={`sidebar-flyout-group-btn flex items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isOpen ? 'is-open' : ''}`}
        >
          <span>{label}</span>
          <ChevronIcon isOpen={isOpen} />
        </button>
        {isOpen && (
          <ul className="sidebar-flyout-nested space-y-0.5">
            {children}
          </ul>
        )}
      </li>
    );
  };

  // Icon components
  const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );

  const TransactionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const ReportsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const DashboardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );

  const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );

  const HrPayrollIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );


  const [reportGroups, setReportGroups] = useState({
    purchase: false,
    sales: false,
    stock: false,
    other: false,
  });

  const toggleReportGroup = (key) => {
    setReportGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ReportGroupSection = ({ title, groupKey, children }) => (
    <li className="sidebar-flyout-group">
      <button
        type="button"
        onClick={() => toggleReportGroup(groupKey)}
        className={`sidebar-flyout-group-btn flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold transition-colors ${reportGroups[groupKey] ? 'is-open' : ''}`}
      >
        <span>{title}</span>
        <ChevronIcon isOpen={reportGroups[groupKey]} />
      </button>
      {reportGroups[groupKey] && (
        <ul className="sidebar-flyout-nested space-y-0.5">
          {children}
        </ul>
      )}
    </li>
  );




  const toggleTransaction = () => {
    toggleTopLevel(openTransaction, () => dispatch(Transtionopen(true)), () => dispatch(toggleTranstion(false)));
  };
  const toggleAccounts = () => {
    if (AccountsSetup) {
      dispatch(toggleAccountsSetup(false));
    } else {
      dispatch(AccountsSetupopen(true));
    }
  };
  const toggleSetupDropdown = () => {
    toggleTopLevel(openSetup, () => dispatch(SetupOpen(true)), () => dispatch(toggleSetup(false)));
  };
  const toggleReportsDropdown = () => {
    toggleTopLevel(openReprts, () => dispatch(ReportsOpen(true)), () => dispatch(toggleReports(false)));
  };
  const logout = (event) => {
    event?.preventDefault()
    event?.stopPropagation()
    try {
      endSession()
      dispatch(Logout())
    } finally {
      window.location.replace('/')
    }
  }
  const toggleProductSetuoDropdown = () => {
    if (openProductSetup == false) {
      dispatch(ProductSetup(true))

    }
    else {
      //console.log(openProductSetup)
      dispatch(toggleProductSetup(false))
    }
  }
  const toggleUserSetuoDropdown = () => {
    //console.log(userSetupDrp)
    if (userSetupDrp == false) {
      dispatch(UserSetup(true))

    }
    else {
      //console.log(openProductSetup)
      dispatch(toggleUserSetup(false))
    }
  }
  const toggleCLientSetuoDropdown = () => {
    //console.log(clientSetupDrp)
    if (clientSetupDrp == false) {
      dispatch(ClinetSetup(true))

    }
    else {
      //console.log(openProductSetup)
      dispatch(toggleClinetSetup(false))
    }
  }
  const toggleOpeningBalanceDrp = () => {
    if (OpeningBalance == false) {
      dispatch(OpeningBalanceOp(true))

    }
    else {

      dispatch(toggleOpeningBalance(false))
    }
  }
  const toggleDistributorCustDrp = () => {
    if (DistributorCust == false) {
      dispatch(OpenDistributorCust(true))

    }
    else {

      dispatch(toggleDistributorCust(false))
    }
  }

  const checkName = (name) => {
    const watch = UserRihts.find((item) => item == name)
    if (watch) {
      // console.log(name)
      return true
    }
    else {
      return false
    }
  }

  const checkuserSection = (name, sect) => {
console.log(name, sect)
    if (sect == "SubSection") {
      const section = LoginerVendor.Subsection.find((item) => item == name)

      if (section) {
        return true
      }
      else {
        return false
      }
    }
    else {
      const section = LoginerVendor.Section.find((item) => item == name)

      if (section) {
        return true
      }
      else {
        return false
      }
    }

  }
  const flyoutOpen = Administravive || openSetup || OpenDistributor || openTransaction || openReprts || HrmsAdvanced || HrPayroll;

  return (
    <SidebarFlyoutContext.Provider value={flyoutMountRef}>
    <div
      className={`sidebar-shell inset-y-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${SidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
    >
    <aside className="app-sidebar flex h-full flex-col">
      <div className="flex h-full flex-col">
        <div className="border-b border-[var(--pd-sidebar-border)] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--pd-primary-container)]">
              <svg className="h-5 w-5 text-[var(--pd-on-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <h1 className="sidebar-brand text-lg font-semibold leading-tight">
                <span className="sidebar-brand-accent">Pearl</span> Dynamic
              </h1>
              <p className="text-[11px] font-mono uppercase tracking-widest text-[var(--pd-sidebar-text)] opacity-80">
                Distribution ERP
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            <li>
              <NavLink
                to="/"
                end
                onClick={closeAllSections}
                className={({ isActive }) =>
                  `sidebar-nav-link is-top-level ${isActive ? 'is-active' : ''}`
                }
              >
                <DashboardIcon />
                Dashboard
              </NavLink>
            </li>
            <li>
              {checkuserSection("Administrative", "Section") ?
                <div>
                  <DropdownSection
                    title="    Administrative"
                    isOpen={Administravive}
                    toggle={togleAdministravive}
                    icon={<GrUserAdmin />}
                  >

                    {checkName("Administrative") ? <NavItem to="/Administrative" label="Administrative" /> : null}
                    {checkName("Costing") ? <NavItem to="/Costing" label="Costing" /> : null}
                    {checkName("Costing") ? <NavItem to="/YearEndProcedure" label="Year End Procedure" /> : null}
                    {checkName("Administrative") ? <NavItem to="/FinancialYear" label="Financial Year" /> : null}
                  </DropdownSection>
                </div>
                : null}
            </li>
            {/* Setup Section */}
            {checkuserSection("Setup", "Section") ?
              <DropdownSection
                title="Setup"
                isOpen={openSetup}
                toggle={toggleSetupDropdown}
                icon={<SettingsIcon />}
              >
                {/* User Setup */}
                <DropdownSection
                  title="User Setup"
                  isOpen={userSetupDrp}
                  toggle={toggleUserSetuoDropdown}
                  nested
                >
                  <NavItem to="/userlist" label="Users" />
                  {LoginerVendor.isSuper !== "true" ?
                    <>
                      {checkuserSection("UserSetup", "SubSection") ?
                        <>

                          {checkName("List User Role") ?
                            < NavItem to="/UserRolls" label="User Roles" /> : null}
                          {checkName("List Location") ? <NavItem to="/Locationlist" label="Location" /> : null}
                          {checkName("List Store") ? <NavItem to="/StoreList" label="Store" /> : null}

                        </>

                        : null}
                    </>
                    : null}
                </DropdownSection>
                {LoginerVendor.isSuper !== "true" ?
                  <>
                    {checkuserSection("AccountsSetup", "SubSection") ?
                      <DropdownSection
                        title="Accounts Setup"
                        isOpen={AccountsSetup}
                        toggle={toggleAccounts}
                        nested
                      >


                        {checkName("List Chart of Accounts") ? <NavItem to="/ChartofAccounts" label="Chart of Accounts" /> : null}
                        {checkName("List ChqBook") ? <NavItem to="/ChqBookList" label="Cheque Book" /> : null}
                        {checkName("List CustomerChq") ? <NavItem to="/CustomerChqList" label="Customer Cheque" /> : null}
                        {checkName("Cheque register") ? <NavItem to="/CustomerChqRegister" label="Cheque register" /> : null}
                        {checkName("Cheque Deposit") ? <NavItem to="/CustomerChqDeposit" label="Cheque Deposit" /> : null}
                        {checkName("Chq Cleare") ? <NavItem to="/CustomerChqCleareOrBounce" label="Chq Cleare" /> : null}
                        {checkName("FIXED ASSET LIST") ? <NavItem to="/FixedAssetList" label="Fixed Assets" /> : null}

                      </DropdownSection>
                      : null}
                    {/* Product Setup */}
                    {checkuserSection("ProductSetup", "SubSection") ?
                      <DropdownSection
                        title="Product Setup"
                        isOpen={openProductSetup}
                        toggle={toggleProductSetuoDropdown}
                        nested
                      >
                        {checkName("List Vendor") ? <NavItem to="/VendorList" label="Vendor" /> : null}
                        {checkName("List Category") ? <NavItem to="/CategoryList" label="Category" /> : null}
                        {checkName("List Brand") ? <NavItem to="/brandList" label="Brand" /> : null}
                        {checkName("List Category") ? <NavItem to="/masterskulist" label="Master SKU" /> : null}
                        {checkName("List SKU") ? <NavItem to="/ProductList" label="SKU" /> : null}
                        {checkName("List PriceList") ? <NavItem to="/PriceList" label="Price List" /> : null}
                        {checkName("List Slab") ? <NavItem to="/Slab" label="Slab" /> : null}
                        {checkName("List Scheme") ? <NavItem to="/Scheme" label="Scheme" /> : null}
                      </DropdownSection>
                      : null}
                    {/* Customer Setup */}
                    {checkuserSection("Customer", "SubSection") ?
                      <DropdownSection
                        title="Customer"
                        isOpen={clientSetupDrp}
                        toggle={toggleCLientSetuoDropdown}
                        nested
                      >
                        {checkName("List Customer") ? <NavItem to="/clientList" label="Customers" /> : null}
                        {checkName("List Locality") ? <NavItem to="/LocalityList" label="Locality" /> : null}
                        {checkName("List Town") ? <NavItem to="/Townlist" label="Town" /> : null}
                        {checkName("List Territory") ? <NavItem to="/Terrotorylist" label="Territory" /> : null}
                        {checkName("List Channel Type") ? <NavItem to="/ChannelTypelist" label="Channel Type" /> : null}
                        {checkName("List Channel") ? <NavItem to="/Channellist" label="Channel" /> : null}
                        {checkName("List Sub Channel") ? <NavItem to="/SubChannellist" label="Sub Channel" /> : null}
                        {checkName("List Order Booker") ? <NavItem to="/OrderBookerList" label="Order Booker" /> : null}

                      </DropdownSection>
                      : null}
                    {/* Opening Balance */}
                    {checkuserSection("OpeningBalance", "SubSection") ?
                      <DropdownSection
                        title="Opening Balance"
                        isOpen={OpeningBalance}
                        toggle={toggleOpeningBalanceDrp}
                        nested
                      >
                        {checkName("List Opening Inventory") ? <NavItem
                          to="/OpeningInventory"
                          label="Inventory Opening"
                        />
                          : null}
                        {checkName("List Client Opening") ?
                          <NavItem
                            to="/ClientOpeningBalance"
                            label="Client Opening"
                          />
                          : null}
                        {checkName("List Vendor Opening") ?
                          <NavItem
                            to="/VendorOpenigBalanceList"
                            label="Vendor Opening"
                          />
                          : null}
                        {checkName("List Account Opening") ?
                          <NavItem
                            to="/AccountOpeninigBalance"
                            label="Accounts"
                          />
                          : null}
                        {checkName("List invoice Opening") ?
                          <NavItem
                            to="/OpeningInvoiceList"
                            label="Invoices"
                          />
                          : null}
                      </DropdownSection>
                      : null}
                  </>
                  : null}
              </DropdownSection>
              : null
            }

            <>
              {checkuserSection("Distributor", "Section") ?
                <DropdownSection
                  title="Distributor"
                  isOpen={OpenDistributor}
                  toggle={toggleDistributorDropdown}
                  icon={<TbLayoutDistributeHorizontal />}
                >
                  {checkuserSection("DistributorCustumers", "SubSection") ?
                    <DropdownSection
                      title="Customers"
                      isOpen={DistributorCust}
                      toggle={toggleDistributorCustDrp}
                      nested
                    >

                      <>

                        {checkName("Zone List") ?
                          <NavItem
                            to="/Zonelist"
                            label="Zone"
                          />
                          : null}
                        {checkName("Group List") ?
                          <NavItem
                            to="/GroupList"
                            label="Group List"
                          />
                          : null}
                        {checkName("Region List") ?
                          <NavItem
                            to="/RegionList"
                            label="Region List"
                          />
                          : null}
                        {checkName("City List") ?
                          <NavItem
                            to="/Citylist"
                            label="City List"
                          />

                          : null}
                        {checkName("List Price List") ? <NavItem to="/PriceList" label="Price List" /> : null}
                      </>

                      {checkName("OrderBooker List") ?
                        <NavItem
                          to="/DistributorOrderBookerList"
                          label="Distributor Order Booker"
                        />
                        : null}
                      {checkName("ZSM List") ?
                        <NavItem
                          to="/ZsmList"
                          label="ZSM"
                        />
                        : null}
                      {checkName("Transport List") ?
                        <NavItem
                          to="/Transport"
                          label="Transport"
                        />
                        : null}
                      {checkName("Distributor List") ?
                        <NavItem
                          to="/DistrbutorList"
                          label="Distributor Customers"
                        />
                        : null}
                    </DropdownSection>
                    : null}
                  {checkName("Distributor SaleOrder List") ?
                    <NavItem to="/DistributorSaleOrderListPage" label="Sale Order" /> : null}
                  {checkName("Distributor RC List") ? <NavItem to="/DitributorRcList" label="RC" /> : null}
                  {checkName("Order DC List") ? <NavItem to="/OrderDCList" label="Delivery Challan" /> : null}
                  {checkName("Distributor Invoice List") ? <NavItem to="/DistrbutorInvoice" label="Invoice" /> : null}
                  {checkName("List SalesReturn") ? <NavItem to="/SalesReturnList" label="Sales Return" /> : null}
                  {checkName("Payment Receipt List") ? <NavItem to="/paymentReciptList" label="Payment Receipt" /> : null}
                  {checkName("Knockoff") ? <NavItem to="/NoqoffAmount" label="Knock Off" /> : null}
                  {/* {checkName("Knockoff") ? <NavItem to="/ReduceKnockOff" label="Match Aging Ledger" /> : null} */}
                  {checkName("Stock Flow Report") ? <NavItem to="/StockFlowReport" label="Stock Flow Report" /> : null}
                      {(checkName("Distributor Stock Flow Report") ) ? <NavItem to="/DistributorStockFlowReport" label="Distributor Stock Flow Report" /> : null}
                  {checkName("List Physical Stock vs System Stock") ? <NavItem to="/PhysicalVsSystemStock" label="Physical Stock vs System Stock" /> : null}
                  {/* {<NavItem to="/StockRecalculate" label="Stock Recalculate" />} */}
                  {checkName("Client Ledger") ? <NavItem to="/ClientLedger" label="Client Ledger" /> : null}
                  {checkName("Order Management") ? <NavItem to="/DcReport" label="Order Management" /> : null}
                  {checkName("List Price List") ? <NavItem to="/PriceList" label="Price List" /> : null}
                  {checkName("Booker Attendance") ? <NavItem to="/Attendance" label="Booker Attendance" /> : null}  




                </DropdownSection>
                : null}
            </>



            <>
              {/* Transactions */}
              {checkuserSection("Transactions", "Section") ?
                < DropdownSection
                  title="Transactions"
                  isOpen={openTransaction}
                  toggle={toggleTransaction}
                  icon={<TransactionIcon />}
                >

                  {checkName("List Purchase") ? <NavItem to="/PurchaseInvoiceList" label="Purchase Invoice" /> : null}
                  {checkName("List PurchaseReturn") ? <NavItem to="/PurchaseReturn  " label="Purchase Return" /> : null}
                  {checkName("Distributor RC List") ? <NavItem to="/DitributorRcList" label="RC" /> : null}
                  {checkName("List Sales") ? <NavItem to="/SalesInvoice" label="Sales Invoice" /> : null}
                  {checkName("List SalesReturn") ? <NavItem to="/SalesReturnList" label="Sales Return" /> : null}
                  {checkName("List TransferOut") ? <NavItem to="/TransferOutList" label="Transfer Out" /> : null}
                  {checkName("List TransferIn") ? <NavItem to="/Transferinlist" label="Transfer In" /> : null}
                  {checkName("List Stock Repalcement") ? <NavItem to="/StockReplacement" label="Stock Replacement" /> : null}
                  {checkName("List Stock Adjustment") ? <NavItem to="/StockAdjustment" label="Stock Adjustment" /> : null}
                  {checkName("List Bank Payment Voucher") ? <NavItem to="/BankPaymentVoucherList" label="Bank Payment Voucher" /> : null}
                  {checkName("List Cash Payment Voucher") ? <NavItem to="/CashPaymentVoucher" label="Cash Payment Voucher" /> : null}
                  {checkName("List Bank Receipt Voucher") ? <NavItem to="/BankReciptVoucher" label="Bank Receipt Voucher" /> : null}
                  {checkName("List Cash Receipt Voucher") ? <NavItem to="/CashReciptVoucherList" label="Cash Receipt Voucher" /> : null}
                  {checkName("List Journal Voucher") ? <NavItem to="/JournalVoucherList" label="Journal Voucher" /> : null}
                  {checkName("List Journal Voucher") ? <NavItem to="/ShortageAdjustAdd" label="Shortage Adjust" /> : null}
                  {checkName("Payment Receipt List") ? <NavItem to="/paymentReciptList" label="Payment Receipt" /> : null}
                  {checkName("Knockoff") ? <NavItem to="/NoqoffAmount" label="Knock Off" /> : null}
                  {/* {checkName("Knockoff") ? <NavItem to="/ReduceKnockOff" label="Match Aging Ledger" /> : null} */}
                  {checkName("List Journal Voucher") ? <NavItem to="/InvoiceAdjust" label="Invoice Adjust" /> : null}


                </DropdownSection>
                : null}

            </>


            {/* Reports */}

            <>
              {checkuserSection("Reports", "Section") ?
                <DropdownSection
                  title="Reports"
                  isOpen={openReprts}
                  toggle={toggleReportsDropdown}
                  icon={<ReportsIcon />}
                >
                  <ReportGroupSection title="Purchase Reports" groupKey="purchase">
                    {checkName("Purchase Report") ? <NavItem to="/PurchaseReport" label="Purchase Report" /> : null}
                  </ReportGroupSection>

                  <ReportGroupSection title="Sales Reports" groupKey="sales">
                    {(LoginerVendor.isBoss === true || LoginerVendor.isBoss === "true") && checkName("Sales Invoice Summary") ? <NavItem to="/SalesInvoiceSummry" label="Sales Invoice Summary" /> : null}
                    {checkName("Sales Dump Data") ? <NavItem to="/SalesDumpData" label="Sales Dump Data" /> : null}
                    {checkName("Sales Dump Data With Cost") ? <NavItem to="/SalesDumpDataWithCost" label="Sales Dump Data With Cost" /> : null}
                    {checkName("Daily Sales Report") ? <NavItem to="/DailySalesReport" label="Daily Sales Report" /> : null}
                    {checkName("Invoice Aging") ? <NavItem to="/InvoiceAging" label="Invoice Aging" /> : null}
                    {checkName("Invoice Payment Aging")  ? <NavItem to="/InvoicePaymentAging" label="Invoice Payment Aging" /> : null}
                    {checkName("Client Aging Ledger")  ? <NavItem to="/ClientAgingLedger" label="Client Aging Ledger" /> : null}
                    {checkName("Voucher Invoice Ref Report") ? <NavItem to="/VoucherInvoiceRefReport" label="Voucher Invoice Ref Report" /> : null}
                    {checkName("Sundry Debtor Balance") ? <NavItem to="/SundryDebtorBalanc" label="Sundry Debtor Balance" /> : null}
                    {checkName("Booker Wise Invoice") ? <NavItem to="/CustomerAndOrderBookerWiseInvoice" label="Order Booker Wise Invoice" /> : null}
                    {checkName("Visit Report") ? <NavItem to="/VisitReport" label="Visit Report" /> : null}
                    {checkName("Store Ledger") ? <NavItem to="/RCReport" label="RC Report" /> : null}
                    {checkName("Order Booker Achievement") ? <NavItem to="/OrderBookerAchivment" label="Order Booker Achievement" /> : null}
                    {checkName("DC Report") ? <NavItem to="/DeliveryChallanReport" label="DC Report" /> : null}
                    {checkName("Order Report") ? <NavItem to="/OrderReport" label="Order Report" /> : null}
                    {checkName("Booker Wise Ledger") ? <NavItem to="/BoorKWiseLedger" label="Booker Wise Ledger" /> : null}
                  </ReportGroupSection>

                  <ReportGroupSection title="Stock Reports" groupKey="stock">
                    {checkName("All Stock") ? <NavItem to="/AllStock" label="All Stock" /> : null}
                    {checkName("Stock Flow Report") ? <NavItem to="/StockFlowReport" label="Stock Flow Report" /> : null}
                    {/* {<NavItem to="/StockRecalculate" label="Stock Recalculate" />} */}
                        {(checkName("Distributor Stock Flow Report")) ? <NavItem to="/DistributorStockFlowReport" label="Distributor Stock Flow Report" /> : null}
                      {checkName("InventoryValuationSummary") ? <NavItem to="/InventoryValutionSummary" label="Inventory Valuation Summary" /> : null}
                    {checkName("Inventory Valuation") ? <NavItem to="/InventoryValution" label="Inventory Valuation" /> : null}
                    {checkName("Store Ledger") ? <NavItem to="/Storeledger" label="Store Ledger" /> : null}
                  </ReportGroupSection>

                  <ReportGroupSection title="Other Reports" groupKey="other">
                    {checkName("General Ledger") ? <NavItem to="/GenralLager" label="General Ledger" /> : null}
                    {checkName("Investment Report Between") ? <NavItem to="/InvestmentReportBetween" label="Investment Report Between" /> : null}
                    {checkName("Employee Ledger Report") ? <NavItem to="/EmployeeLedgerReport" label="Employee Ledger Report" /> : null}
                    {checkName("Client Ledger") ? <NavItem to="/ClientLedger" label="Client Ledger" /> : null}
                    {checkName("Store Wise Client Ledger Detail") ? <NavItem to="/StoreWiseClientLedgerDetail" label="Store Wise Client Ledger Detail" /> : null}
                    {checkName("Store Wise Client Ledger Summary") ? <NavItem to="/StoreWiseClientLedgerSummary" label="Store Wise Client Ledger Summary" /> : null}
                    {checkName("Log Report") ? <NavItem to="/LogReport" label="Log Report" /> : null}
                    {checkName("Trail Balances") ? <NavItem to="/TrailBalances" label="Trial Balances" /> : null}
                    {checkName("Period Activity Report") ? <NavItem to="/PeriodActivityReport" label="Period Activity Report" /> : null}
                    {checkName("Period Activity Report") ? <NavItem to="/PeriodExpenseReport" label="Period Expense Report" /> : null}
                    {checkName("Period Expense And Revenue Report") ? <NavItem to="/PeriodExpenseAndRevenueReport" label="Period Expense And Revenue Report" /> : null}
                    {checkName("Account Summary Report") ? <NavItem to="/AccountSummaryReport" label="Account Summary Report" /> : null}
                    {checkName("Account Activity Report") ? <NavItem to="/AccountActivityReport" label="Account Activity Report" /> : null}
                    {checkName("Tax Report") ? <NavItem to="/TaxReport" label="Tax Report" /> : null}
                    {checkName("Payment Realize Report") ? <NavItem to="/PaymentRealizeReport" label="Payment Realize Report" /> : null}
                    {checkName("Knockoff Report") ? <NavItem to="/KnokoffReport" label="Knockoff Remaining" /> : null}
                    {checkName("Booker Wise AttendanceReport") ? <NavItem to="/AttandanceReport" label="Booker Attendance Report" /> : null}
                    {checkName("Cash Book") ? <NavItem to="/cashBook" label="Cash Book" /> : null}
                    {checkName("Chq Transiction Report") ? <NavItem to="/chqTransictionReport" label="Cheque Transaction" /> : null}
                    {checkName("Transporter Ledger") ? <NavItem to="/TransporterLedger" label="Transporter Ledger" /> : null}
                    {checkName("Vendor Wise Client Ledger") ? <NavItem to="/VendorWiseClientLedger" label="Vendor Wise Client Ledger" /> : null}
                    {checkName("Reconciliation") ? <NavItem to="/Reconciliation" label="Reconciliation" /> : null}
                  </ReportGroupSection>

                </DropdownSection>
                : null}
            </>

            {/* HR & Payroll - isBoss only */}
            {LoginerVendor.isBoss == true && (
              <>
                <DropdownSection
                  title="HR & Payroll"
                  isOpen={HrPayroll}
                  toggle={toggleHrPayrollDropdown}
                  icon={<HrPayrollIcon />}
                >
                  {/* HR Setup */}
                  <DropdownSection title="HR Setup" isOpen={hrSetup} toggle={toggleHrSetupDropdown} nested>
                    {checkName("List Department") ? <NavItem to="/DepartmentList" label="Departments" /> : null}
                    {checkName("List Designation") ? <NavItem to="/DesignationList" label="Designations" /> : null}
                    {checkName("List Allowance Type") ? <NavItem to="/AllowanceTypeList" label="Allowance Types" /> : null}
                    {checkName("List Deduction Type") ? <NavItem to="/DeductionTypeList" label="Deduction Types" /> : null}
                    {checkName("View Company Policy") ? <NavItem to="/CompanyPolicy" label="Company Policy" /> : null}
                    {checkName("List Holiday") ? <NavItem to="/HolidayCalendarList" label="Holiday Calendar" /> : null}
                    {checkName("List Leave Type") ? <NavItem to="/LeaveTypeList" label="Leave Types" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrEarningDeductionList" label="Earning / Deduction Codes" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrContractorList" label="Contractors" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrReligionList" label="Religions" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrBankList" label="Banks" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrReasonList" label="Reasons" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/PayrollAccountMapping" label="Account Mapping" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/EBFOpeningBalance" label="EBF OB" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/LoanOpeningBalance" label="Loan OB" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrBadDebtList" label="Bad Debt OB" /> : null}
                  </DropdownSection>

                  {/* Employees */}
                  <DropdownSection title="Employees" isOpen={hrEmployees} toggle={toggleHrEmployeesDropdown} nested>
                    {checkName("List HR Employee") ? <NavItem to="/EmployeeHrList" label="Employee List" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrTransferEmployee" label="Transfer Employee" /> : null}
                  </DropdownSection>

                  {/* Attendance */}
                  <DropdownSection title="Attendance" isOpen={hrAttendance} toggle={toggleHrAttendanceDropdown} nested>
                    {checkName("List HR Attendance") ? <NavItem to="/AttendanceHrList" label="Attendance List" /> : null}
                    {checkName("List HR Attendance") ? <NavItem to="/AttendanceDashboard" label="Dashboard" /> : null}
                    {checkName("List HR Attendance") ? <NavItem to="/AttendanceCalendar" label="Calendar" /> : null}
                    {checkName("View Advanced Attendance") ? <NavItem to="/HrAttendanceRegister" label="Register" /> : null}
                    {checkName("List HR Attendance") ? <NavItem to="/ZKTecoSync" label="ZKTeco Sync" /> : null}
                    {checkName("List HR Attendance") ? <NavItem to="/CorrectionRequestList" label="Corrections" /> : null}
                  </DropdownSection>

                  {/* Leave */}
                  <DropdownSection title="Leave" isOpen={hrLeave} toggle={toggleHrLeaveDropdown} nested>
                    {checkName("List Leave Application") ? <NavItem to="/LeaveApplicationList" label="Applications" /> : null}
                    {checkName("Apply Leave") ? <NavItem to="/LeaveApply" label="Apply Leave" /> : null}
                    {checkName("View Leave Management") ? <NavItem to="/LeaveManagement" label="Management" /> : null}
                  </DropdownSection>

                  {/* Payroll */}
                  <DropdownSection title="Payroll" isOpen={hrPayrollGroup} toggle={toggleHrPayrollGroupDropdown} nested>
                    {checkName("List Payroll") ? <NavItem to="/PayrollList" label="Payroll List" /> : null}
                    {checkName("Generate Payroll") ? <NavItem to="/PayrollGenerate" label="Generate" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/PayrollDashboard" label="Dashboard" /> : null}
                    {checkName("Payroll Summary") ? <NavItem to="/PayrollSummary" label="Summary" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/AdjustmentList" label="Adjustments" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/LoanList" label="Loans" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/SalaryAdvanceList" label="Salary Advances" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/StaffLoanList" label="Staff Loans" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/cashier-payments" label="Cashier Payments" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrMonthlyTransaction" label="Monthly Transaction" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrSalaryPaid" label="Salary Paid" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrIncomeTaxChallan" label="Income Tax Challan" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/HrCloseMonth" label="Close Month" /> : null}
                  </DropdownSection>

                  {/* HR Reports */}
                  <DropdownSection title="Reports" isOpen={hrReports} toggle={toggleHrReportsDropdown} nested>
                    {checkName("List HR Attendance") ? <NavItem to="/AttendanceReports" label="Attendance Reports" /> : null}
                    {checkName("List Leave Application") ? <NavItem to="/LeaveReports" label="Leave Reports" /> : null}
                    {checkName("Payroll Summary") ? <NavItem to="/PayrollSummary" label="Payroll Summary" /> : null}
                    {checkName("List Payroll") ? <NavItem to="/ebf-reports" label="EBF Reports" /> : null}
                    {checkName("Employee Ledger Report") ? <NavItem to="/EmployeeLedgerReport" label="Employee Ledger (EBF/Loan/Bad Debt)" /> : null}
                  </DropdownSection>
                </DropdownSection>

                {/* HRMS Advanced */}
                <DropdownSection
                  title="HRMS Advanced"
                  isOpen={HrmsAdvanced}
                  toggle={toggleHrmsAdvancedDropdown}
                  icon={<HrPayrollIcon />}
                >
                  {checkName("View HR Dashboard") ? <NavItem to="/HRAnalyticsDashboard" label="HR Dashboard" /> : null}
                  {checkName("View Recruitment") ? <NavItem to="/JobPostings" label="Recruitment" /> : null}
                  {checkName("View Performance") ? <NavItem to="/HrPerformance" label="Performance" /> : null}
                  {checkName("View LMS") ? <NavItem to="/HrLMS" label="LMS" /> : null}
                  {checkName("View Advanced Attendance") ? <NavItem to="/HrShiftManagement" label="Shift Management" /> : null}
                  {checkName("View Separation") ? <NavItem to="/HrSeparation" label="Separation" /> : null}
                  {checkName("View Document Vault") ? <NavItem to="/HrDocumentVault" label="Document Vault" /> : null}
                  {checkName("View Grievance") ? <NavItem to="/HrGrievance" label="Grievance" /> : null}
                  {checkName("View ESS Portal") ? <NavItem to="/ESSHome" label="ESS Portal" /> : null}
                  {checkName("Notifications") ? <NavItem to="/Notifications" label="Notifications" /> : null}
                  {checkName("Workflow Config") ? <NavItem to="/workflow-config" label="Workflow Configuration" /> : null}
                </DropdownSection>
              </>
            )}

            <li className="mt-2 border-t border-[var(--pd-sidebar-border)] pt-2">
              <NavLink
                to="/AiSupport"
                onClick={closeAllSections}
                className={({ isActive }) =>
                  `sidebar-nav-link is-top-level ${isActive ? 'is-active' : ''}`
                }
              >
                <BiSupport className="text-lg" />
                AI Support
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="border-t border-[var(--pd-sidebar-border)] p-3">
          <button
            type="button"
            data-logout="true"
            onClick={logout}
            className="sidebar-footer-btn flex w-full items-center gap-3 rounded-md px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <LogoutIcon />
            Logout
          </button>
        </div>
      </div>
    </aside>

    <div
      ref={flyoutMountRef}
      className={`sidebar-flyout h-full ${flyoutOpen ? 'is-open' : ''}`}
      aria-hidden={!flyoutOpen}
    />
    </div>
    </SidebarFlyoutContext.Provider>
  )
}

export default SIdebar
