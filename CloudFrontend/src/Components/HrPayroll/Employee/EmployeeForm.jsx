import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import AppSelect from '../../Global/AppSelect';
import SalaryLinesEditor from './SalaryLinesEditor';

const financialFlags = [
  { key: 'hasBadDebt', label: 'Bad Debt', type: 'baddebt' },
  { key: 'hasLoan', label: 'Loan', type: 'loan' },
  { key: 'hasEBF', label: 'EBF', type: 'ebf' },
  { key: 'hasAdvance', label: 'Advance', type: 'advance' },
];

const religions = ["Muslim", "Hindu", "Christian", "Other"];

const EmployeeForm = () => {
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue, trigger } = useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  // Tab state
  const [activeTab, setActiveTab] = useState('personal');
  const [salarySubTab, setSalarySubTab] = useState('salarySetup');

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [stores, setStores] = useState([]);
  const [cities, setCities] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [allowanceTypes, setAllowanceTypes] = useState([]);
  const [employeeAllowances, setEmployeeAllowances] = useState([]);
  const [deductionTypes, setDeductionTypes] = useState([]);
  const [employeeDeductions, setEmployeeDeductions] = useState([]);
  const [companyOffDays, setCompanyOffDays] = useState([]);

  const watchedCityId = watch("cityId");
  const watchedLocationId = watch("locationId");
  const watchedReportsTo = watch("reportsTo");
  const isForDistributor = watch("isForDistributor");
  const watchedBasicSalary = watch("basicSalary");
  const watchedWorkingHours = watch("workingHours");
  const watchedStatus = watch("status");
  const watchedDepartmentId = watch("departmentId");
  const watchedDesignationId = watch("designationId");
  const [annualLeave, setAnnualLeave] = useState(true);
  const [watchedAttendanceAllowance, setWatchedAttendanceAllowance] = useState(true);
  

  // Live computed salary rates (estimate — actual rates computed at payroll time based on days in month)
  const computedRates = React.useMemo(() => {
    const allowanceTotal = employeeAllowances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const total = (Number(watchedBasicSalary) || 0) + allowanceTotal;
    const wh = Number(watchedWorkingHours) || 9;
    const daily = Math.round((total / 30) * 100) / 100;
    const hourly = Math.round((daily / wh) * 100) / 100;
    const minute = Math.round((hourly / 60) * 100) / 100;
    return { total, daily, hourly, minute };
  }, [watchedBasicSalary, watchedWorkingHours, employeeAllowances]);

  useEffect(() => {
    getDataFundtion("HrDepartment/getDepartmentNameId").then((res) => setDepartments(res.data || []));
    getDataFundtion("HrDesignation/getDesignationNameId").then((res) => setDesignations(res.data || []));
    getDataFundtion("Store").then((res) => setStores(res.data || []));
    getDataFundtion("City").then((res) => setCities(res.data || []));
    getDataFundtion("Location").then((res) => setLocations(res.data || []));
    getDataFundtion("HrEmployee/getEmployeeNameId").then((res) => setEmployees(res.data || []));
    getDataFundtion("CompanyPolicy/").then((res) => {
      const policy = res.data;
      setCompanyOffDays(policy?.workWeek?.offDays || ["Sunday"]);
    });
    getDataFundtion("HrAllowanceType/getNameId").then((res) => {
      const types = res.data || [];
      setAllowanceTypes(types);
      if (!isEdit) {
        setEmployeeAllowances(types.map(t => ({
          typeId: t._id,
          code: t.code,
          name: t.name,
          amount: 0
        })));
      } else {
        getDataFundtion(`/HrEmployee/${id}`).then((empRes) => {
          const emp = empRes.data;
          const existing = emp?.salarySetupBasket?.allowances || [];
          const merged = types.map(t => {
            const found = existing.find(e => e.code === t.code || e.typeId === t._id);
            return {
              typeId: t._id,
              code: t.code,
              name: t.name,
              amount: found ? (found.amount || 0) : 0
            };
          });
          setEmployeeAllowances(merged);
        });
      }
    });
    getDataFundtion("HrDeductionType/getNameId").then((res) => {
      const types = res.data || [];
      setDeductionTypes(types);
      if (!isEdit) {
        setEmployeeDeductions(types.map(t => ({
          typeId: t._id,
          code: t.code,
          name: t.name,
          amount: 0
        })));
      } else {
        getDataFundtion(`/HrEmployee/${id}`).then((empRes) => {
          const emp = empRes.data;
          const existing = emp?.salarySetupBasket?.deductions || [];
          const merged = types.map(t => {
            const found = existing.find(e => e.code === t.code || e.typeId === t._id);
            return {
              typeId: t._id,
              code: t.code,
              name: t.name,
              amount: found ? (found.amount || 0) : 0
            };
          });
          setEmployeeDeductions(merged);
        });
      }
    });

    if (isEdit) {
      getDataFundtion(`/HrEmployee/${id}`).then((res) => {
        const d = res.data;
        reset({
          firstName: d.firstName,
          lastName: d.lastName,
          email: d.email,
          phone: d.phone,
          cnic: d.cnic,
          dateOfBirth: d.dateOfBirth ? d.dateOfBirth.split('T')[0] : '',
          gender: d.gender || 'male',
          bloodGroup: d.bloodGroup || '',
          maritalStatus: d.maritalStatus || '',
          departmentId: d.departmentId?._id || d.departmentId,
          designationId: d.designationId?._id || d.designationId,
          joiningDate: d.joiningDate ? d.joiningDate.split('T')[0] : '',
          employmentType: d.employmentType || 'permanent',
          status: d.status || 'active',
          statusDate: d.statusDate ? d.statusDate.split('T')[0] : '',
          employeeReligion: d.policyTags?.religion || 'Muslim',
          storeId: d.storeId || '',
          cityId: d.cityId || '',
          locationId: d.locationId || '',
          isForDistributor: d.isForDistributor || false,
          reportsTo: d.reportsTo?._id || d.reportsTo || '',
          basicSalary: d.salarySetupBasket?.basicSalary || '',
          workingHours: d.workingHours || 9,
          casualAllocated: d.leaveBucket?.casual?.allocated || 16,
          medicalAllocated: d.leaveBucket?.medical?.allocated || 10,
          annualAllocated: d.leaveBucket?.annual?.allocated || 14,
          ntuNumber: d.taxInfo?.ntuNumber || '',
          eobiNumber: d.taxInfo?.eobiNumber || '',
          socialSecurityNumber: d.taxInfo?.socialSecurityNumber || '',
          bankName: d.bankName || '',
          bankAccount: d.bankAccount || '',
          emergencyName: d.emergencyContact?.name || '',
          emergencyPhone: d.emergencyContact?.phone || '',
          emergencyRelation: d.emergencyContact?.relation || '',
          address: d.address || '',
          fatherName: d.fatherName || '',
          personalFileNo: d.personalFileNo || '',
          insurancePolicyNo: d.insurancePolicyNo || '',
          birthPlace: d.birthPlace || '',
          drivingLicenseNo: d.drivingLicenseNo || '',
          drivingLicenseExpiry: d.drivingLicenseExpiry ? d.drivingLicenseExpiry.split('T')[0] : '',
          ebfDate: d.ebfDate ? d.ebfDate.split('T')[0] : '',
          sessiDate: d.sessiDate ? d.sessiDate.split('T')[0] : '',
          providentFund: d.providentFund || false,
          hasBadDebt: d.hasBadDebt || false,
          hasLoan: d.hasLoan || false,
          hasEBF: d.hasEBF || false,
          hasAdvance: d.hasAdvance || false,
          payType: d.payType || 'bank_transfer',
          openingCasual: d.openingLeaves?.casual || 0,
          openingMedical: d.openingLeaves?.medical || 0,
          openingAnnual: d.openingLeaves?.annual || 0,
          dailyTimeIn: d.dailySetup?.timeIn || '09:00',
          dailyTimeOut: d.dailySetup?.timeOut || '18:00',
          otAllowed: d.overtimeSetup?.otAllowed || false,
          otRate: d.overtimeSetup?.otRate || 0,
          excludeGrace: d.excludeGrace || false,
          gracePeriodMinutes: d.gracePeriodMinutes || 15,
          lateDeduction: d.lateDeduction !== undefined ? d.lateDeduction : true,
          annualLeave: d.annualLeave !== undefined ? d.annualLeave : true,
          encashable: d.encashable || false,
          attendanceAllowance: d.attendanceAllowance || false,
          attendanceAllowancePerDay: d.attendanceAllowancePerDay || 1,
        });
        getDataFundtion("Store").then((storeRes) => {
          const storeList = storeRes.data || [];
          setStores(storeList);
          const matchedStore = storeList.find(s => s._id === d.storeId);
          if (matchedStore) setSelectedStore(matchedStore);
        });
      });
    }
  }, [id]);

  const handleStoreChange = (selected) => {
    setSelectedStore(selected);
    setValue("storeId", selected?.value || "");
    setValue("cityId", "");
    setValue("locationId", "");
  };

  const onSubmit = async (data) => {
    const payload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      cnic: data.cnic,
      dateOfBirth: data.dateOfBirth || undefined,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      maritalStatus: data.maritalStatus,
      departmentId: data.departmentId,
      designationId: data.designationId,
      joiningDate: data.joiningDate || undefined,
      employmentType: data.employmentType,
      status: data.status,
      statusDate: data.statusDate || null,
      storeId: selectedStore?.value || null,
      cityId: isForDistributor ? (data.cityId || null) : null,
      locationId: !isForDistributor ? (data.locationId || null) : null,
      isForDistributor: Boolean(data.isForDistributor),
      reportsTo: data.reportsTo || null,
      policyTags: {
        religion: data.employeeReligion,
        workWeek: { offDays: companyOffDays }
      },
      salarySetupBasket: {
        basicSalary: Number(data.basicSalary) || 0,
        allowances: employeeAllowances,
        deductions: employeeDeductions
      },
      leaveBucket: {
        casual: { allocated: Number(data.casualAllocated) || 16, used: 0, balance: Number(data.casualAllocated) || 16 },
        medical: { allocated: Number(data.medicalAllocated) || 10, used: 0, balance: Number(data.medicalAllocated) || 10 },
        annual: { allocated: Number(data.annualAllocated) || 14, used: 0, balance: Number(data.annualAllocated) || 14 }
      },
      taxInfo: {
        ntuNumber: data.ntuNumber,
        eobiNumber: data.eobiNumber,
        socialSecurityNumber: data.socialSecurityNumber
      },
      bankName: data.bankName,
      bankAccount: data.bankAccount,
      emergencyContact: { name: data.emergencyName, phone: data.emergencyPhone, relation: data.emergencyRelation },
      address: data.address,
      fatherName: data.fatherName,
      personalFileNo: data.personalFileNo,
      insurancePolicyNo: data.insurancePolicyNo,
      birthPlace: data.birthPlace,
      drivingLicenseNo: data.drivingLicenseNo,
      drivingLicenseExpiry: data.drivingLicenseExpiry || undefined,
      ebfDate: data.ebfDate || undefined,
      sessiDate: data.sessiDate || undefined,
      providentFund: Boolean(data.providentFund),
      hasBadDebt: Boolean(data.hasBadDebt),
      hasLoan: Boolean(data.hasLoan),
      hasEBF: Boolean(data.hasEBF),
      hasAdvance: Boolean(data.hasAdvance),
      payType: data.payType,
      openingLeaves: {
        casual: Number(data.openingCasual) || 0,
        medical: Number(data.openingMedical) || 0,
        annual: Number(data.openingAnnual) || 0,
      },
      dailySetup: { timeIn: data.dailyTimeIn, timeOut: data.dailyTimeOut },
      overtimeSetup: { otAllowed: Boolean(data.otAllowed), otRate: Number(data.otRate) || 0 },
      excludeGrace: Boolean(data.excludeGrace),
      gracePeriodMinutes: Number(data.gracePeriodMinutes) || 15,
      lateDeduction: Boolean(data.lateDeduction),
      workingHours: Number(data.workingHours) || 9,
      annualLeave: Boolean(data.annualLeave),
      encashable: Boolean(data.encashable),
      attendanceAllowance: Boolean(data.attendanceAllowance),
      attendanceAllowancePerDay: Number(data.attendanceAllowancePerDay) || 1,
    };
    try {
      if (isEdit) {
        await updateDataFunction(`/HrEmployee/updateEmployee/${id}`, payload);
        toast.success("Employee updated");
      } else {
        await createDataFunction("/HrEmployee", payload);
        toast.success("Employee added");
      }
      setTimeout(() => navigate("/EmployeeHrList"), 1000);
    } catch {
      toast.error("Something went wrong");
    }
  };

  // Tab config
  const tabs = [
    { key: 'personal', label: 'Personal Info' },
    { key: 'employment', label: 'Employment & Location' },
    { key: 'salary', label: 'Salary & Benefits' },
    { key: 'leave', label: 'Leave & Attendance' },
  ];

  return (
    <div className="pd-card p-6">
      <ToastContainer />

      {/* Tab Header */}
      <div className="mb-4">
        <div className="flex border-b pd-border-default border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === tab.key
                ? 'border-[color:var(--pd-primary)] pd-text-primary'
                : 'pd-tab-inactive'
                }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ==================== TAB 1: Personal Info ==================== */}
        {activeTab === 'personal' && (
          <>
            <h3 className="text-lg font-semibold mb-4 pd-section-title">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <input {...register("firstName", { required: "Required" })} className="w-full pd-input" />
                {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
              </div>
              <div><label className="block text-sm font-medium mb-1">Last Name</label><input {...register("lastName")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" {...register("email")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input {...register("phone")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">CNIC</label><input {...register("cnic")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Date of Birth</label><input type="date" {...register("dateOfBirth")} className="w-full pd-input" /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <select {...register("gender")} className="w-full pd-input">
                  <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Blood Group</label><input {...register("bloodGroup")} className="w-full pd-input" placeholder="e.g. A+" /></div>
              <div><label className="block text-sm font-medium mb-1">Marital Status</label><input {...register("maritalStatus")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Joining Date</label><input type="date" {...register("joiningDate")} className="w-full pd-input" /></div>
            </div>

            <h3 className="text-lg font-semibold mb-4 pd-section-title">Additional Personal Info (PDL)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div><label className="block text-sm font-medium mb-1">Father Name</label><input {...register("fatherName")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Personal File No.</label><input {...register("personalFileNo")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Insurance Policy No.</label><input {...register("insurancePolicyNo")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Birth Place</label><input {...register("birthPlace")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Driving License #</label><input {...register("drivingLicenseNo")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Driving License Expiry</label><input type="date" {...register("drivingLicenseExpiry")} className="w-full pd-input" /></div>
            </div>

            <h3 className="text-lg font-semibold mb-4 pd-section-title">Bank & Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div><label className="block text-sm font-medium mb-1">Bank Name</label><input {...register("bankName")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Account Number</label><input {...register("bankAccount")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Address</label><input {...register("address")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Emergency Contact Name</label><input {...register("emergencyName")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Emergency Phone</label><input {...register("emergencyPhone")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Relation</label><input {...register("emergencyRelation")} className="w-full pd-input" /></div>
            </div>
          </>
        )}

        {/* ==================== TAB 2: Employment & Location ==================== */}
        {activeTab === 'employment' && (
          <>
            <h3 className="text-lg font-semibold mb-4 pd-section-title">Employment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Department *</label>
                <AppSelect
                  options={departments.map(d => ({ value: d._id, label: d.name }))}
                  value={watchedDepartmentId ? departments.filter(d => d._id === watchedDepartmentId).map(d => ({ value: d._id, label: d.name }))[0] || null : null}
                  onChange={(sel) => { setValue("departmentId", sel?.value || ""); trigger("departmentId"); }}
                  isClearable
                  placeholder="Select Department"
                />
                {errors.departmentId && <p className="text-red-500 text-sm">{errors.departmentId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Designation *</label>
                <AppSelect
                  options={designations.map(d => ({ value: d._id, label: d.name }))}
                  value={watchedDesignationId ? designations.filter(d => d._id === watchedDesignationId).map(d => ({ value: d._id, label: d.name }))[0] || null : null}
                  onChange={(sel) => { setValue("designationId", sel?.value || ""); trigger("designationId"); }}
                  isClearable
                  placeholder="Select Designation"
                />
                {errors.designationId && <p className="text-red-500 text-sm">{errors.designationId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employment Type</label>
                <select {...register("employmentType")} className="w-full pd-input">
                  <option value="permanent">Permanent</option><option value="contract">Contract</option>
                  <option value="guest">Guest</option><option value="intern">Intern</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select {...register("status")} className="w-full pd-input">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option><option value="on_notice">On Notice</option>
                </select>
              </div>
              {(watchedStatus === "inactive" || watchedStatus === "terminated") && (
                <div>
                  <label className="block text-sm font-medium mb-1">Status Date *</label>
                  <input type="date" {...register("statusDate", { required: "Status date is required" })} className="w-full pd-input" />
                  {errors.statusDate && <p className="text-red-500 text-sm">{errors.statusDate.message}</p>}
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-4 pd-section-title">Business & Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Business / Store *</label>
                <AppSelect
                  options={stores.map(s => ({ value: s._id, label: s.StoreName }))}
                  value={selectedStore}
                  onChange={handleStoreChange}
                  isClearable
                  placeholder="Select Business"
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  {...register("isForDistributor")}
                  id="isForDistributor"
                  className="accent-blue-600"
                />
                <label htmlFor="isForDistributor" className="text-sm font-medium">Is Distributor?</label>
              </div>
              {isForDistributor && (
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <AppSelect
                    options={cities.map(c => ({ value: c._id, label: c.CityName }))}
                    value={watchedCityId ? cities.filter(c => c._id === watchedCityId).map(c => ({ value: c._id, label: c.CityName }))[0] || null : null}
                    onChange={(sel) => setValue("cityId", sel?.value || "")}
                    isClearable
                    placeholder="Select City"
                  />
                </div>
              )}
              {!isForDistributor && selectedStore && (
                <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <AppSelect
                    options={locations.map(l => ({ value: l._id, label: l.LocationName }))}
                    value={watchedLocationId ? locations.filter(l => l._id === watchedLocationId).map(l => ({ value: l._id, label: l.LocationName }))[0] || null : null}
                    onChange={(sel) => setValue("locationId", sel?.value || "")}
                    isClearable
                    placeholder="Select Location"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Reports To</label>
                <AppSelect
                  options={employees
                    .filter(e => e._id !== id)
                    .map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.code})` }))}
                  value={watchedReportsTo ? employees.filter(e => e._id === watchedReportsTo).map(e => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.code})` }))[0] || null : null}
                  onChange={(sel) => setValue("reportsTo", sel?.value || null)}
                  isClearable
                  placeholder="Select Manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Religion</label>
                <select {...register("employeeReligion")} className="w-full pd-input">
                  {religions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Off Days</label>
                <select
                  multiple
                  value={companyOffDays}
                  onChange={(e) => setCompanyOffDays(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full pd-input"
                >
                  {['Sunday','Friday','Saturday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
          </>
        )}

        {/* ==================== TAB 3: Salary & Benefits ==================== */}
        {activeTab === 'salary' && (
          <>
            {/* Salary Sub-Tabs */}
            <div className="mb-4">
              <div className="flex border-b pd-border-default border">
                {[{ key: 'salarySetup', label: 'Salary Setup' }, { key: 'allowances', label: 'Allowances' }, { key: 'deductions', label: 'Deductions' }, { key: 'otherInfo', label: 'Other Info' }].map((sub) => (
                  <button
                    key={sub.key}
                    type="button"
                    className={`py-2 px-4 font-medium text-sm border-b-2 ${salarySubTab === sub.key
                      ? 'border-[color:var(--pd-primary)] pd-text-primary'
                      : 'pd-tab-inactive'
                      }`}
                    onClick={() => setSalarySubTab(sub.key)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Tab: Salary Setup */}
            {salarySubTab === 'salarySetup' && (
              <>
                <h3 className="text-lg font-semibold mb-4 pd-section-title">Salary Setup Basket</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Basic Salary *</label>
                    <input type="number" {...register("basicSalary", { required: "Required" })} className="w-full pd-input" />
                    {errors.basicSalary && <p className="text-red-500 text-sm">{errors.basicSalary.message}</p>}
                  </div>
                </div>
              </>
            )}

            {/* Sub-Tab: Allowances */}
            {salarySubTab === 'allowances' && (
              <>
                <h3 className="text-lg font-semibold mb-4 pd-section-title">Allowances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {employeeAllowances.map((allowance, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium mb-1">
                        {allowance.name}
                        {allowanceTypes.find(t => t.code === allowance.code)?.type === 'per_day' && (
                          <span className="text-xs text-gray-400 ml-1">(Per Day)</span>
                        )}
                      </label>
                      <input
                        type="number"
                        value={allowance.amount || 0}
                        onChange={(e) => {
                          const updated = [...employeeAllowances];
                          updated[idx] = { ...updated[idx], amount: Number(e.target.value) || 0 };
                          setEmployeeAllowances(updated);
                        }}
                        className="w-full pd-input"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Sub-Tab: Deductions */}
            {salarySubTab === 'deductions' && (
              <>
                <h3 className="text-lg font-semibold mb-4 pd-section-title">Deductions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {employeeDeductions.map((deduction, idx) => (
                    <div key={idx}>
                      <label className="block text-sm font-medium mb-1">{deduction.name}</label>
                      <input
                        type="number"
                        value={deduction.amount || 0}
                        onChange={(e) => {
                          const updated = [...employeeDeductions];
                          updated[idx] = { ...updated[idx], amount: Number(e.target.value) || 0 };
                          setEmployeeDeductions(updated);
                        }}
                        className="w-full pd-input"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Sub-Tab: Other Info (Statutory + PDL) */}
            {salarySubTab === 'otherInfo' && (
              <>
                <h3 className="text-lg font-semibold mb-4 pd-section-title">Statutory Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div><label className="block text-sm font-medium mb-1">NTU Number</label><input {...register("ntuNumber")} className="w-full pd-input" /></div>
                  <div><label className="block text-sm font-medium mb-1">EOBI Number</label><input {...register("eobiNumber")} className="w-full pd-input" /></div>
                  <div><label className="block text-sm font-medium mb-1">Social Security No.</label><input {...register("socialSecurityNumber")} className="w-full pd-input" /></div>
                </div>

                <h3 className="text-lg font-semibold mb-4 pd-section-title">Other Info (PDL)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div><label className="block text-sm font-medium mb-1">EBF Date</label><input type="date" {...register("ebfDate")} className="w-full pd-input" /></div>
                  <div><label className="block text-sm font-medium mb-1">SESSI Date</label><input type="date" {...register("sessiDate")} className="w-full pd-input" /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Pay Type</label>
                    <select {...register("payType")} className="w-full pd-input">
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...register("providentFund")} id="providentFund" className="accent-blue-600" />
                    <label htmlFor="providentFund" className="text-sm font-medium">Enrolled in Provident Fund</label>
                  </div>
                  {financialFlags.map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <input type="checkbox" {...register(item.key)} id={item.key} className="accent-blue-600" />
                      <label htmlFor={item.key} className="text-sm font-medium">{item.label}</label>
                      {isEdit && watch(item.key) && (
                        <button
                          type="button"
                          title={`View ${item.label}`}
                          className="p-0.5 text-blue-600 hover:text-blue-800"
                          onClick={() => navigate(`/EmployeeHrView/${id}/${item.type}`)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ==================== TAB 4: Leave & Attendance ==================== */}
        {activeTab === 'leave' && (
          <>
            <h3 className="text-lg font-semibold mb-4 pd-section-title">Leave Bucket (Annual Entitlements)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div><label className="block text-sm font-medium mb-1">Casual Leave</label><input type="number" {...register("casualAllocated")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Medical Leave</label><input type="number" {...register("medicalAllocated")} className="w-full pd-input" /></div>
              <div><label className="block text-sm font-medium mb-1">Annual Leave</label><input type="number" {...register("annualAllocated")} className="w-full pd-input" /></div>
            </div>

            <h3 className="text-lg font-semibold mb-4 pd-section-title">Leave Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Annual Leave</label>
                <select {...register("annualLeave")} className="w-full pd-input" onChange={(e) => setAnnualLeave(e.target.value)}>
                  <option value={true}>Yes</option>
                  <option value={false}>No</option>
                </select>
              </div>
              {annualLeave == "true" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Encashable</label>
                  <select {...register("encashable")} className="w-full pd-input">
                    <option value={false}>No</option>
                    <option value={true}>Yes</option>
                  </select>
                </div>
              )}
              {annualLeave == "false" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Attendance Allowance</label>
                  <select {...register("attendanceAllowance")} className="w-full pd-input" onChange={(e) => setWatchedAttendanceAllowance(e.target.value)}>
                    <option value={false}>No</option>
                    <option value={true}>Yes</option>
                  </select>
                </div>
              )}
              {annualLeave == "false" && watchedAttendanceAllowance == "true" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Per Day Amount</label>
                  <select {...register("attendanceAllowancePerDay")} className="w-full pd-input">
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold mb-4 pd-section-title">Opening Leaves</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div><label className="block text-sm font-medium mb-1">Opening Casual Leave</label><input type="number" {...register("openingCasual")} className="w-full pd-input" defaultValue={0} /></div>
              <div><label className="block text-sm font-medium mb-1">Opening Medical Leave</label><input type="number" {...register("openingMedical")} className="w-full pd-input" defaultValue={0} /></div>
              <div><label className="block text-sm font-medium mb-1">Opening Annual Leave</label><input type="number" {...register("openingAnnual")} className="w-full pd-input" defaultValue={0} /></div>
            </div>

            <h3 className="text-lg font-semibold mb-4 pd-section-title">Daily & Overtime Setup</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div><label className="block text-sm font-medium mb-1">Time In (HH:MM)</label><input {...register("dailyTimeIn")} className="w-full pd-input" placeholder="09:00" /></div>
              <div><label className="block text-sm font-medium mb-1">Time Out (HH:MM)</label><input {...register("dailyTimeOut")} className="w-full pd-input" placeholder="18:00" /></div>
              <div><label className="block text-sm font-medium mb-1">Working Hours / Day</label><input type="number" step="0.5" {...register("workingHours")} className="w-full pd-input" defaultValue={9} /></div>
              <div><label className="block text-sm font-medium mb-1">OT Rate (per hour)</label><input type="number" step="0.01" {...register("otRate")} className="w-full pd-input" defaultValue={0} /></div>
              <div><label className="block text-sm font-medium mb-1">Grace Period (minutes)</label><input type="number" {...register("gracePeriodMinutes")} className="w-full pd-input" defaultValue={15} /></div>
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("otAllowed")} id="otAllowed" className="accent-blue-600" />
                  <label htmlFor="otAllowed" className="text-sm font-medium">OT Allowed</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("excludeGrace")} id="excludeGrace" className="accent-blue-600" />
                  <label htmlFor="excludeGrace" className="text-sm font-medium">Exclude Grace</label>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" {...register("lateDeduction")} id="lateDeduction" className="accent-blue-600" defaultChecked />
                  <label htmlFor="lateDeduction" className="text-sm font-medium">Late Deduction Active</label>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab Navigation Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          {activeTab !== 'personal' && (
            <button
              type="button"
              className="pd-btn-outline"
              onClick={() => {
                const idx = tabs.findIndex(t => t.key === activeTab);
                if (idx > 0) setActiveTab(tabs[idx - 1].key);
              }}
            >
              Previous
            </button>
          )}
          {activeTab !== 'leave' && (
            <button
              type="button"
              className="pd-btn-save"
              onClick={() => {
                const idx = tabs.findIndex(t => t.key === activeTab);
                if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1].key);
              }}
            >
              Next
            </button>
          )}
          {activeTab === 'leave' && (
            <button type="submit" className="pd-btn-save">
              {isEdit ? "Update" : "Save"}
            </button>
          )}
          <button type="button" className="pd-btn-outline" onClick={() => navigate("/EmployeeHrList")}>Cancel</button>
        </div>
      </form>

      {/* Salary Lines Grid — only in edit mode */}
      {isEdit && <SalaryLinesEditor employeeId={id} />}
    </div>
  );
};

export default EmployeeForm;
