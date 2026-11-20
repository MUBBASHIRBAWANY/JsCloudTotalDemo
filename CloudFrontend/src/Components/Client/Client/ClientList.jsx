import React, { useEffect, useRef, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import axios, { all } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchVendor } from '../../../Redux/Reducers/VendorReducer';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';
import { fetchChannel } from '../../../Redux/Reducers/ChannelReducer';
import { fetchTown } from '../../../Redux/Reducers/TownReducer';
import { fetchTerrotory } from '../../../Redux/Reducers/TerrotoryReducer';
import { fetchsubChannel } from '../../../Redux/Reducers/SubChannelReducer';
import { fetchLocality } from '../../../Redux/Reducers/LocalityReducer';
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer';

const lookupName = (list, id, nameKey) => {
  if (!id) return '';
  if (typeof id === 'object') {
    return id[nameKey] || lookupName(list, id._id, nameKey);
  }
  const match = (list || []).find((item) => String(item._id) === String(id));
  return match?.[nameKey] || '';
};

const formatExcelDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const ClientList = ({ excelRef }) => {
  const [rows, setRows] = useState();
  const [allClients, setAllClients] = useState([]);
  const [lookups, setLookups] = useState({
    vendor: [],
    town: [],
    locality: [],
    territory: [],
    channelType: [],
    channel: [],
    subChannel: [],
    priceList: [],
  });
  const [deleteR, setdeleteR] = useState(false)
  const excelBusyRef = useRef(false)
  const dispatch = useDispatch()
  const [selectedId, setSelectedId] = useState(null);
  const [CsVendor, setCsVendor] = useState("")
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const navigate = useNavigate()
  const getData = async () => {
    const data = await getDataFundtion("/customer")
    const Vendor = await getDataFundtion('/Vendor')
    const Town = await getDataFundtion('/Town')
    const Locality = await getDataFundtion('/Locality')
    const Terrotory = await getDataFundtion('/Terrotory')
    const ChenalType = await getDataFundtion('/chanelType')
    const Channel = await getDataFundtion('/Channel')
    const SubChannel = await getDataFundtion('/SubChannel')
    const PriceList = await getDataFundtion('/PriceList')
    //console.log(data)
    const list = data.data || []
    const townList = Town.data || []
    setCsVendor(Vendor.data)
    setAllClients(list)
    setLookups({
      vendor: Vendor.data || [],
      town: townList,
      locality: Locality.data || [],
      territory: Terrotory.data || [],
      channelType: ChenalType.data || [],
      channel: Channel.data || [],
      subChannel: SubChannel.data || [],
      priceList: PriceList.data || [],
    })
    const values = list.map((item, index)=> ({
      id : item._id,
      mastercode : item.mastercode,
      code : item.code,
      CutomerName : item.CutomerName,   
      Address:   item.Address,
      NTN : item.NTN,
      STN : item.STN,
      Vendor : item.Vendor?.length || 0,
      SalesFlowRef : item.SalesFlowRef,
      Town : townList.find((item1)=> item1._id == item.Town)?.TownName
    }))
    setRows(values)
    dispatch(fetchClient(list))
    dispatch(fetchVendor(Vendor.data))
    dispatch(fetchChannel(ChenalType.data))
    dispatch(fetchTown(Town.data))
    dispatch(fetchTerrotory(Terrotory.data))
    dispatch(fetchChannel(Channel.data))
    dispatch(fetchLocality(Locality.data))
    dispatch((fetchsubChannel(SubChannel.data)))
    dispatch(fetchPricelistReducer(PriceList.data))
  }

  const DeleteRight = "CustomerDelete"
  const pageName = "CustomerList"
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == DeleteRight)
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
    //console.log(id)
    navigate(`/ClientUpdate/${id}`)
  };

  const handleDeleteClick = (id) => {

    setSelectedId(id);
     setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    if (deleteR) {
      setRows(rows.filter((row) => row._id !== selectedId));
      const res = deleteDataFunction(`customer/deletCustomer/${selectedId}`)
      //console.log(res)
    } else {
      toast.error("Access Denied")
    }
  };

  const handleDownloadExcel = async () => {
    if (excelBusyRef.current) return;
    if (!allClients || allClients.length === 0) {
      toast.warning("No customers to download");
      return;
    }

    try {
      excelBusyRef.current = true;

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Pearl Dynamic (pvt) ltd";
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet("Customer List", {
        views: [{ state: "frozen", ySplit: 4 }],
      });

      const generatedOn = new Date().toLocaleString("en-GB");

      const headers = [
        "Sr No",
        "Customer Code",
        "Master Code",
        "Customer Name",
        "Sales Flow Ref",
        "Address",
        "Phone",
        "Email",
        "NTN",
        "STN",
        "Fax",
        "Website",
        "Shop Owner",
        "Owner CNIC",
        "Shop Register Date",
        "Town",
        "Territory",
        "Locality",
        "Channel Type",
        "Channel",
        "Sub Channel",
        "Business",
        "Price List",
        "Advance Tax",
        "Filer",
        "Registered",
        "Status",
        "TTS",
        "Trade Activity",
        "VDS",
        "Trade Offer",
        "JBP",
      ];
      const colCount = headers.length;

      const titleRow = worksheet.addRow(["Pearl Dynamic (pvt) ltd"]);
      worksheet.mergeCells(1, 1, 1, colCount);
      titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: "FF185FA5" } };
      titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      worksheet.getRow(1).height = 28;

      const subtitleRow = worksheet.addRow(["Customer List"]);
      worksheet.mergeCells(2, 1, 2, colCount);
      subtitleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF111827" } };
      subtitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

      const metaRow = worksheet.addRow([
        `Generated: ${generatedOn}    |    Total Customers: ${allClients.length}`,
      ]);
      worksheet.mergeCells(3, 1, 3, colCount);
      metaRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
      metaRow.getCell(1).alignment = { horizontal: "center" };

      worksheet.addRow([]);

      const headerRow = worksheet.addRow(headers);
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF185FA5" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FF185FA5" } },
          left: { style: "thin", color: { argb: "FF185FA5" } },
          bottom: { style: "thin", color: { argb: "FF185FA5" } },
          right: { style: "thin", color: { argb: "FF185FA5" } },
        };
      });

      const statusLabel = (value) => {
        if (value === "1" || value === 1) return "Active";
        if (value === "2" || value === 2) return "Inactive";
        return value || "";
      };
      const yesNoLabel = (value) => {
        if (value === "1" || value === 1) return "Yes";
        if (value === "2" || value === 2) return "No";
        return value || "";
      };
      const filerLabel = (value) => {
        if (value === "1" || value === 1) return "Filer";
        if (value === "2" || value === 2) return "Non-Filer";
        return value || "";
      };
      const registeredLabel = (value) => {
        if (value === "1" || value === 1) return "Registered";
        if (value === "2" || value === 2) return "Unregistered";
        return value || "";
      };

      allClients.forEach((item, index) => {
        const vendorNames = (item.Vendor || [])
          .map((vendorId) => {
            if (vendorId && typeof vendorId === "object") {
              return vendorId.VendorName || lookupName(lookups.vendor, vendorId._id, "VendorName");
            }
            return lookupName(lookups.vendor, vendorId, "VendorName");
          })
          .filter(Boolean)
          .join(", ");

        const dataRow = worksheet.addRow([
          index + 1,
          item.code || "",
          item.mastercode || "",
          item.CutomerName || "",
          item.SalesFlowRef || "",
          item.Address || "",
          item.phone || "",
          item.email || "",
          item.NTN || "",
          item.STN || "",
          item.Fax || "",
          item.WebSite || "",
          item.ShopOwner || "",
          item.OwnerCnic || "",
          formatExcelDate(item.ShopRegisterDate),
          lookupName(lookups.town, item.Town, "TownName"),
          lookupName(lookups.territory, item.Terrotory, "TerrotoryName"),
          lookupName(lookups.locality, item.Locality, "LocalityName"),
          lookupName(lookups.channelType, item.ChannelType, "ChanneTypeName"),
          lookupName(lookups.channel, item.Chanel || item.Channel, "ChanneName"),
          lookupName(lookups.subChannel, item.SubChannel, "SubChanneName"),
          vendorNames,
          lookupName(lookups.priceList, item.PriceList, "PriceListName"),
          yesNoLabel(item.AdvanceTaxApply),
          filerLabel(item.Filler),
          registeredLabel(item.Registered),
          statusLabel(item.Status),
          item.TTS || "",
          item.TradeActivity || "",
          item.VDS || "",
          item.Tradeoffer || "",
          item.JBP || "",
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.font = { size: 10 };
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber === 1 ? "center" : "left",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
          if (index % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
        });
      });

      worksheet.columns = [
        { width: 8 },
        { width: 16 },
        { width: 14 },
        { width: 32 },
        { width: 16 },
        { width: 36 },
        { width: 16 },
        { width: 26 },
        { width: 16 },
        { width: 16 },
        { width: 14 },
        { width: 22 },
        { width: 22 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 16 },
        { width: 16 },
        { width: 16 },
        { width: 28 },
        { width: 20 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 12 },
        { width: 10 },
        { width: 16 },
        { width: 10 },
        { width: 14 },
        { width: 10 },
      ];

      worksheet.autoFilter = {
        from: { row: headerRow.number, column: 1 },
        to: { row: headerRow.number + allClients.length, column: headers.length },
      };

      worksheet.pageSetup = {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
      };
      worksheet.headerFooter.oddFooter = "&LPearl Dynamic (pvt) ltd&CPage &P of &N&RConfidential";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileDate = new Date().toISOString().slice(0, 10);
      saveAs(blob, `Customer_List_${fileDate}.xlsx`);
      toast.success("Excel downloaded successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download Excel");
    } finally {
      excelBusyRef.current = false;
    }
  };

  useEffect(() => {
    if (!excelRef) return
    excelRef.current = handleDownloadExcel
  }, [excelRef, allClients, lookups]);

  const columns = [
    { field: 'code', headerName: 'Customer code', width: 150, },
    { field: 'CutomerName', headerName: 'Customer Name', width: 250, },
    { field: 'Address', headerName: 'Address', width: 150, },
    { field: 'NTN', headerName: 'NTN', width: 150, },
    { field: 'STN', headerName: 'STN', width: 150, },
    {field: 'Vendor', headerName: 'Vendor'},
    {field: 'Town', headerName: 'Town', width: 200},
    {field: 'SalesFlowRef', headerName: 'SalesFlowRef', width: 200},



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
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        getRowId={(row) => row.id}
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
  );
}

export default ClientList