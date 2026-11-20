import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser.js';
import * as XLSX from 'xlsx';


const ChartofAccountsList = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null);
  const [deleteR, setdeleteR] = useState(false)
  const [editR, setEditR] = useState(false)
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const pageName = "List Chart of Accounts"
  const DeleteRight = "Delete Chart of Accounts"
  const EditRight = "Edit Chart of Accounts"
  const dispatch = useDispatch()

  const getData = async () => {
    try {
      const data = await getDataFundtion("/ChartofAccounts")
      const list = data.data
      dispatch(fetchChartofAccounts(list))
      const setForRows1 = list.filter((item) => item.AccountCode.startsWith(1))
      const setForRows2 = list.filter((item) => item.AccountCode.startsWith(2))
      const setForRows3 = list.filter((item) => item.AccountCode.startsWith(3))
      const setForRows4 = list.filter((item) => item.AccountCode.startsWith(4))
      const setForRows5 = list.filter((item) => item.AccountCode.startsWith(5))
      const setForRows = setForRows1.concat(setForRows2).concat(setForRows3).concat(setForRows4).concat(setForRows5)
      const setForRowsWithName = setForRows.map((item) => {
        return ({
          AccountCode: item.AccountCode,
          AccountName: item.AccountName,
          Stage: "Stage" + item.Stage,
          _id: item._id,
          Stage1: list.find((item1) => item1._id == item.Stage1)?.AccountName,
          Stage2: list.find((item1) => item1._id == item.Stage2)?.AccountName,
          Stage3: list.find((item1) => item1._id == item.Stage3)?.AccountName
        })
      })

      setRows(setForRowsWithName)

    } catch (err) {
      //console.log(err)
    }

  }

  const checkAcess = async () => {
    //console.log("Check")
    const allowAcess = await UserRihts.find((item) => item == DeleteRight)
    const allowEdit = await UserRihts.find((item) => item == EditRight)
    if (allowEdit) {
      setEditR(true)
    }
    if (allowAcess) {
      setdeleteR(true)
    }
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (!viweAcess) {
      navigate("/")
    }
  }

  useEffect(() => {
   // //checkAcess()
    getData()
  }, [])

  const handleEditClick = (id) => {
    // if (editR) {
      //console.log(id)
      navigate(`/ChartofAccountsEdit/${id}`)
    // } else {
    //   toast.error("Access Denied")
    // }
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteR) {
      toast.error("Access Denied")
      return
    }
    else {
      setOpenDeleteDialog(false);
      setRows(rows.filter((row) => row._id !== selectedId));
      deleteDataFunction(`/ChartofAccounts/deletChartofAccounts/${selectedId}`)
    }

  };
  const exportToExcel = () => {
    if (!rows || rows.length === 0) return;

    const excelData = rows.map((row) => ({
      'Account Code': row.AccountCode,
      'Accounts Name': row.AccountName,
      Stage: row.Stage,
      'Stage 1': row.Stage1 || '',
      'Stage 2': row.Stage2 || '',
      'Stage 3': row.Stage3 || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart of Accounts');

    const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...excelData.map((row) => String(row[key] || '').length)) + 2,
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `ChartofAccounts_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const columns = [
    { field: 'AccountCode', headerName: 'Account Code', width: 250, },
    { field: 'AccountName', headerName: 'Accounts Name', width: 450, },
    { field: 'Stage', headerName: 'Stage', width: 200 },
    { field: 'Stage1', headerName: 'Stage 1', width: 200 },
    { field: 'Stage2', headerName: 'Stage 2', width: 200 },
    { field: 'Stage3', headerName: 'Stage 3', width: 200 },

    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 130,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditClick(id)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteClick(id)}
          color="error"
        />,
      ],
    },
  ];

  return (

    <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Chart of Accounts</h2>
        <Button
          variant="contained"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={exportToExcel}
          disabled={!rows || rows.length === 0}
        >
          Download Excel
        </Button>
      </div>
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        getRowId={(row) => row._id}
        rowsPerPageOptions={[5]}
        experimentalFeatures={{ newEditingApi: true }}
      />

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </div></div>
  )
}

export default ChartofAccountsList