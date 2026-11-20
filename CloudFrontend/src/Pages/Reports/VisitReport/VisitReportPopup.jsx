import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const GEOAPIFY_KEY = 'feda607873fc40dda7f95570efd7a492';

const formatMoney = (amount) =>
  Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const activityClass = (activity) =>
  `badge badge-${String(activity || 'other').toLowerCase().replace(/\s|\+/g, '-')}`;

const optimizeImageUrl = (url) => {
  const src = String(url || '').trim();
  if (!src) return '';
  if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
    return src.replace('/upload/', '/upload/w_480,c_limit,q_auto,f_jpg/');
  }
  return src;
};

const loadImageAsDataUrl = (url) =>
  new Promise((resolve) => {
    const src = optimizeImageUrl(url);
    if (!src) {
      resolve(null);
      return;
    }

    const finish = (dataUrl, format = 'JPEG') => resolve(dataUrl ? { dataUrl, format } : null);

    fetch(src, { mode: 'cors' })
      .then((res) => {
        if (!res.ok) throw new Error('Image fetch failed');
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolveReader, rejectReader) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result;
              const format = String(blob.type || '').includes('png') ? 'PNG' : 'JPEG';
              resolveReader({ dataUrl, format });
            };
            reader.onerror = rejectReader;
            reader.readAsDataURL(blob);
          })
      )
      .then((result) => finish(result?.dataUrl, result?.format))
      .catch(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const max = 480;
            const scale = Math.min(1, max / Math.max(img.width, img.height || 1));
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            finish(canvas.toDataURL('image/jpeg', 0.82), 'JPEG');
          } catch (err) {
            console.error('Canvas image convert failed:', err);
            finish(null);
          }
        };
        img.onerror = () => finish(null);
        img.src = src;
      });
  });

