import React, { useEffect, useState, useRef } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions';
import * as XLSX from 'xlsx';

const HolidayCalendarList = () => {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  const getData = async () => {
    const data = await getDataFundtion(`HolidayCalendar/?year=${year}`);
    setRows(data.data || []);
  };

  useEffect(() => { getData(); }, [year]);

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true); };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/HolidayCalendar/delete/${selectedId}`);
    setRows(rows.filter((r) => r._id !== selectedId));
    toast.success("Deleted");
  };

  // Load Pakistan holiday template
  const handleLoadTemplate = async () => {
    setLoadingTemplate(true);
    try {
      const res = await createDataFunction("/HolidayCalendar/load-template", { year });
      toast.success(`${res.imported} holidays imported, ${res.skipped} already existed`);
      getData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Bulk import from CSV
  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const holidays = jsonData.map(row => ({
          date: row.date || row.Date || '',
          name: row.name || row.Name || row.holiday || row.Holiday || '',
          province: row.province || row.Province || 'All',
          applicableReligion: row.applicableReligion || row.Religion || row.religion || 'All',
          isOptional: row.isOptional || row.Optional || false,
        })).filter(h => h.date && h.name);

        if (holidays.length === 0) {
          toast.error("No valid holidays found in file. Expected columns: date, name");
          return;
        }

        const res = await createDataFunction("/HolidayCalendar/bulk-import", { holidays });
        toast.success(`${res.imported} holidays imported, ${res.skipped} skipped`);
        getData();
      } catch (err) {
        toast.error("Failed to import holidays");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const columns = [
    {
      field: 'date', headerName: 'Date', width: 130,
      valueFormatter: (v) => v ? new Date(v).toLocaleDateString('en-GB') : '',
    },
    { field: 'name', headerName: 'Holiday Name', flex: 1, minWidth: 200 },
    { field: 'province', headerName: 'Province', width: 130 },
    { field: 'applicableReligion', headerName: 'Religion', width: 130 },
    { field: 'isOptional', headerName: 'Optional', width: 90, valueFormatter: (v) => v ? 'Yes' : 'No' },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 80,
      getActions: (params) => [
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDeleteClick(params.row._id)} />,
      ],
    },
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 3; y <= currentYear + 2; y++) years.push(y);

  return (
    <div>
      <ToastContainer />
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="pd-input">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={handleLoadTemplate}
          disabled={loadingTemplate}
          className="pd-btn-outline text-sm"
        >
          {loadingTemplate ? 'Loading...' : `Load ${year} Pakistan Holidays`}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="pd-btn-outline text-sm"
        >
          Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleBulkImport}
          className="hidden"
        />
      </div>
      <div style={{ height: 400, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSize={25} disableRowSelectionOnClick />
      </div>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Holiday?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default HolidayCalendarList;
