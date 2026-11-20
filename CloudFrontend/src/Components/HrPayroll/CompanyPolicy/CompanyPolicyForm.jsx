import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';

const TABS = [
  { id: 'shift', label: 'Shift & Attendance' },
  { id: 'ot', label: 'Overtime' },
  { id: 'leave', label: 'Leave Policy' },
  { id: 'salary', label: 'Salary Calculation' },
  { id: 'tax', label: 'Tax & Statutory' },
  { id: 'payslip', label: 'Payslip' },
];

const CompanyPolicyForm = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('shift');

  useEffect(() => {
    getDataFundtion("CompanyPolicy/").then((res) => {
      setPolicy(res.data);
      setLoading(false);
    });
  }, []);

  const handleChange = (field, value) => {
    setPolicy({ ...policy, [field]: value });
  };

  const handleNestedChange = (parent, field, value) => {
    setPolicy({ ...policy, [parent]: { ...policy[parent], [field]: value } });
  };

  const handleTaxSlabChange = (index, field, value) => {
    const slabs = [...(policy.taxSlabs || [])];
    slabs[index] = { ...slabs[index], [field]: Number(value) };
    setPolicy({ ...policy, taxSlabs: slabs });
  };

  const addTaxSlab = () => {
    const slabs = [...(policy.taxSlabs || []), { from: 0, to: 0, percentage: 0 }];
    setPolicy({ ...policy, taxSlabs: slabs });
  };

  const removeTaxSlab = (index) => {
    const slabs = (policy.taxSlabs || []).filter((_, i) => i !== index);
    setPolicy({ ...policy, taxSlabs: slabs });
  };

  const onSave = async () => {
    try {
      await updateDataFunction("/CompanyPolicy/", policy);
      toast.success("Policy updated");
    } catch {
      toast.error("Something went wrong");
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="pd-card p-6">
      <ToastContainer />

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b pd-border-default overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Shift & Attendance */}
      {activeTab === 'shift' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pd-section-title">Shift Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Shift Start</label>
              <input type="time" value={policy?.shiftStart || ''} onChange={(e) => handleChange('shiftStart', e.target.value)} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shift End</label>
              <input type="time" value={policy?.shiftEnd || ''} onChange={(e) => handleChange('shiftEnd', e.target.value)} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grace Period (minutes)</label>
              <input type="number" value={policy?.gracePeriodMinutes || 0} onChange={(e) => handleChange('gracePeriodMinutes', Number(e.target.value))} className="w-full pd-input" />
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4 pd-section-title">Work Week</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Off Days</label>
              <select
                multiple
                value={policy?.workWeek?.offDays || ['Sunday']}
                onChange={(e) => handleChange('workWeek', { offDays: Array.from(e.target.selectedOptions, o => o.value) })}
                className="w-full pd-input"
              >
                {['Sunday','Friday','Saturday'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Working Days/Week</label>
              <input type="number" value={policy?.workingDaysPerWeek || 6} onChange={(e) => handleChange('workingDaysPerWeek', Number(e.target.value))} className="w-full pd-input" />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Overtime */}
      {activeTab === 'ot' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pd-section-title">Overtime Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Regular OT Multiplier</label>
              <input type="number" step="0.1" value={policy?.overtimeMultiplier || 1.5} onChange={(e) => handleChange('overtimeMultiplier', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Holiday OT Multiplier</label>
              <input type="number" step="0.1" value={policy?.holidayOvertimeMultiplier || 2.0} onChange={(e) => handleChange('holidayOvertimeMultiplier', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max OT Hours/Day</label>
              <input type="number" value={policy?.maxOvertimeHours || 4} onChange={(e) => handleChange('maxOvertimeHours', Number(e.target.value))} className="w-full pd-input" />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-800">Late Deduction: Minute-Based</p>
            <p className="text-blue-600 mt-1">Late deduction is calculated per minute. Grace period determines if deduction applies.</p>
          </div>
        </div>
      )}

      {/* Tab: Leave Policy */}
      {activeTab === 'leave' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pd-section-title">Leave Policy (Annual Entitlements)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Casual Leave (Days/Year)</label>
              <input type="number" value={policy?.casualLeave || 12} onChange={(e) => handleChange('casualLeave', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Medical Leave (Days/Year)</label>
              <input type="number" value={policy?.medicalLeave || 10} onChange={(e) => handleChange('medicalLeave', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Annual Leave (Days/Year)</label>
              <input type="number" value={policy?.annualLeave || 14} onChange={(e) => handleChange('annualLeave', Number(e.target.value))} className="w-full pd-input" />
            </div>
          </div>

          <h3 className="text-lg font-semibold mb-4 pd-section-title">Annual Leave Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={policy?.annualLeaveCarryForward || false} onChange={(e) => handleChange('annualLeaveCarryForward', e.target.checked)} className="accent-blue-600" id="carryForward" />
              <label htmlFor="carryForward" className="text-sm font-medium">Allow Carry Forward</label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Carry Forward Days</label>
              <input type="number" value={policy?.annualLeaveMaxCarry || 14} onChange={(e) => handleChange('annualLeaveMaxCarry', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Free Leaves/Month (No Deduction)</label>
              <input type="number" value={policy?.freeLeavePerMonth || 1} onChange={(e) => handleChange('freeLeavePerMonth', Number(e.target.value))} className="w-full pd-input" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-800">How Free Leave Works</p>
            <p className="text-blue-600 mt-1">First {policy?.freeLeavePerMonth || 1} leave(s) per month = NO salary deduction, even if balance is 0.</p>
          </div>
        </div>
      )}

      {/* Tab: Salary Calculation */}
      {activeTab === 'salary' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pd-section-title">Salary Calculation Basis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Per Day Rate Calculation</label>
              <select
                value={policy?.payCalculationBasis || 'monthly_days'}
                onChange={(e) => handleChange('payCalculationBasis', e.target.value)}
                className="w-full pd-input"
              >
                <option value="monthly_days">Monthly Days (Basic Salary / Total Days in Month)</option>
                <option value="working_days">Working Days (Basic Salary / Actual Working Days)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {policy?.payCalculationBasis === 'working_days'
                  ? 'Per day rate = Basic Salary / Actual working days (excludes off days & holidays)'
                  : 'Per day rate = Basic Salary / Total calendar days of the month'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tax & Statutory */}
      {activeTab === 'tax' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pd-section-title">Income Tax</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={policy?.incomeTaxEnabled || false}
                onChange={(e) => handleChange('incomeTaxEnabled', e.target.checked)}
                className="accent-blue-600"
                id="taxEnabled"
              />
              <label htmlFor="taxEnabled" className="text-sm font-medium">Enable Income Tax Deduction</label>
            </div>
          </div>

          {policy?.incomeTaxEnabled && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Tax Slabs</h4>
                <button onClick={addTaxSlab} className="pd-btn-outline text-xs">+ Add Slab</button>
              </div>
              {(policy.taxSlabs || []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full pd-data-table text-sm">
                    <thead>
                      <tr>
                        <th>From (Rs.)</th>
                        <th>To (Rs.)</th>
                        <th>Percentage (%)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(policy.taxSlabs || []).map((slab, i) => (
                        <tr key={i}>
                          <td><input type="number" value={slab.from} onChange={(e) => handleTaxSlabChange(i, 'from', e.target.value)} className="w-full pd-input text-sm" /></td>
                          <td><input type="number" value={slab.to} onChange={(e) => handleTaxSlabChange(i, 'to', e.target.value)} className="w-full pd-input text-sm" /></td>
                          <td><input type="number" step="0.1" value={slab.percentage} onChange={(e) => handleTaxSlabChange(i, 'percentage', e.target.value)} className="w-full pd-input text-sm" /></td>
                          <td><button onClick={() => removeTaxSlab(i)} className="text-red-500 text-sm">Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <h3 className="text-lg font-semibold mb-4 pd-section-title">Social Security & EOBI</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">EOBI Employee Share (Rs.)</label>
              <input type="number" value={policy?.eobiEmployeeShare || 0} onChange={(e) => handleChange('eobiEmployeeShare', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">EOBI Employer Share (Rs.)</label>
              <input type="number" value={policy?.eobiEmployerShare || 0} onChange={(e) => handleChange('eobiEmployerShare', Number(e.target.value))} className="w-full pd-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Social Security Rate (%)</label>
              <input type="number" step="0.1" value={policy?.socialSecurityRate || 0} onChange={(e) => handleChange('socialSecurityRate', Number(e.target.value))} className="w-full pd-input" />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Payslip */}
      {activeTab === 'payslip' && (
        <div>
          <h3 className="text-lg font-semibold mb-4 pd-section-title">Payslip Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input type="text" value={policy?.companyName || ''} onChange={(e) => handleChange('companyName', e.target.value)} className="w-full pd-input" placeholder="Enter company name" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Payslip Header</label>
              <textarea
                value={policy?.payslipHeader || ''}
                onChange={(e) => handleChange('payslipHeader', e.target.value)}
                className="w-full pd-input"
                rows={3}
                placeholder="Text to show at the top of payslip"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payslip Footer</label>
              <textarea
                value={policy?.payslipFooter || ''}
                onChange={(e) => handleChange('payslipFooter', e.target.value)}
                className="w-full pd-input"
                rows={3}
                placeholder="Text to show at the bottom of payslip"
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-3 mt-6 pt-4 border-t pd-border-default">
        <button className="pd-btn-save" onClick={onSave}>Save Settings</button>
      </div>
    </div>
  );
};

export default CompanyPolicyForm;