const VisitReportPopup = ({ data }) => {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    visits: 0,
    orders: 0,
    phoneOrders: 0,
    totalRecords: 0,
    imagesCount: 0,
    pendingAddress: 0,
  });
  const [bookerName, setBookerName] = useState(data?.selectedOrderBooker?.label || '');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [extractProgress, setExtractProgress] = useState({ current: 0, total: 0, status: '' });
  const [previewImage, setPreviewImage] = useState(null);
  const [activityFilter, setActivityFilter] = useState('All');

  const periodLabel = `${data?.startDate || ''} to ${data?.endDate || ''}`;
  const generatedAt = useMemo(() => new Date().toLocaleString(), []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const orderBookerId = data?.selectedOrderBooker?.value || '';
      const response = await getDataFundtion(
        `/DistributorSaleOrder/visitReport?OrderBooker=${encodeURIComponent(orderBookerId)}&startDate=${encodeURIComponent(data.startDate)}&endDate=${encodeURIComponent(data.endDate)}`
      );
      const list = Array.isArray(response?.data) ? response.data : [];
      setRows(list);
      setSummary(response?.summary || {
        visits: 0,
        orders: 0,
        phoneOrders: 0,
        totalRecords: list.length,
        imagesCount: 0,
        pendingAddress: 0,
      });
      setBookerName(response?.orderBooker?.name || data?.selectedOrderBooker?.label || '');
    } catch (err) {
      console.error(err);
      toast.error('Failed to load visit report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [data]);

  const filteredRows = useMemo(() => {
    if (activityFilter === 'All') return rows;
    if (activityFilter === 'Visit') return rows.filter((row) => row.Visit);
    if (activityFilter === 'Order') return rows.filter((row) => row.hasOrder);
    if (activityFilter === 'Phone Order') return rows.filter((row) => row.orderThroughPhone);
    return rows.filter((row) => row.activity === activityFilter);
  }, [rows, activityFilter]);

  const pendingAddressRows = useMemo(
    () => rows.filter((row) => !row.Address && row.latitude && row.longitude),
    [rows]
  );

  const extractAddresses = async () => {
    if (extracting) return;
    const pending = rows.filter((row) => !row.Address && row.latitude && row.longitude);
    if (!pending.length) {
      toast.info('All addresses are already extracted');
      return;
    }

    setExtracting(true);
    setExtractProgress({ current: 0, total: pending.length, status: 'Starting address extraction...' });

    let successCount = 0;
    let failCount = 0;
    const nextRows = [...rows];

    try {
      for (let i = 0; i < pending.length; i += 1) {
        const item = pending[i];
        setExtractProgress({
          current: i + 1,
          total: pending.length,
          status: `Processing ${i + 1} of ${pending.length}: ${item.DistrbutorName || item.OrderCode || 'record'}...`,
        });

        try {
          const placesResponse = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${item.latitude}&lon=${item.longitude}&format=json&apiKey=${GEOAPIFY_KEY}`
          );
          const addressResult = await placesResponse.json();
          const formattedAddress = addressResult?.results?.[0]?.formatted;
          if (!formattedAddress) throw new Error('No address found');

          await updateDataFunction(`/DistributorSaleOrder/updateVisitAddress/${item._id}`, {
            Address: formattedAddress,
            AddressExtracted: 'Ok',
          });

          const rowIndex = nextRows.findIndex((row) => String(row._id) === String(item._id));
          if (rowIndex >= 0) {
            nextRows[rowIndex] = {
              ...nextRows[rowIndex],
              Address: formattedAddress,
              AddressExtracted: 'Ok',
            };
          }
          successCount += 1;
          setExtractProgress((prev) => ({
            ...prev,
            status: `Completed: ${formattedAddress.substring(0, 60)}...`,
          }));
        } catch (err) {
          console.error(`Address extract failed for ${item._id}:`, err);
          failCount += 1;
          setExtractProgress((prev) => ({
            ...prev,
            status: `Failed: ${item.DistrbutorName || item.OrderCode || item._id}`,
          }));
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setRows(nextRows);
      setSummary((prev) => ({
        ...prev,
        pendingAddress: nextRows.filter((row) => !row.Address && row.latitude && row.longitude).length,
      }));
      setExtractProgress({
        current: pending.length,
        total: pending.length,
        status: `Done. Success: ${successCount}, Failed: ${failCount}`,
      });
      toast.success(`Addresses extracted: ${successCount}`);
    } finally {
      setExtracting(false);
    }
  };

  const exportToExcel = async () => {
    if (!filteredRows.length) {
      toast.warning('No data to export');
      return;
    }

    try {
      await exportProfessionalExcel({
        title: 'Visit Report',
        fileName: 'Visit_Report',
        sheetName: 'Visit Report',
        rows: filteredRows.map((row, index) => ({
          'Sr No': index + 1,
          Date: row.OrderDate || '',
          'Order Code': row.OrderCode || '',
          Distributor: row.DistrbutorName || '',
          Activity: row.activity || '',
          Visit: row.Visit ? 'Yes' : 'No',
          Order: row.hasOrder ? 'Yes' : 'No',
          'Phone Order': row.orderThroughPhone ? 'Yes' : 'No',
          'Line Items': row.lineCount || 0,
          Amount: Number(row.TotalAmount || 0),
          Remarks: row.Remarks || '',
          Address: row.Address || '',
          Latitude: row.latitude || '',
          Longitude: row.longitude || '',
          Images: (row.Images || []).length,
          'Image URLs': (row.Images || []).map((img) => img.uri).join(' | '),
        })),
        meta: [
          `Order Booker: ${bookerName}`,
          `Period: ${periodLabel}`,
          `Visits: ${summary.visits}`,
          `Orders: ${summary.orders}`,
          `Phone Orders: ${summary.phoneOrders}`,
        ],
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel');
    }
  };

  const drawPdfFooter = (doc, pageWidth, pageHeight, margin, pageNumber) => {
    doc.setDrawColor(195, 198, 213);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.setFontSize(8);
    doc.setTextColor(115, 119, 132);
    doc.text(
      `Visit Report  |  ${bookerName || 'Order Booker'}  |  Page ${pageNumber}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  };

  const exportToPDF = async () => {
    if (!filteredRows.length) {
      toast.warning('No data to export');
      return;
    }

    setPdfLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      doc.setFillColor(0, 49, 128);
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PEARL DYNAMIC (PVT) LTD', margin, 11);
      doc.setFontSize(16);
      doc.text('Visit Report', margin, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 11, { align: 'right' });
      doc.text(`Period: ${periodLabel}`, pageWidth - margin, 18, { align: 'right' });

      doc.setTextColor(26, 28, 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Order Booker: ${bookerName || '-'}`, margin, 36);
      doc.setFont('helvetica', 'normal');
      doc.text(`Filter: ${activityFilter}`, margin, 42);

      const cardY = 48;
      const cards = [
        { label: 'Visits', value: summary.visits, color: [0, 88, 80] },
        { label: 'Orders', value: summary.orders, color: [160, 65, 0] },
        { label: 'Phone Orders', value: summary.phoneOrders, color: [0, 70, 175] },
        { label: 'Images', value: summary.imagesCount, color: [0, 49, 128] },
      ];
      const cardWidth = (pageWidth - margin * 2 - 12) / 4;
      cards.forEach((card, index) => {
        const x = margin + index * (cardWidth + 4);
        doc.setFillColor(243, 243, 246);
        doc.roundedRect(x, cardY, cardWidth, 16, 2, 2, 'F');
        doc.setTextColor(67, 70, 83);
        doc.setFontSize(8);
        doc.text(card.label, x + 4, cardY + 6);
        doc.setTextColor(...card.color);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text(String(card.value ?? 0), x + 4, cardY + 13);
        doc.setFont('helvetica', 'normal');
      });

      const tableRows = filteredRows.map((row, index) => [
        index + 1,
        row.OrderDate || '',
        row.OrderCode || '',
        row.DistrbutorName || '',
        row.activity || '',
        formatMoney(row.TotalAmount),
        row.Remarks || '',
        row.Address || (row.latitude && row.longitude ? 'Not extracted' : 'No GPS'),
        (row.Images || []).length,
      ]);

      autoTable(doc, {
        startY: cardY + 22,
        head: [['#', 'Date', 'Order #', 'Distributor', 'Activity', 'Amount', 'Remarks', 'Address', 'Images']],
        body: tableRows,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          valign: 'middle',
          textColor: [26, 28, 30],
          lineColor: [226, 226, 229],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: [0, 49, 128],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: [249, 249, 252] },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 36, halign: 'left' },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 34, halign: 'left' },
          7: { cellWidth: 70, halign: 'left' },
          8: { cellWidth: 14, halign: 'center' },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (hookData) => {
          drawPdfFooter(doc, pageWidth, pageHeight, margin, hookData.pageNumber);
        },
      });

      const rowsWithImages = filteredRows.filter((row) => (row.Images || []).some((img) => img?.uri));
      if (rowsWithImages.length) {
        toast.info('Embedding visit images in PDF...');

        const imageEntries = [];
        for (const row of rowsWithImages) {
          for (const img of row.Images || []) {
            if (!img?.uri) continue;
            const loaded = await loadImageAsDataUrl(img.uri);
            if (!loaded?.dataUrl) continue;
            imageEntries.push({
              row,
              format: loaded.format,
              dataUrl: loaded.dataUrl,
            });
          }
        }

        if (imageEntries.length) {
          doc.addPage();
          let pageNumber = doc.getNumberOfPages();
          doc.setFillColor(0, 49, 128);
          doc.rect(0, 0, pageWidth, 18, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.text('Visit Images', margin, 12);

          const thumbW = 58;
          const thumbH = 44;
          const gapX = 6;
          const gapY = 18;
          const cols = 4;
          let col = 0;
          let y = 26;

          for (let i = 0; i < imageEntries.length; i += 1) {
            const entry = imageEntries[i];
            if (y + thumbH + 12 > pageHeight - 14) {
              drawPdfFooter(doc, pageWidth, pageHeight, margin, pageNumber);
              doc.addPage();
              pageNumber = doc.getNumberOfPages();
              doc.setFillColor(0, 49, 128);
              doc.rect(0, 0, pageWidth, 18, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(13);
              doc.text('Visit Images (continued)', margin, 12);
              col = 0;
              y = 26;
            }

            const x = margin + col * (thumbW + gapX);
            doc.setFillColor(243, 243, 246);
            doc.roundedRect(x, y, thumbW, thumbH + 10, 2, 2, 'F');

            try {
              doc.addImage(entry.dataUrl, entry.format || 'JPEG', x + 2, y + 2, thumbW - 4, thumbH - 4, undefined, 'FAST');
            } catch (imgErr) {
              console.error('PDF image embed failed:', imgErr);
              doc.setFontSize(8);
              doc.setTextColor(186, 26, 26);
              doc.text('Image failed', x + 4, y + 20);
            }

            doc.setTextColor(26, 28, 30);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            const caption = `${entry.row.OrderCode || ''} · ${entry.row.DistrbutorName || ''}`.trim();
            doc.text(caption.substring(0, 34), x + 2, y + thumbH + 2);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(115, 119, 132);
            doc.text(`${entry.row.OrderDate || ''} · ${entry.row.activity || ''}`, x + 2, y + thumbH + 6);

            col += 1;
            if (col >= cols) {
              col = 0;
              y += thumbH + gapY;
            }
          }

          drawPdfFooter(doc, pageWidth, pageHeight, margin, pageNumber);
        } else {
          toast.warning('Images could not be loaded into PDF (network/CORS). Table exported without photos.');
        }
      }

      const safeBooker = String(bookerName || 'OrderBooker').replace(/[^\w\-]+/g, '_');
      doc.save(`Visit_Report_${safeBooker}_${data.startDate || 'from'}_${data.endDate || 'to'}.pdf`);
      toast.success('PDF downloaded with images');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="visit-shell">
        <div className="loading-card">
          <div className="spinner" />
          <p>Loading Visit Report...</p>
        </div>
        <style>{baseCss}</style>
      </div>
    );
  }

  return (
    <div className="visit-shell">
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        limit={3}
        theme="colored"
        style={{ width: 320, zIndex: 9999 }}
        toastStyle={{
          fontSize: 13,
          minHeight: 48,
          borderRadius: 10,
          fontFamily: '"Work Sans", "Segoe UI", sans-serif',
        }}
      />

      <header className="hero">
        <div className="hero-accent" />
        <div className="hero-body">
          <div>
            <p className="eyebrow">Pearl Dynamic (Pvt) Ltd</p>
            <h1>Visit Report</h1>
            <p className="subtitle">
              Field activity for <strong>{bookerName || 'Order Booker'}</strong>
            </p>
          </div>
          <div className="hero-meta">
            <div><span>Period</span><strong>{periodLabel}</strong></div>
            <div><span>Records</span><strong>{filteredRows.length}</strong></div>
            <div><span>Pending Address</span><strong>{pendingAddressRows.length}</strong></div>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="toolbar">
          <div className="filters">
            <label htmlFor="activityFilter">Show</label>
            <select
              id="activityFilter"
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
            >
              <option value="All">All Activity</option>
              <option value="Visit">Visits</option>
              <option value="Order">Orders</option>
              <option value="Phone Order">Phone Orders</option>
              <option value="Visit + Order">Visit + Order</option>
            </select>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-extract"
              onClick={extractAddresses}
              disabled={extracting || pendingAddressRows.length === 0}
            >
              {extracting
                ? `Extracting ${extractProgress.current}/${extractProgress.total}`
                : `Extract Addresses (${pendingAddressRows.length})`}
            </button>
            <button type="button" className="btn btn-excel" onClick={exportToExcel}>
              Excel
            </button>
            <button
              type="button"
              className="btn btn-pdf"
              onClick={exportToPDF}
              disabled={pdfLoading || !filteredRows.length}
            >
              {pdfLoading ? 'Preparing PDF...' : 'PDF'}
            </button>
          </div>
        </div>

        {(extracting || extractProgress.total > 0) && (
          <div className="extract-box">
            <div className="extract-meta">
              <span>Address Extraction</span>
              <span>{extractProgress.current} / {extractProgress.total}</span>
            </div>
            <div className="extract-bar">
              <div
                className="extract-fill"
                style={{
                  width: `${extractProgress.total > 0 ? (extractProgress.current / extractProgress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="extract-status">{extractProgress.status}</div>
          </div>
        )}

        <div className="summary-grid">
          <article className="summary-card visits">
            <p>Visits</p>
            <h2>{summary.visits}</h2>
            <span>GPS field check-ins</span>
          </article>
          <article className="summary-card orders">
            <p>Orders</p>
            <h2>{summary.orders}</h2>
            <span>Orders with product lines</span>
          </article>
          <article className="summary-card phone">
            <p>Phone Orders</p>
            <h2>{summary.phoneOrders}</h2>
            <span>Placed through phone</span>
          </article>
          <article className="summary-card images">
            <p>Images</p>
            <h2>{summary.imagesCount}</h2>
            <span>Attached visit photos</span>
          </article>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Date</th>
                <th>Order #</th>
                <th>Distributor</th>
                <th>Activity</th>
                <th>Amount</th>
                <th>Remarks</th>
                <th>Address</th>
                <th>Map</th>
                <th>Images</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="10" className="empty">No visit / order records found for this period.</td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row._id || `${row.OrderCode}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{row.OrderDate}</td>
                    <td className="mono">{row.OrderCode}</td>
                    <td className="left strong">{row.DistrbutorName}</td>
                    <td>
                      <span className={activityClass(row.activity)}>{row.activity}</span>
                    </td>
                    <td className="right">{formatMoney(row.TotalAmount)}</td>
                    <td className="left muted-text">{row.Remarks || '—'}</td>
                    <td className="left address-cell">
                      {row.Address || (
                        <span className="muted">
                          {row.latitude && row.longitude ? 'Not extracted' : 'No GPS'}
                        </span>
                      )}
                    </td>
                    <td>
                      {row.latitude && row.longitude ? (
                        <a
                          className="map-link"
                          href={`https://www.google.com/maps?q=${row.latitude},${row.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Map
                        </a>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="thumbs">
                        {(row.Images || []).length === 0 ? (
                          <span className="muted">No image</span>
                        ) : (
                          (row.Images || []).map((img, imgIndex) => (
                            <button
                              key={`${row._id}-${imgIndex}`}
                              type="button"
                              className="thumb-btn"
                              onClick={() => setPreviewImage(img.uri)}
                              title={img.filename || 'Open image'}
                            >
                              <img src={img.uri} alt={img.filename || `visit-${imgIndex + 1}`} />
                            </button>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="footer">
          <span>Pearl Dynamic ERP · Visit Report</span>
          <span>Generated {generatedAt}</span>
        </footer>
      </section>

      {previewImage ? (
        <div className="preview-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="preview-top">
              <h3>Visit Image</h3>
              <button type="button" className="preview-close" onClick={() => setPreviewImage(null)}>
                Close
              </button>
            </div>
            <img src={previewImage} alt="Visit" />
            <a href={previewImage} target="_blank" rel="noreferrer">
              Open original
            </a>
          </div>
        </div>
      ) : null}

      <style>{baseCss}</style>
    </div>
  );
};

const baseCss = `
  :root {
    --vr-bg: #f3f3f6;
    --vr-surface: #ffffff;
    --vr-ink: #1a1c1e;
    --vr-muted: #434653;
    --vr-line: #e2e2e5;
    --vr-primary: #003180;
    --vr-primary-mid: #0046af;
    --vr-secondary: #a04100;
    --vr-tertiary: #005850;
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  .visit-shell {
    min-height: 100vh;
    padding: 18px;
    font-family: "Work Sans", "Segoe UI", sans-serif;
    color: var(--vr-ink);
    background:
      radial-gradient(circle at top right, rgba(0, 70, 175, 0.10), transparent 28%),
      linear-gradient(180deg, #e8e8ea 0%, var(--vr-bg) 34%, #f9f9fc 100%);
  }
  .loading-card {
    max-width: 360px;
    margin: 12vh auto;
    background: var(--vr-surface);
    border: 1px solid var(--vr-line);
    border-radius: 16px;
    padding: 28px;
    text-align: center;
    box-shadow: 0 12px 30px rgba(26, 28, 30, 0.08);
  }
  .spinner {
    width: 36px;
    height: 36px;
    margin: 0 auto 12px;
    border-radius: 50%;
    border: 3px solid #dae2ff;
    border-top-color: var(--vr-primary);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .hero {
    background: linear-gradient(135deg, #001848 0%, var(--vr-primary) 55%, var(--vr-primary-mid) 100%);
    color: #fff;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 16px 40px rgba(0, 49, 128, 0.22);
    margin-bottom: 16px;
  }
  .hero-accent {
    height: 4px;
    background: linear-gradient(90deg, #fe6b00, #63d1c3, #a6bdff);
  }
  .hero-body {
    padding: 22px 24px 20px;
    display: flex;
    justify-content: space-between;
    gap: 18px;
    flex-wrap: wrap;
  }
  .eyebrow {
    margin: 0 0 6px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.82;
    font-weight: 600;
  }
  .hero h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: -0.02em;
  }
  .subtitle {
    margin: 8px 0 0;
    opacity: 0.92;
    font-size: 14px;
  }
  .hero-meta {
    display: grid;
    gap: 10px;
    min-width: 220px;
  }
  .hero-meta div {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 12px;
    padding: 10px 12px;
  }
  .hero-meta span {
    display: block;
    font-size: 11px;
    opacity: 0.8;
    margin-bottom: 2px;
  }
  .hero-meta strong {
    font-size: 14px;
  }
  .panel {
    background: var(--vr-surface);
    border: 1px solid var(--vr-line);
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 10px 28px rgba(26, 28, 30, 0.05);
  }
  .toolbar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .filters, .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .filters label {
    font-size: 13px;
    color: var(--vr-muted);
    font-weight: 600;
  }
  .filters select, .btn {
    border: 1px solid #c3c6d5;
    border-radius: 10px;
    padding: 9px 14px;
    background: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
  }
  .btn { cursor: pointer; transition: 0.15s ease; }
  .btn:hover { transform: translateY(-1px); }
  .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
  .btn-extract {
    color: var(--vr-tertiary);
    background: #e7fbf8;
    border-color: #63d1c3;
  }
  .btn-excel {
    color: var(--vr-primary);
    background: #eef3ff;
    border-color: #a6bdff;
  }
  .btn-pdf {
    color: #fff;
    background: linear-gradient(135deg, var(--vr-primary), var(--vr-primary-mid));
    border-color: transparent;
  }
  .extract-box {
    background: #f8fafc;
    border: 1px solid var(--vr-line);
    border-radius: 14px;
    padding: 12px 14px;
    margin-bottom: 14px;
  }
  .extract-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--vr-muted);
    margin-bottom: 8px;
  }
  .extract-bar {
    height: 8px;
    background: #eeeef0;
    border-radius: 999px;
    overflow: hidden;
  }
  .extract-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--vr-primary-mid), var(--vr-tertiary));
    transition: width 0.3s ease;
  }
  .extract-status {
    margin-top: 8px;
    font-size: 13px;
    color: var(--vr-primary);
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }
  .summary-card {
    position: relative;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid var(--vr-line);
    background: linear-gradient(180deg, #fff, #f9f9fc);
    padding: 16px;
  }
  .summary-card::before {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
  }
  .summary-card.visits::before { background: #005850; }
  .summary-card.orders::before { background: #a04100; }
  .summary-card.phone::before { background: #0046af; }
  .summary-card.images::before { background: #003180; }
  .summary-card p {
    margin: 0;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--vr-muted);
    font-weight: 700;
  }
  .summary-card h2 {
    margin: 8px 0 4px;
    font-size: 32px;
    letter-spacing: -0.03em;
    color: var(--vr-primary);
  }
  .summary-card span {
    font-size: 12px;
    color: #737784;
  }
  .table-wrap {
    overflow: auto;
    border: 1px solid var(--vr-line);
    border-radius: 14px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 1180px;
  }
  th, td {
    padding: 12px;
    border-bottom: 1px solid #eeeef0;
    font-size: 13px;
    text-align: center;
    vertical-align: top;
  }
  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #f3f3f6;
    color: var(--vr-muted);
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  tbody tr:hover { background: #f8faff; }
  td.left { text-align: left; }
  td.right { text-align: right; font-variant-numeric: tabular-nums; }
  td.empty { padding: 36px; color: #737784; }
  .strong { font-weight: 600; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .muted, .muted-text { color: #737784; }
  .address-cell { max-width: 280px; min-width: 180px; }
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    background: #dae2ff;
    color: #003180;
  }
  .badge-visit { background: #89f5e7; color: #003f39; }
  .badge-order { background: #ffdbcc; color: #7a3000; }
  .badge-phone-order { background: #ffe08a; color: #5c4300; }
  .badge-visit---order { background: #b2c5ff; color: #001848; }
  .map-link {
    color: var(--vr-primary-mid);
    font-weight: 700;
    text-decoration: none;
  }
  .map-link:hover { text-decoration: underline; }
  .thumbs {
    display: flex;
    gap: 6px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .thumb-btn {
    border: none;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }
  .thumb-btn img {
    width: 52px;
    height: 52px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid #c3c6d5;
    box-shadow: 0 4px 10px rgba(26,28,30,0.08);
  }
  .footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid var(--vr-line);
    color: #737784;
    font-size: 12px;
  }
  .preview-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(26, 28, 30, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    padding: 20px;
  }
  .preview-panel {
    background: #fff;
    border-radius: 16px;
    padding: 16px;
    max-width: min(90vw, 900px);
    max-height: 90vh;
    overflow: auto;
    display: grid;
    gap: 12px;
  }
  .preview-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .preview-top h3 { margin: 0; color: var(--vr-primary); }
  .preview-panel img {
    width: 100%;
    height: auto;
    border-radius: 12px;
  }
  .preview-close {
    border: 1px solid #c3c6d5;
    background: #fff;
    border-radius: 8px;
    padding: 6px 12px;
    cursor: pointer;
  }
  .Toastify__toast-container {
    width: 320px !important;
    max-width: calc(100vw - 24px) !important;
  }
  .Toastify__toast {
    min-height: 48px !important;
    margin-bottom: 8px !important;
    border-radius: 10px !important;
    font-size: 13px !important;
  }
  .Toastify__toast-body {
    padding: 4px 0 !important;
    line-height: 1.35 !important;
  }
  @media (max-width: 900px) {
    .summary-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)); }
    .hero h1 { font-size: 24px; }
  }
`;

export default VisitReportPopup;
