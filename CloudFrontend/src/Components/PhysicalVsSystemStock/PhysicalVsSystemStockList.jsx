import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import { toast, ToastContainer } from "react-toastify";
import { deleteDataFunction, getDataFundtion } from "../../Api/CRUDFunctions";
import { useSelector } from "react-redux";
import { useLoader } from "../../hooks/useLoader.jsx";

const PhysicalVsSystemStockList = () => {
  const { showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();
  const UserRihts = useSelector((state) => state.UsersRights.UserRights) || [];
  const canAdd = UserRihts.includes("Add Physical Stock vs System Stock");
  const canEdit = UserRihts.includes("Edit Physical Stock vs System Stock");
  const canDelete = UserRihts.includes("Delete Physical Stock vs System Stock");
  const canView = UserRihts.includes("View Physical Stock vs System Stock");

  const [rows, setRows] = useState([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();

  const getData = async () => {
    showLoader("Loading Physical vs System Stock...");
    try {
      updateProgress(50);
      const response = await getDataFundtion("/PhysicalVsSystemStock");
      updateProgress(100);
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load list");
    } finally {
      hideLoader();
    }
  };

  useEffect(() => {
    getData();
  }, []);

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    try {
      await deleteDataFunction(`/PhysicalVsSystemStock/Delete/${selectedId}`);
      setRows((prev) => prev.filter((row) => row._id !== selectedId));
      toast.success("Deleted successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const columns = [
    { field: "DocumentNumber", headerName: "Doc #", width: 110 },
    { field: "DocumentDate", headerName: "Date", width: 120 },
    {
      field: "StoreCount",
      headerName: "Stores",
      width: 90,
      valueGetter: (_v, row) => (Array.isArray(row.Store) ? row.Store.length : 0),
    },
    {
      field: "Lines",
      headerName: "Lines",
      width: 90,
      valueGetter: (_v, row) => (Array.isArray(row.StockData) ? row.StockData.length : 0),
    },
    {
      field: "Images",
      headerName: "Images",
      width: 90,
      valueGetter: (_v, row) => (Array.isArray(row.Images) ? row.Images.length : 0),
    },
    { field: "CreatedBy", headerName: "Created By", width: 160 },
    { field: "Remarks", headerName: "Remarks", flex: 1, minWidth: 160 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 140,
      getActions: ({ id }) => {
        const actions = [];
        if (canView) {
          actions.push(
            <GridActionsCellItem
              key="view"
              icon={<VisibilityIcon />}
              label="View / Print"
              onClick={() => navigate(`/PhysicalVsSystemStockView/${id}`)}
              showInMenu={false}
            />
          );
        }
        if (canEdit) {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditIcon />}
              label="Edit"
              onClick={() => navigate(`/PhysicalVsSystemStockEdit/${id}`)}
            />
          );
        }
        if (canDelete) {
          actions.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteIcon />}
              label="Delete"
              onClick={() => {
                setSelectedId(id);
                setOpenDeleteDialog(true);
              }}
            />
          );
        }
        if (!actions.length) {
          actions.push(
            <GridActionsCellItem
              key="view-fallback"
              icon={<VisibilityIcon />}
              label="View"
              onClick={() => navigate(`/PhysicalVsSystemStockView/${id}`)}
            />
          );
        }
        return actions;
      },
    },
  ];

  return (
    <div className="pd-page">
      <ToastContainer />
      {LoaderComponent}
      <div className="pd-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Physical Stock vs System Stock</h2>
          {canAdd && (
            <Button variant="contained" onClick={() => navigate("/PhysicalVsSystemStockAdd")}>
              Add New
            </Button>
          )}
        </div>
        <div style={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row._id}
            pageSizeOptions={[25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            disableRowSelectionOnClick
          />
        </div>
      </div>

      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete this document?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PhysicalVsSystemStockList;
