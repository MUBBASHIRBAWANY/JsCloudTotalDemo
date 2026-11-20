import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../../../Api/ApiInstance';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ZKTECO_KEYWORDS = {
  employeeId: ['employee', 'emp', 'pin', 'code', 'empcode', 'emp_code', 'employee_code', 'employee id', 'emp id', 'id', 'userid'],
  punchTime: ['punch', 'time', 'timestamp', 'datetime', 'date time', 'punch_time', 'punchtime', 'check_time'],
  punchType: ['status', 'check', 'type', 'in/out', 'i/o', 'checktype', 'check_type', 'punchtype'],
};

const PROCESSED_KEYWORDS = {
  employeeCode: ['employee', 'emp', 'code', 'employeecode', 'empcode', 'emp_code', 'employee_code', 'emp id', 'employee id', 'id'],
  date: ['date', 'attdate', 'attendance_date', 'punch_date'],
  checkIn: ['checkin', 'check_in', 'check-in', 'in_time', 'intime', 'punch_in', 'arrival', 'first_punch', 'morning'],
  checkOut: ['checkout', 'check_out', 'check-out', 'out_time', 'outtime', 'punch_out', 'departure', 'last_punch', 'evening'],
  status: ['status', 'attendance', 'present', 'absent'],
};

function autoDetect(hdrs, keywordMap) {
  const lower = hdrs.map(h => h.toLowerCase().trim());
  const result = {};
  for (const [field, keywords] of Object.entries(keywordMap)) {
    const idx = lower.findIndex(h => keywords.some(k => h.includes(k)));
    result[field] = idx >= 0 ? hdrs[idx] : '';
  }
  return result;
}

function isPunchFormat(mapping) {
  return mapping.punchTime && (mapping.punchType || true);
}

