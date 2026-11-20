import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const FixedAssetList = () => {
  const [rows, setRows] = useState([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();

  const getData = async () => {
    try {
      const data = await getDataFundtion('/FixedAsset');
      setRows(data.data || []);
    } catch (err) {
      console.error('Error fetching fixed assets:', err);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleEditClick = (id) => {
    navigate(`/FixedAssetEdit/${id}`);
  };

  const handleViewClick = (id) => {
    navigate(`/FixedAssetView/${id}`);
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    try {
      await deleteDataFunction(`/FixedAsset/${selectedId}`);
      setRows(rows.filter((row) => row._id !== selectedId));
      toast.success('Fixed Asset deleted');
    } catch (err) {
      toast.error('Error deleting fixed asset');
    }
  };

  const columns = [
    { field: 'AssetCode', headerName: 'Code', width: 120 },
    { field: 'AssetName', headerName: 'Asset Name', width: 250 },
    { field: 'AssetCategory', headerName: 'Category', width: 150 },
    { field: 'Department', headerName: 'Department', width: 150 },
    {
      field: 'PurchaseCost',
      headerName: 'Purchase Cost',
      width: 150,
      renderCell: (params) =>
        Number(params.value || 0).toLocaleString(),
    },
    {
      field: 'PurchaseDate',
      headerName: 'Purchase Date',
      width: 130,
      renderCell: (params) => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      },
    },
    { field: 'DepreciationRate', headerName: 'Dep %', width: 100 },
    { field: 'DepreciationMethod', headerName: 'Dep Method', width: 150 },
    {
      field: 'BookValue',
      headerName: 'Book Value',
      width: 150,
      renderCell: (params) =>
        Number(params.value || 0).toLocaleString(),
    },
    {
      field: 'Status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            params.value === 'Active'
              ? 'bg-green-100 text-green-700'
              : params.value === 'Disposed'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {params.value}
        </span>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 150,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => handleViewClick(id)}
        />,
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
    <div className="pd-page">
      <div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
        <ToastContainer />
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          getRowId={(row) => row._id}
          rowsPerPageOptions={[5, 10, 25]}
          experimentalFeatures={{ newEditingApi: true }}
        />

        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Confirm Delete this Fixed Asset?</DialogTitle>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default FixedAssetList;
