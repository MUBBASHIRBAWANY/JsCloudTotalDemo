import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import { ToastContainer, toast } from "react-toastify";
import { getDataFundtion, deleteDataFunction } from "../../../Api/CRUDFunctions.jsx";
import { fetchSlabReducer } from "../../../Redux/Reducers/SlabReducer.js";
import { fetchPricelistReducer } from "../../../Redux/Reducers/PricelistReducer.js";

const SlabList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const SlabData = useSelector((state) => state.SlabReducer.SlabReducer);
  const [rows, setRows] = useState(SlabData || []);
  const [loading, setLoading] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const getData = async () => {
    setLoading(true);
    try {
      const res = await getDataFundtion("/Slab");
      const Price = await getDataFundtion("/PriceList");
      dispatch(fetchPricelistReducer(Price))
      const data = Array.isArray(res) ? res : res.data || [];
      dispatch(fetchSlabReducer(data));
      setRows(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load slabs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (SlabData && SlabData.length > 0) {
      setRows(SlabData);
    }
    getData();
  }, []);

  const handleView = (id) => {
    navigate(`/SlabView/${id}`);
  };

  const handleEdit = (id) => {
    navigate(`/SlabEdit/${id}`);
  };

  const handleDelete = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    try {
      await deleteDataFunction(`/Slab/${selectedId}`);
      const updated = rows.filter((row) => row._id !== selectedId);
      setRows(updated);
      dispatch(fetchSlabReducer(updated));
      toast.success("Slab deleted successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const columns = [
    {
      field: "priceList",
      headerName: "Price List",
      width: 220,
      renderCell: (params) =>
        params.value?.PriceListName
          ? `${params.value.PriceListName} (${params.value.PriceListNumber || ""})`
          : "-",
    },
    {
      field: "fromAmount",
      headerName: "From Amount",
      width: 140,
      renderCell: (params) => Number(params.value || 0).toLocaleString(),
    },
    {
      field: "toAmount",
      headerName: "To Amount",
      width: 140,
      renderCell: (params) => Number(params.value || 0).toLocaleString(),
    },
    {
      field: "maxPercentage",
      headerName: "Max %",
      width: 110,
      renderCell: (params) => `${params.value || 0}%`,
    },
    {
      field: "slabRows",
      headerName: "Rows",
      width: 80,
      renderCell: (params) => params.value?.length || 0,
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 130,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 130,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => handleView(id)}
          color="info"
        />,
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(id)}
          color="primary"
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(id)}
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
          getRowId={(row) => row._id}
          pageSize={10}
          rowsPerPageOptions={[10, 25, 50]}
          loading={loading}
          disableSelectionOnClick
          experimentalFeatures={{ newEditingApi: true }}
        />

        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Confirm Delete?</DialogTitle>
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

export default SlabList;
