import React, { useEffect, useState } from 'react';
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
import * as XLSX from 'xlsx'; // Add this import

import VisibilityIcon from '@mui/icons-material/Visibility';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchChannel } from '../../../Redux/Reducers/ChannelReducer';
import { fetchTransport } from '../../../Redux/Reducers/TransportReducer';
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer';
import { fetchDistributorOrderBooker } from '../../../Redux/Reducers/DistributorOrderBookerReducer';

const DistrbutorList = () => {
    const [rows, setRows] = useState([]);
    const [deleteR, setdeleteR] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const dispatch = useDispatch()
    const [selectedId, setSelectedId] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [allRows, setAllRows] = useState([]);
    const navigate = useNavigate()

    const getData = async () => {
        try {
            const data = await getDataFundtion("/Distrbutor?main=true")
            console.log(data, 'data');
            
            const Channel = await getDataFundtion("/Channel")
            const Transport = await getDataFundtion("/Transport")
            const City = await getDataFundtion("/City")
            const PriceList = await getDataFundtion("/PriceList")
            const OrderBooker = await getDataFundtion("/DitriButorOrderBooker")
            const RegionRes = await getDataFundtion("/Region")
            const ZoneRes = await getDataFundtion("/Zone")
            const ZsmRes = await getDataFundtion("/Zsm")
            dispatch(fetchDistributorOrderBooker(OrderBooker.data))
            const transporters = Transport?.data || []
            const asId = (val) => {
                if (val == null || val === "") return ""
                if (typeof val === "object") return String(val._id || "")
                return String(val)
            }
            const toMap = (res) => new Map(
                (Array.isArray(res) ? res : (res?.data || [])).map((row) => [asId(row._id), row])
            )
            const cityById = toMap(City)
            const regionById = toMap(RegionRes)
            const zoneById = toMap(ZoneRes)
            const zsmById = toMap(ZsmRes)
            const orderBookerById = toMap(OrderBooker)
            const rawList = Array.isArray(data) ? data : (data?.data || [])
            const seenIds = new Set()
            const uniqueList = rawList.filter((item) => {
                const id = String(item?._id || '')
                if (!id) return true
                if (seenIds.has(id)) return false
                seenIds.add(id)
                return true
            })
            const alldata = uniqueList.map((item) => {
  const orderBooker = orderBookerById.get(asId(item.OrderBooker))
  const priceList = (Array.isArray(PriceList) ? PriceList : PriceList?.data || []).find(
    (pl) => pl._id?.toString() === item.PriceList?.toString()
  )
  const transporter = transporters.find(
    (t) => t._id?.toString() === item.Transporter?.toString()
  )
  // Same chain as Sales Dump Data: Order Booker -> ZSM -> Zone, then Zone's Region.
  const city = cityById.get(asId(item.City))
  const zsm = zsmById.get(asId(orderBooker?.ZSM))
  const regionFromBooker = regionById.get(asId(orderBooker?.Region))
  const zone =
    zoneById.get(asId(zsm?.Zone || orderBooker?.Zone || item.Zone)) ||
    zoneById.get(asId(regionFromBooker?.Zone))
  const region =
    regionById.get(asId(zone?.Region)) ||
    regionById.get(asId(city?.Region)) ||
    regionFromBooker

  return {
    ...item,
    City: city?.CityName || "N/A",
    ZoneName: zone?.ZoneName || "N/A",
    RegionName: region?.RegionName || "N/A",
    OrderBookerName: orderBooker?.OrderBookerName || "N/A",
    PriceListName: priceList?.PriceListName || "N/A",
    TransporterName: transporter?.TransporterName || "N/A",
  }
})
            dispatch(fetchPricelistReducer(PriceList))
            dispatch(fetchTransport(Transport.data))
            dispatch(fetchCity(City.data))
            dispatch(fetchChannel(Channel.data))
            setAllRows(alldata)
            setRows(alldata)
            dispatch(fetchDistributroReducers(uniqueList))
            setIsLoading(false)

        }
        catch (err) {
            toast.error("Something went wrong")
        }
        finally {
            setIsLoading(false);
        }
    }

    // Excel columns match DistrbutorAdd form fields (all three tabs), in form order.
    const excelColumns = [
        ['DistrbutorSystemCode', 'Distributor Code'],
        ['DistrbutorName', 'Customer Name'],
        ['OwnerName', 'Owner Name'],
        ['OwnerCnic', 'Owner Cnic'],
        ['Type', 'Type'],
        ['PriceListName', 'Price List'],
        ['OrderBookerName', 'Order Booker'],
        ['ContactPerson1', 'Contact Person 1'],
        ['ContactPerson2', 'Contact Person 2'],
        ['ContactPerson3', 'Contact Person 3'],
        ['Designation', 'Designation'],
        ['Address1', 'Address1'],
        ['Address2', 'Address2'],
        ['Address3', 'Address3'],
        ['CNICNo', 'CNIC No'],
        ['Country', 'Country'],
        ['Province', 'Province'],
        ['City', 'City'],
        ['ZoneName', 'Zone'],
        ['RegionName', 'Region'],
        ['MobilePhoneNo', 'Mobile Phone No'],
        ['TransportType', 'TRP Type'],
        ['TransporterName', 'Select Transporter'],
        ['MobileNo', 'Mobile No.1'],
        ['MobileNo2', 'Mobile No.2'],
        ['CountryCode', 'CountryCode'],
        ['PostalCode', 'Postal Code'],
        ['Fax', 'Fax'],
        ['PrimaryEmail', 'PrimaryEmail'],
        ['SecondaryEmail', 'SecondaryEmail'],
        ['WebSite', 'WebSite'],
        ['LoginID', 'Login Id'],
        ['Password', 'Password'],
        ['ShopRegisterDate', 'Shop Register Date'],
        ['NTN', 'NTN'],
        ['STN', 'STN'],
        ['NTNStatus', 'NTN Active'],
        ['STNStatus', 'STN Active'],
        ['CompanyType', 'Company Type'],
        ['CreditDays', 'Credit Days'],
        ['checkCredit', 'checkCredit'],
        ['CreditLimit', 'Credit Limit'],
        ['BankName', 'BankName'],
        ['BranchName', 'BranchName'],
        ['BranchCode', 'BranchCode'],
        ['BusinessAccountNumber', 'BusinessAccountNumber'],
        ['BranchAddress', 'Branch Address'],
        ['BranchTelNo', 'BranchTel.No'],
        ['BranchCity', 'Branch City'],
        ['IBAN', 'IBAN'],
    ];

    const excelCellValue = (row, field) => {
        if (field === 'Type') {
            if (row.Type === 'Cust') return 'Customer';
            if (row.Type === 'Distr') return 'Distributor';
            return row.Type ?? '';
        }
        if (field === 'Password') {
            return row.Password ?? row.Password1 ?? '';
        }
        if (field === 'BranchTelNo') {
            return row.BranchTelNo ?? row.BranchTel ?? row.TelNo ?? '';
        }
        if (field === 'ShopRegisterDate') {
            const value = row.ShopRegisterDate;
            if (!value) return '';
            const text = String(value);
            return text.includes('T') ? text.split('T')[0] : text;
        }
        if (field === 'checkCredit') {
            const value = row.checkCredit;
            if (value == null || value === '') return '';
            return value === true || value === 'true' || value === 1 || value === '1';
        }
        const value = row[field];
        if (value == null || typeof value === 'object') return '';
        return value;
    };

    const handleDownloadExcel = () => {
        try {
            // Use allRows so the download always contains the complete dataset (not search-filtered)
            const source = allRows.length > 0 ? allRows : rows;

            // Prepare full data for Excel
            const excelData = source.map((row) => {
                const obj = {};
                excelColumns.forEach(([field, label]) => {
                    obj[label] = excelCellValue(row, field);
                });
                return obj;
            });

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(excelData);

            // Auto-size columns based on content
            const colWidths = excelColumns.map(([field, label]) => {
                const maxLen = Math.max(
                    label.length,
                    ...source.map((r) => String(excelCellValue(r, field) ?? '').length)
                );
                return { wch: Math.min(Math.max(maxLen + 2, 12), 45) };
            });
            ws['!cols'] = colWidths;

            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Distributors');

            // Generate Excel file and download
            const fileName = `Distributors_${new Date().toLocaleDateString()}.xlsx`;
            XLSX.writeFile(wb, fileName);

            toast.success('Excel downloaded successfully!');
        } catch (error) {
            console.error('Error downloading Excel:', error);
            toast.error('Failed to download Excel');
        }
    };

    const handleViewClick = (id) => {
        navigate(`/DistrbutorView/${id}`)
    }

    useEffect(() => {
        getData()
    }, [])

    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };

    const handleEditClick = (id) => {
        navigate(`/DistrbutorEdit/${id}`)
    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);
        setRows(rows.filter((row) => row._id !== selectedId));
        let getCatByVendor = await deleteDataFunction(`/Distrbutor/deleteDistrbutor/${selectedId}`)
    };

    const columns = [
        {
            field: 'DistrbutorSystemCode', headerName: 'code', width: 250,
        },
        {
            field: 'DistrbutorName', headerName: 'DistrbutorName', width: 250,
        },
        {
            field: 'City', headerName: 'City', width: 200,
        },
        {
            field: 'ZoneName', headerName: 'Zone', width: 180,
        },
        {
            field: 'RegionName', headerName: 'Region', width: 180,
        },
        {
            field: 'OrderBookerName', headerName: 'OrderBookerName', width: 200,
        },
        {
            field: 'NTN', headerName: 'DistrbutorNTN', width: 200,
        },
        {
            field: 'STN', headerName: 'DistrbutorAddress    ', width: 200,
        },
        {
            field: 'MobilePhoneNo', headerName: 'MobilePhoneNo', width: 200,
        },
        {
            field: 'PrimaryEmail', headerName: 'PrimaryEmail', width: 200,
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 130,
            getActions: ({ id }) => [
                <GridActionsCellItem
                    icon={<VisibilityIcon />}
                    label="Edit"
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

    const handleSearch = (value) => {
        setSearchText(value);

        if (!value) {
            setRows(allRows);
            return;
        }

        const searchValue = value.toLowerCase();

        const filtered = allRows.filter((row) =>
            Object.values(row).some((field) =>
                String(field).toLowerCase().includes(searchValue)
            )
        );

        setRows(filtered);
    };

    return (
        <div className="pd-page">
            <div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
                <ToastContainer />
                
                {/* Search and Download section */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 10,
                    gap: '10px',
                    flexWrap: 'wrap'
                }}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchText}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{
                            padding: 8,
                            width: 300,
                            borderRadius: 5,
                            border: "1px solid #ccc",
                            flex: '1'
                        }}
                    />
                    
                    {/* Excel Download Button */}
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleDownloadExcel}
                        style={{
                            backgroundColor: '#1e7e34',
                            color: 'white',
                            padding: '8px 20px',
                            textTransform: 'none',
                            fontWeight: 'bold'
                        }}
                        startIcon={<span>📊</span>}
                    >
                        Download Excel
                    </Button>
                </div>

                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={5}
                    loading={isLoading}
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
            </div>
        </div>
    );
}

export default DistrbutorList