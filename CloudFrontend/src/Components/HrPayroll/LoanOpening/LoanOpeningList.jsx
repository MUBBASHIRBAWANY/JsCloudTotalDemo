import React, { useEffect, useState } from "react";
import { DataGrid, GridActionsCellItem } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { deleteDataFunction, getDataFundtion } from "../../../Api/CRUDFunctions";

const LoanOpeningList = () => {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const getData = async () => {
    const data = await getDataFundtion("/LoanOpeningBalance");
    setRows(data.data || []);
  };

  useEffect(() => {
    getData();
  }, []);

  const handleEditClick = (id) => {
    const check = rows.find((item) => item._id === id)?.Status;
    if (check === "false") {
      navigate(`/LoanOpeningEdit/${id}`);
    } else {
      toast.error("First unpost");
    }
  };

  const handleDeleteClick = (id) => {
    const check = rows.find((item) => item._id === id)?.Status;
    if (check === "false") {
      setSelectedId(id);
      setOpenDeleteDialog(true);
    } else {
      toast.error("First unpost");
    }
  };

  const handleViewClick = (id) => {
    navigate(`/LoanOpeningView/${id}`);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    setRows(rows.filter((row) => row._id !== selectedId));
    await deleteDataFunction(`/LoanOpeningBalance/deleteLoanOpening/${selectedId}`);
    toast.success("Deleted");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .replace(",", "");
  };

  const columns = [
    {
      field: "DateStart",
      headerName: "Date Start",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: "DateEnd",
      headerName: "Date End",
      width: 150,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: "EmployeesData",
      headerName: "Total Employees",
      width: 150,
      renderCell: (params) => {
        const data = params.value;
        if (Array.isArray(data)) return data.length;
        if (data && typeof data === "object") return Object.keys(data).length;
        return 0;
      },
    },
    {
      field: "Status",
      headerName: "Status",
      width: 150,
      renderCell: (params) =>
        params.value === "Open"
          ? "Open"
          : params.value === "UnPost"
          ? "UnPost"
          : params.value === "Close"
          ? "Close"
          : "False",
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 150,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => handleViewClick(id)}
          color="info"
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
    <div>
      <ToastContainer />
      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row._id}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableRowSelectionOnClick
        />
      </div>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Loan Opening?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>
            Cancel
          </button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>
            Delete
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LoanOpeningList;