function normalizeDate(val) {
  // Excel serial date number — use XLSX library for reliable conversion
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  let s = String(val).trim();
  if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(s)) {
    const p = s.split(/[\/-]/);
    return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  if (/^\d{2}[\/-]\d{2}[\/-]\d{2}$/.test(s)) {
    const p = s.split(/[\/-]/);
    const yr = parseInt(p[2]) < 50 ? '20' + p[2] : '19' + p[2];
    return `${yr}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  }
  return s;
}

function normalizeTime(value) {
  if (value === undefined || value === null || value === '') return '';

  // Excel fractional time
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Already formatted
  return String(value).trim();
}

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current }) {
  const steps = ['Upload File', 'Map & Preview', 'Confirm'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const num = i + 1;
        const isActive = num === current;
        const isDone = num < current;
        return (
          <React.Fragment key={num}>
            {i > 0 && <div className={`w-8 h-0.5 ${isDone ? 'bg-green-500' : 'bg-gray-300'}`} />}
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-blue-600 text-white' :
                isDone ? 'bg-green-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                {isDone ? '✓' : num}
              </div>
              <span className={`text-sm font-medium ${isActive ? 'text-blue-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const AttendanceBulkUpload = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.attendanceHr);

  const [step, setStep] = useState(1);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isPunchMode, setIsPunchMode] = useState(false);

  // Column mapping
  const [mapping, setMapping] = useState({});
  const [overwrite, setOverwrite] = useState(false);
  const [autoFillAbsences, setAutoFillAbsences] = useState(true);

  // Preview results
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Final results
  const [importResult, setImportResult] = useState(null);

  // ── Step 1: File Upload ──────────────────────────────────────────────

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      const firstRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

      setRawData(jsonData);
      setHeaders(firstRow || []);

      // Auto-detect format
      const punchMapping = autoDetect(firstRow || [], ZKTECO_KEYWORDS);
      const processedMapping = autoDetect(firstRow || [], PROCESSED_KEYWORDS);

      if (isPunchFormat(punchMapping)) {
        setIsPunchMode(true);
        setMapping(punchMapping);
      } else {
        setIsPunchMode(false);
        setMapping(processedMapping);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const canProceedToStep2 = rawData.length > 0 && headers.length > 0;

  // ── Step 2: Preview ──────────────────────────────────────────────────

  const handlePreview = async () => {
    if (isPunchMode) {
      // Build punches from raw data
      const punches = rawData.map(row => ({
        employeeCode: String(row[mapping.employeeCode] || '').trim(),
        punchTime: row[mapping.punchTime] || '',
        punchType: normalizePunchType(row[mapping.punchType] || ''),
      })).filter(p => p.employeeCode && p.punchTime);

      try {
        setPreviewLoading(true);
        const res = await api.post('/HrAttendance/punch-preview', { punches, overwrite });
        setPreview(res.data);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Preview failed');
      } finally {
        setPreviewLoading(false);
      }
    } else {
      // Build pre-processed rows
      const rows = rawData.map(row => {
        let dateVal = normalizeDate(row[mapping.date] || '');
        return {
          employeeCode: String(row[mapping.employeeCode] || '').trim(),
          date: dateVal,
          checkIn: mapping.checkIn
            ? normalizeTime(row[mapping.checkIn])
            : '',

          checkOut: mapping.checkOut
            ? normalizeTime(row[mapping.checkOut])
            : '',
          status: mapping.status ? String(row[mapping.status] || '').trim().toLowerCase() : 'present',
        };
      }).filter(r => r.employeeCode && r.date);

      // Use existing bulk-upload API for pre-processed data
      try {
        setPreviewLoading(true);
        // Build a preview locally for pre-processed data
        const previewRows = rows.slice(0, 50).map(r => ({
          employeeCode: r.employeeCode,
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          status: r.status || (r.checkIn ? 'present' : 'absent'),
          overtime: 0,
        }));
        setPreview({
          status: true,
          preview: previewRows,
          newCount: rows.length,
          updateCount: 0,
          skipCount: 0,
          errors: [],
          _totalCount: rows.length,
          _isBulkUpload: true,
          _rows: rows,
        });
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  const normalizePunchType = (val) => {
    const s = String(val).toLowerCase().trim();
    if (!s || s === 'undefined' || s === 'null') return null;
    if (['in', 'i', '1', 'check in', 'checkin'].includes(s)) return 'in';
    if (['out', 'o', '0', 'check out', 'checkout'].includes(s)) return 'out';
    return null; // unknown type → let backend auto-detect from time order
  };

  // ── Step 3: Confirm Import ───────────────────────────────────────────

  const handleImport = async () => {
    try {
      if (isPunchMode) {
        const punches = rawData.map(row => ({
          employeeCode: String(row[mapping.employeeCode] || '').trim(),
          punchTime: row[mapping.punchTime] || '',
          punchType: normalizePunchType(row[mapping.punchType] || ''),
        })).filter(p => p.employeeCode && p.punchTime);

        const res = await api.post('/HrAttendance/punch-import', { punches, overwrite });
        setImportResult(res.data);
        toast.success(`${res.data.processed} attendance record(s) imported`);
      } else {
        const rows = preview._rows;
        const res = await api.post('/HrAttendance/bulk-upload', { rows, autoFillAbsences });
        setImportResult({
          status: true,
          processed: res.data.processed || 0,
          newRecords: res.data.processed || 0,
          updatedRecords: 0,
          skipped: res.data.skipped || 0,
          errors: res.data.errors || [],
        });
        toast.success(`${res.data.processed || 0} attendance record(s) imported`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Import failed');
    }
  };

  // ── Download Sample ──────────────────────────────────────────────────

  const handleDownloadSample = () => {
    const sample = [
      ['Employee ID', 'Punch Time', 'Status'],
      ['0001', '2026-07-01 09:00:00', 'In'],
      ['0001', '2026-07-01 17:30:00', 'Out'],
      ['0002', '2026-07-01 09:45:00', 'In'],
      ['0002', '2026-07-01 18:00:00', 'Out'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ZKTeco Punches');
    XLSX.writeFile(wb, 'zkteco-punch-sample.csv');
  };

  const handleDownloadProcessedSample = () => {
    const sample = [
      ['employeeCode', 'date', 'checkIn', 'checkOut', 'status'],
      ['0001', '2026-07-01', '09:00', '17:30', 'present'],
      ['0002', '2026-07-01', '09:45', '18:00', 'late'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sample);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Processed');
    XLSX.writeFile(wb, 'attendance-processed-sample.csv');
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <StepIndicator current={step} />

      {/* ── STEP 1: Upload ──────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Upload Attendance File</h3>
            <div className="flex gap-2">
              <button onClick={handleDownloadSample} className="pd-btn-outline text-xs">
                ZKTeco Sample CSV
              </button>
              <button onClick={handleDownloadProcessedSample} className="pd-btn-outline text-xs">
                Processed Sample CSV
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
            <p className="font-medium text-blue-800 mb-2">Supported formats:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white rounded p-3 border border-blue-100">
                <p className="font-medium text-blue-700">ZKTeco Punch Format</p>
                <p className="text-blue-600 text-xs mt-1">Employee ID, Punch Time, Status (In/Out)</p>
                <p className="text-gray-500 text-xs">System auto-converts punches to daily attendance</p>
              </div>
              <div className="bg-white rounded p-3 border border-blue-100">
                <p className="font-medium text-blue-700">Pre-processed Format</p>
                <p className="text-blue-600 text-xs mt-1">Employee Code, Date, Check-In, Check-Out, Status</p>
                <p className="text-gray-500 text-xs">Already converted daily attendance data</p>
              </div>
            </div>
          </div>

          {/* Drag and drop zone */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer mb-4"
            onClick={() => document.getElementById('file-input').click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
              const file = e.dataTransfer.files[0];
              if (file) {
                const input = document.getElementById('file-input');
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }}
          >
            <div className="text-4xl mb-2">📁</div>
            <p className="text-gray-600 font-medium">Drop your CSV or Excel file here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <span className="font-medium">{fileName}</span>
              <span>({rawData.length} rows detected)</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isPunchMode ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {isPunchMode ? 'ZKTeco Punch Format' : 'Pre-processed Format'}
              </span>
            </div>
          )}

          {rawData.length > 0 && (
            <button
              onClick={() => setStep(2)}
              className="pd-btn-save"
            >
              Next: Map Columns →
            </button>
          )}
        </div>
      )}

      {/* ── STEP 2: Map & Preview ──────────────────────────────── */}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Map Columns & Preview</h3>

          {/* Column Mapping */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-3">
              {isPunchMode ? 'Map ZKTeco Punch Columns' : 'Map Processed Columns'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isPunchMode ? (
                <>
                  <MappingSelect label="Employee ID *" value={mapping.employeeCode} onChange={v => setMapping({ ...mapping, employeeCode: v })} headers={headers} />
                  <MappingSelect label="Punch Time *" value={mapping.punchTime} onChange={v => setMapping({ ...mapping, punchTime: v })} headers={headers} />
                  <MappingSelect label="Punch Type (In/Out)" value={mapping.punchType} onChange={v => setMapping({ ...mapping, punchType: v })} headers={headers} />
                </>
              ) : (
                <>
                  <MappingSelect label="Employee Code *" value={mapping.employeeCode} onChange={v => setMapping({ ...mapping, employeeCode: v })} headers={headers} />
                  <MappingSelect label="Date *" value={mapping.date} onChange={v => setMapping({ ...mapping, date: v })} headers={headers} />
                  <MappingSelect label="Check-In" value={mapping.checkIn} onChange={v => setMapping({ ...mapping, checkIn: v })} headers={headers} />
                  <MappingSelect label="Check-Out" value={mapping.checkOut} onChange={v => setMapping({ ...mapping, checkOut: v })} headers={headers} />
                  <MappingSelect label="Status" value={mapping.status} onChange={v => setMapping({ ...mapping, status: v })} headers={headers} />
                </>
              )}
            </div>
          </div>

          {/* Overwrite toggle */}
          <div className="mb-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={(e) => setOverwrite(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Overwrite existing attendance records</span>
            </label>
            <span className="text-xs text-gray-500">(uncheck to skip duplicates)</span>
          </div>

          {/* Auto-fill absences toggle */}
          <div className="mb-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoFillAbsences}
                onChange={(e) => setAutoFillAbsences(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Auto-fill missing days as "absent"</span>
            </label>
            <span className="text-xs text-gray-500">(missing working days will be marked absent)</span>
          </div>

          {/* Raw data preview */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold mb-2">Raw Data Preview (first 10 rows)</h4>
            <div className="overflow-x-auto rounded-lg border pd-border-default">
              <table className="pd-data-table min-w-full text-sm">
                <thead>
                  <tr>
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-xs font-medium uppercase pd-text-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                  {rawData.slice(0, 10).map((row, ri) => (
                    <tr key={ri}>
                      {headers.map((h, ci) => (
                        <td key={ci} className="whitespace-nowrap px-3 py-2">{row[h] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview button */}
          <div className="flex gap-3 mb-6">
            <button onClick={() => setStep(1)} className="pd-btn-outline">← Back</button>
            <button
              onClick={handlePreview}
              disabled={previewLoading || !mapping.employeeCode || (!mapping.punchTime && !mapping.date)}
              className="pd-btn-save disabled:opacity-50"
            >
              {previewLoading ? 'Processing...' : 'Preview Processed Results'}
            </button>
          </div>

          {/* Processed preview table */}
          {preview && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-2">Processed Daily Attendance</h4>
              <div className="flex gap-4 mb-3 text-sm">
                <span className="text-blue-600 font-medium">Total: {preview.preview?.length || 0}</span>
                {preview.newRecords > 0 && <span className="text-green-600 font-medium">New: {preview.newRecords}</span>}
                {preview.updatedRecords > 0 && <span className="text-yellow-600 font-medium">Update: {preview.updatedRecords}</span>}
                {preview.skipCount > 0 && <span className="text-gray-500 font-medium">Skip: {preview.skipCount}</span>}
                {preview.errors?.length > 0 && <span className="text-red-600 font-medium">Errors: {preview.errors.length}</span>}
              </div>

              <div className="overflow-x-auto rounded-lg border pd-border-default max-h-96">
                <table className="pd-data-table min-w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium">Employee</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Check-In</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Check-Out</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Overtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                    {(preview.preview || []).slice(0, 50).map((rec, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{rec.employeeCode}</td>
                        <td className="px-3 py-2">{rec.date}</td>
                        <td className="px-3 py-2">{rec.checkIn || '—'}</td>
                        <td className="px-3 py-2">{rec.checkOut || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${rec.status === 'present' ? 'bg-green-100 text-green-700' :
                            rec.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                              rec.status === 'absent' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{rec.overtime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(preview.preview || []).length > 50 && (
                <p className="text-xs text-gray-500 mt-1">Showing 50 of {preview.preview.length} records</p>
              )}

              {/* Errors */}
              {preview.errors?.length > 0 && (
                <div className="mt-4 overflow-x-auto rounded-lg border border-red-200 bg-red-50">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-red-100">
                        <th className="px-3 py-2 text-left text-xs font-medium">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Employee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {preview.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{err.row ?? err.index ?? '-'}</td>
                          <td className="px-3 py-2">{err.employeeCode || '-'}</td>
                          <td className="px-3 py-2 text-red-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                <button onClick={() => setStep(3)} className="pd-btn-save">
                  Next: Confirm Import →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 3: Confirm ────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Confirm Import</h3>

          {!importResult ? (
            <>
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h4 className="font-medium mb-3">Import Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">File</p>
                    <p className="font-medium">{fileName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Format</p>
                    <p className="font-medium">{isPunchMode ? 'ZKTeco Punches' : 'Pre-processed'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Records</p>
                    <p className="font-medium">{preview?.preview?.length || rawData.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Mode</p>
                    <p className="font-medium">{overwrite ? 'Overwrite duplicates' : 'Skip duplicates'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="pd-btn-outline">← Back</button>
                <button onClick={handleImport} className="pd-btn-save">
                  Confirm & Import
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h4 className="font-medium text-green-800 mb-3">Import Complete</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Total Processed</p>
                    <p className="font-bold text-lg text-green-700">{importResult.processed || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">New Records</p>
                    <p className="font-bold text-lg text-green-600">{importResult.newRecords || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Updated</p>
                    <p className="font-bold text-lg text-yellow-600">{importResult.updatedRecords || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Skipped</p>
                    <p className="font-bold text-lg text-gray-600">{importResult.skipped || 0}</p>
                  </div>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="mb-6 overflow-x-auto rounded-lg border border-red-200 bg-red-50">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-red-100">
                        <th className="px-3 py-2 text-left text-xs font-medium">Row</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Employee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-200">
                      {importResult.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{err.row ?? err.index ?? '-'}</td>
                          <td className="px-3 py-2">{err.employeeCode || '-'}</td>
                          <td className="px-3 py-2 text-red-600">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setRawData([]); setHeaders([]); setFileName(''); setPreview(null); setImportResult(null); }} className="pd-btn-outline">
                  Upload Another File
                </button>
                <button onClick={() => navigate('/AttendanceHrList')} className="pd-btn-save">
                  View Attendance List →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Mapping Select Component ───────────────────────────────────────────────

function MappingSelect({ label, value, onChange, headers }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pd-input text-sm"
      >
        <option value="">-- Select Column --</option>
        {headers.map((h, i) => (
          <option key={i} value={h}>{h}</option>
        ))}
      </select>
    </div>
  );
}

export default AttendanceBulkUpload;
