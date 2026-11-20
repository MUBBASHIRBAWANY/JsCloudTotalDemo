/**
 * Temporary patch helper: applies exact string replacements to files.
 * Each replacement must match exactly once, otherwise it errors out.
 * Usage: node tmp_apply_scheme_patch.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = 'F:/DistributorSND/PearlSNDClinet/PearlSNDClinet';

const patches = [
  // ============ 2. PrintInvoicePopup.jsx ============
  {
    file: 'src/Pages/Reports/PrintInvoice/PrintInvoicePopup.jsx',
    replacements: [
      // P1: getScheme helper
      [
        "  const getNet = (row) => parseFloat(row?.netAmunt ?? row?.NetSale ?? row?.netAmount ?? 0) || 0;",
        "  const getNet = (row) => parseFloat(row?.netAmunt ?? row?.NetSale ?? row?.netAmount ?? 0) || 0;\n  const getScheme = (row) => parseFloat(row?.SpecialTO ?? 0) || 0;",
      ],
      // P2a: clientSummary init
      [
        "          totalNet: 0,\n          SlabDiscount : 0\n        };",
        "          totalNet: 0,\n          SlabDiscount : 0,\n          SpecialTO: 0,\n        };",
      ],
      // P2b: clientSummary accumulation
      [
        "      grouped[cid].totalNet += sd.reduce((sum, r) => sum + (parseFloat(r.NetSale) || 0), 0);\n      grouped[cid].SlabDiscount += parseFloat(inv.SlabDiscount) || 0;",
        "      grouped[cid].totalNet += sd.reduce((sum, r) => sum + (parseFloat(r.NetSale) || 0), 0);\n      grouped[cid].SlabDiscount += parseFloat(inv.SlabDiscount) || 0;\n      grouped[cid].SpecialTO += sd.reduce((sum, r) => sum + (parseFloat(r.SpecialTO) || 0), 0);",
      ],
      // P3: clientTotals
      [
        "    SlabDiscount: clientSummary.reduce((s, c) => s + c.SlabDiscount, 0),\n  }), [clientSummary, allData.length]);",
        "    SlabDiscount: clientSummary.reduce((s, c) => s + c.SlabDiscount, 0),\n    Scheme: clientSummary.reduce((s, c) => s + (c.SpecialTO || 0), 0),\n  }), [clientSummary, allData.length]);",
      ],
      // P4: mergedData accumulator
      [
        "              acc[item.product] = {\n                product: item.product,\n                DeliveredBox: 0,\n                To: 0,\n                GrossAmount: 0,\n                NetSale: 0,\n                RTGBox: 0,\n              };\n            }\n\n            acc[item.product].DeliveredBox += item.DeliveredBox || 0;\n            acc[item.product].To += item.To || 0;\n            acc[item.product].GrossAmount += item.GrossAmount || 0;\n            acc[item.product].NetSale += Number(item.NetSale) || 0;\n            acc[item.product].RTGBox += item.RTGBox || 0;",
        "              acc[item.product] = {\n                product: item.product,\n                DeliveredBox: 0,\n                To: 0,\n                GrossAmount: 0,\n                NetSale: 0,\n                RTGBox: 0,\n                SpecialTO: 0,\n              };\n            }\n\n            acc[item.product].DeliveredBox += item.DeliveredBox || 0;\n            acc[item.product].To += item.To || 0;\n            acc[item.product].GrossAmount += item.GrossAmount || 0;\n            acc[item.product].NetSale += Number(item.NetSale) || 0;\n            acc[item.product].RTGBox += item.RTGBox || 0;\n            acc[item.product].SpecialTO += Number(item.SpecialTO) || 0;",
      ],
      // P5a: calculateTotals init
      [
        "      gst: 0,\n      advanceTax: 0,\n      totalDiscount: 0,\n      netSales: 0\n    };",
        "      gst: 0,\n      advanceTax: 0,\n      totalDiscount: 0,\n      scheme: 0,\n      netSales: 0\n    };",
      ],
      // P5b: calculateTotals accumulation
      [
        "      totals.totalDiscount += item.To || 0;\n      totals.netSales += item.NetSale || 0;",
        "      totals.totalDiscount += item.To || 0;\n      totals.scheme += Number(item.SpecialTO) || 0;\n      totals.netSales += item.NetSale || 0;",
      ],
      // P6a: buildInvoicePrintHtml totalScheme
      [
        "    const totalNetAmount = salesData.reduce((sum, item) => sum + getNet(item), 0);",
        "    const totalNetAmount = salesData.reduce((sum, item) => sum + getNet(item), 0);\n    const totalScheme = salesData.reduce((sum, item) => sum + getScheme(item), 0);",
      ],
      // P6b: invoice print header
      [
        '              <th class="center" style="width:11%">Gross Amount</th>\n              <th class="center" style="width:10%">Discount</th>\n              <th class="center" style="width:14%">Net Amount</th>',
        '              <th class="center" style="width:11%">Gross Amount</th>\n              <th class="center" style="width:9%">Discount</th>\n              <th class="center" style="width:10%">Scheme</th>\n              <th class="center" style="width:14%">Net Amount</th>',
      ],
      // P6c: invoice print row cells
      [
        '          <td class="num">${Number(getDiscount(row)).toLocaleString()}</td>\n          <td class="num">${Number(getNet(row)).toLocaleString()}</td>',
        '          <td class="num">${Number(getDiscount(row)).toLocaleString()}</td>\n          <td class="num">${Number(getScheme(row)).toLocaleString()}</td>\n          <td class="num">${Number(getNet(row)).toLocaleString()}</td>',
      ],
      // P6d: invoice print tfoot
      [
        '              <td class="num">${totalAmount.toLocaleString()}</td>\n              <td class="num">-${totalDiscount.toLocaleString()}</td>\n              <td class="num">${totalNetAmount.toLocaleString()}</td>',
        '              <td class="num">${totalAmount.toLocaleString()}</td>\n              <td class="num">-${totalDiscount.toLocaleString()}</td>\n              <td class="num">${totalScheme.toLocaleString()}</td>\n              <td class="num">${totalNetAmount.toLocaleString()}</td>',
      ],
      // P6e: invoice print summary box
      [
        '            <div class="inv-summary-row"><span>Discount:</span><span>${totalDiscount.toLocaleString()}</span></div>\n            <div class="inv-summary-row"><span>Slab Discount(${invoice?.SlabPercentage ||0}%):</span><span>${((invoice.SlabDiscount || 0)).toLocaleString()}</span></div>',
        '            <div class="inv-summary-row"><span>Discount:</span><span>${totalDiscount.toLocaleString()}</span></div>\n            <div class="inv-summary-row"><span>Scheme:</span><span>${totalScheme.toLocaleString()}</span></div>\n            <div class="inv-summary-row"><span>Slab Discount(${invoice?.SlabPercentage ||0}%):</span><span>${((invoice.SlabDiscount || 0)).toLocaleString()}</span></div>',
      ],
      // P7a: on-screen invTotalScheme
      [
        "              const invTotalNetAmount = salesData.reduce((sum, item) => sum + getNet(item), 0);\n              const invTotalBox = salesData.reduce((sum, item) => sum + getDelivered(item), 0);",
        "              const invTotalNetAmount = salesData.reduce((sum, item) => sum + getNet(item), 0);\n              const invTotalScheme = salesData.reduce((sum, item) => sum + getScheme(item), 0);\n              const invTotalBox = salesData.reduce((sum, item) => sum + getDelivered(item), 0);",
      ],
      // P7b: on-screen invoice table header
      [
        "                        <th>Gross Amount</th>\n                        <th>Discount</th>\n                        <th>Net Sale</th>",
        "                        <th>Gross Amount</th>\n                        <th>Discount</th>\n                        <th>Scheme</th>\n                        <th>Net Sale</th>",
      ],
      // P7c: on-screen invoice row cells
      [
        "                            <td align=\"right\">{getDiscount(item).toFixed(2)}</td>\n                            <td align=\"right\">{getNet(item).toFixed(2)}</td>",
        "                            <td align=\"right\">{getDiscount(item).toFixed(2)}</td>\n                            <td align=\"right\">{getScheme(item).toFixed(2)}</td>\n                            <td align=\"right\">{getNet(item).toFixed(2)}</td>",
      ],
      // P7d: on-screen invoice total row
      [
        "                        <td align=\"right\">{invTotalAmount.toFixed(2)}</td>\n                        <td align=\"right\">{invTotalDiscount.toFixed(2)}</td>\n                        <td align=\"right\">{invTotalNetAmount.toFixed(2)}</td>",
        "                        <td align=\"right\">{invTotalAmount.toFixed(2)}</td>\n                        <td align=\"right\">{invTotalDiscount.toFixed(2)}</td>\n                        <td align=\"right\">{invTotalScheme.toFixed(2)}</td>\n                        <td align=\"right\">{invTotalNetAmount.toFixed(2)}</td>",
      ],
      // P8a: load form print CLIENT SUMMARY thead
      [
        '              <th class="num">Gross Amount</th>\n              <th class="num">To</th>\n              <th class="num">Slab Discount</th>',
        '              <th class="num">Gross Amount</th>\n              <th class="num">To</th>\n              <th class="num">Scheme</th>\n              <th class="num">Slab Discount</th>',
      ],
      // P8b: load form print client rows
      [
        '        <td class="num">${c.totalGross.toFixed(2)}</td>\n        <td class="num">${c.To}</td>\n        <td class="num">${Number(c.SlabDiscount || 0).toFixed(2)}</td>',
        '        <td class="num">${c.totalGross.toFixed(2)}</td>\n        <td class="num">${c.To}</td>\n        <td class="num">${Number(c.SpecialTO || 0).toFixed(2)}</td>\n        <td class="num">${Number(c.SlabDiscount || 0).toFixed(2)}</td>',
      ],
      // P8c: load form print client tfoot
      [
        '              <td class="num">${clientTotals.gross.toFixed(2)}</td>\n              <td class="num">${clientTotals.To}</td>\n              <td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td>',
        '              <td class="num">${clientTotals.gross.toFixed(2)}</td>\n              <td class="num">${clientTotals.To}</td>\n              <td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td>\n              <td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td>',
      ],
      // P8d: invoice print "No items" colspan (10 cols now)
      [
        "${buildPrintTableRows() || '<tr><td colspan=\"9\" class=\"center\">No items</td></tr>'}",
        "${buildPrintTableRows() || '<tr><td colspan=\"10\" class=\"center\">No items</td></tr>'}",
      ],
      // P8e: load form print client summary colspan (11 cols now)
      [
        "${buildPrintClientRows() || '<tr><td colspan=\"9\" class=\"center\">No client data</td></tr>'}",
        "${buildPrintClientRows() || '<tr><td colspan=\"11\" class=\"center\">No client data</td></tr>'}",
      ],
      // P9: load form print SALES SUMMARY CALCULATION
      [
        '            <tr><td class="label">To</td><td class="num">${clientTotals.To.toFixed(2)}</td></tr>\n            <tr><td class="label">Slab Discount</td><td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>',
        '            <tr><td class="label">To</td><td class="num">${clientTotals.To.toFixed(2)}</td></tr>\n            <tr><td class="label">Scheme</td><td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td></tr>\n            <tr><td class="label">Slab Discount</td><td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>',
      ],
      // P10a: on-screen main-table thead
      [
        "                    <td align=\"center\" style={{ fontWeight: 'bold', fontSize: '12px' }}>Total Discount</td>\n                    <td align=\"center\" style={{ fontWeight: 'bold', fontSize: '12px' }}>Net Sales</td>",
        "                    <td align=\"center\" style={{ fontWeight: 'bold', fontSize: '12px' }}>Total Discount</td>\n                    <td align=\"center\" style={{ fontWeight: 'bold', fontSize: '12px' }}>Scheme</td>\n                    <td align=\"center\" style={{ fontWeight: 'bold', fontSize: '12px' }}>Net Sales</td>",
      ],
      // P10b: on-screen main-table second header row (Box labels)
      [
        "                  <tr style={{ backgroundColor: '#2196F3', color: 'white' }}>\n                    <td></td>\n                    <td align=\"center\">Box</td>\n                    <td align=\"center\">Box</td>\n                    <td align=\"center\">Box</td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                  </tr>",
        "                  <tr style={{ backgroundColor: '#2196F3', color: 'white' }}>\n                    <td></td>\n                    <td align=\"center\">Box</td>\n                    <td align=\"center\">Box</td>\n                    <td align=\"center\">Box</td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                    <td></td>\n                  </tr>",
      ],
      // P10c: on-screen main-table rows
      [
        "                      <td align=\"right\">{row.To?.toFixed(2) || '0.00'}</td>\n                      <td align=\"right\">{row.NetSale?.toFixed(2) || '0.00'}</td>",
        "                      <td align=\"right\">{row.To?.toFixed(2) || '0.00'}</td>\n                      <td align=\"right\">{row.SpecialTO?.toFixed(2) || '0.00'}</td>\n                      <td align=\"right\">{row.NetSale?.toFixed(2) || '0.00'}</td>",
      ],
      // P10d: on-screen main-table total row
      [
        "                    <td align=\"right\">{totals.totalDiscount.toFixed(2)}</td>\n                    <td align=\"right\">{totals.netSales.toFixed(2)}</td>",
        "                    <td align=\"right\">{totals.totalDiscount.toFixed(2)}</td>\n                    <td align=\"right\">{totals.scheme.toFixed(2)}</td>\n                    <td align=\"right\">{totals.netSales.toFixed(2)}</td>",
      ],
      // P11: on-screen sales-summary
      [
        "                  <tr><td align=\"left\" style={{ fontWeight: 'bolder' }}>To</td><td align=\"right\">{clientTotals.To.toFixed(2)}</td></tr>\n                  <tr><td align=\"left\" style={{ fontWeight: 'bolder' }}>Slab Discount</td><td align=\"right\">{Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>",
        "                  <tr><td align=\"left\" style={{ fontWeight: 'bolder' }}>To</td><td align=\"right\">{clientTotals.To.toFixed(2)}</td></tr>\n                  <tr><td align=\"left\" style={{ fontWeight: 'bolder' }}>Scheme</td><td align=\"right\">{Number(clientTotals.Scheme || 0).toFixed(2)}</td></tr>\n                  <tr><td align=\"left\" style={{ fontWeight: 'bolder' }}>Slab Discount</td><td align=\"right\">{Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>",
      ],
      // P12a: Excel productData
      [
        "      'Total Discount': item.To?.toFixed(2) || '0.00',\n      'Net Sales': item.NetSale?.toFixed(2) || '0.00'\n    }));",
        "      'Total Discount': item.To?.toFixed(2) || '0.00',\n      'Scheme': item.SpecialTO?.toFixed(2) || '0.00',\n      'Net Sales': item.NetSale?.toFixed(2) || '0.00'\n    }));",
      ],
      // P12b: Excel totals row
      [
        "      'Total Discount': totals.totalDiscount.toFixed(2),\n      'Net Sales': totals.netSales.toFixed(2)\n    });",
        "      'Total Discount': totals.totalDiscount.toFixed(2),\n      'Scheme': totals.scheme.toFixed(2),\n      'Net Sales': totals.netSales.toFixed(2)\n    });",
      ],
      // P12c: Excel salesSummaryData
      [
        "      'Discount (To)': totals.totalDiscount.toFixed(2),\n      'Net Sales': totals.netSales.toFixed(2),",
        "      'Discount (To)': totals.totalDiscount.toFixed(2),\n      'Scheme': totals.scheme.toFixed(2),\n      'Net Sales': totals.netSales.toFixed(2),",
      ],
    ],
  },
  // ============ 3. LoadFormView.jsx ============
  {
    file: 'src/Components/LoadForm/LoadFormView.jsx',
    replacements: [
      // L1: mergedData accumulator
      [
        "              if (!acc[item.product]) {\n                acc[item.product] = {\n                  product: item.product,\n                  DeliveredBox: 0,\n                  To: 0,\n                  GrossAmount: 0,\n                  NetSale: 0,\n                  orderBox: 0,\n                  RTGBox: 0,\n                };\n              }\n\n              acc[item.product].DeliveredBox += item.DeliveredBox || 0;\n              acc[item.product].To += item.To || 0;\n              acc[item.product].GrossAmount += item.GrossAmount || 0;\n              acc[item.product].NetSale += Number(item.NetSale) || 0;\n              acc[item.product].orderBox += item.orderBox || item.DeliveredBox || 0;\n              acc[item.product].RTGBox += item.RTGBox || 0;",
        "              if (!acc[item.product]) {\n                acc[item.product] = {\n                  product: item.product,\n                  DeliveredBox: 0,\n                  To: 0,\n                  GrossAmount: 0,\n                  NetSale: 0,\n                  orderBox: 0,\n                  RTGBox: 0,\n                  SpecialTO: 0,\n                };\n              }\n\n              acc[item.product].DeliveredBox += item.DeliveredBox || 0;\n              acc[item.product].To += item.To || 0;\n              acc[item.product].GrossAmount += item.GrossAmount || 0;\n              acc[item.product].NetSale += Number(item.NetSale) || 0;\n              acc[item.product].orderBox += item.orderBox || item.DeliveredBox || 0;\n              acc[item.product].RTGBox += item.RTGBox || 0;\n              acc[item.product].SpecialTO += Number(item.SpecialTO) || 0;",
      ],
      // L2a: clientSummary init
      [
        "          totalGross: 0,\n          totalNet: 0,\n          SlabDiscount: 0,\n        };",
        "          totalGross: 0,\n          totalNet: 0,\n          SlabDiscount: 0,\n          SpecialTO: 0,\n        };",
      ],
      // L2b: clientSummary accumulation
      [
        "      grouped[cid].totalNet += sd.reduce((sum, r) => sum + (parseFloat(r.NetSale) || 0), 0);\n      grouped[cid].SlabDiscount += parseFloat(inv.SlabDiscount) || 0;",
        "      grouped[cid].totalNet += sd.reduce((sum, r) => sum + (parseFloat(r.NetSale) || 0), 0);\n      grouped[cid].SlabDiscount += parseFloat(inv.SlabDiscount) || 0;\n      grouped[cid].SpecialTO += sd.reduce((sum, r) => sum + (parseFloat(r.SpecialTO) || 0), 0);",
      ],
      // L3: clientTotals
      [
        "    SlabDiscount: clientSummary.reduce((s, c) => s + c.SlabDiscount, 0),\n  }), [clientSummary, invoicesData.length]);",
        "    SlabDiscount: clientSummary.reduce((s, c) => s + c.SlabDiscount, 0),\n    Scheme: clientSummary.reduce((s, c) => s + (c.SpecialTO || 0), 0),\n  }), [clientSummary, invoicesData.length]);",
      ],
      // L4a: print CLIENT SUMMARY thead
      [
        '                <th class="num">Gross Amount</th>\n                <th class="num">To</th>\n                <th class="num">Slab Discount</th>',
        '                <th class="num">Gross Amount</th>\n                <th class="num">To</th>\n                <th class="num">Scheme</th>\n                <th class="num">Slab Discount</th>',
      ],
      // L4b: print client rows
      [
        '      <td class="num">${c.totalGross.toFixed(2)}</td>\n      <td class="num">${c.To}</td>\n      <td class="num">${Number(c.SlabDiscount || 0).toFixed(2)}</td>',
        '      <td class="num">${c.totalGross.toFixed(2)}</td>\n      <td class="num">${c.To}</td>\n      <td class="num">${Number(c.SpecialTO || 0).toFixed(2)}</td>\n      <td class="num">${Number(c.SlabDiscount || 0).toFixed(2)}</td>',
      ],
      // L4c: print client tfoot
      [
        '                <td class="num">${clientTotals.gross.toFixed(2)}</td>\n                <td class="num">${clientTotals.To}</td>\n                <td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td>',
        '                <td class="num">${clientTotals.gross.toFixed(2)}</td>\n                <td class="num">${clientTotals.To}</td>\n                <td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td>\n                <td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td>',
      ],
      // L4d: print client summary colspan (11 cols now)
      [
        "${buildPrintClientRows() || '<tr><td colspan=\"10\" class=\"center\">No client data</td></tr>'}",
        "${buildPrintClientRows() || '<tr><td colspan=\"11\" class=\"center\">No client data</td></tr>'}",
      ],
      [
        '              <tr><td class="label">To</td><td class="num">${clientTotals.To.toFixed(2)}</td></tr>\n              <tr><td class="label">Slab Discount</td><td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>',
        '              <tr><td class="label">To</td><td class="num">${clientTotals.To.toFixed(2)}</td></tr>\n              <tr><td class="label">Scheme</td><td class="num">${Number(clientTotals.Scheme || 0).toFixed(2)}</td></tr>\n              <tr><td class="label">Slab Discount</td><td class="num">${Number(invoiceTotals.SlabDiscount || 0).toFixed(2)}</td></tr>',
      ],
      // L6a: on-screen client summary thead
      [
        '                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Gross Amount</th>\n                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Net Sale</th>',
        '                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Gross Amount</th>\n                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Scheme</th>\n                    <th className="px-4 py-3 text-right font-semibold text-gray-600 text-xs uppercase">Net Sale</th>',
      ],
      // L6b: on-screen client rows
      [
        '                      <td className="px-4 py-3 text-right tabular-nums">{c.totalGross.toFixed(2)}</td>\n                      <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">{c.totalNet.toFixed(2)}</td>',
        '                      <td className="px-4 py-3 text-right tabular-nums">{c.totalGross.toFixed(2)}</td>\n                      <td className="px-4 py-3 text-right tabular-nums text-blue-600">{Number(c.SpecialTO || 0).toFixed(2)}</td>\n                      <td className="px-4 py-3 text-right tabular-nums font-medium text-green-700">{c.totalNet.toFixed(2)}</td>',
      ],
      // L6c: on-screen client tfoot
      [
        '                    <td className="px-4 py-3 text-right font-bold tabular-nums">{clientTotals.gross.toFixed(2)}</td>\n                    <td className="px-4 py-3 text-right font-bold tabular-nums text-green-700">{clientTotals.net.toFixed(2)}</td>',
        '                    <td className="px-4 py-3 text-right font-bold tabular-nums">{clientTotals.gross.toFixed(2)}</td>\n                    <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-700">{Number(clientTotals.Scheme || 0).toFixed(2)}</td>\n                    <td className="px-4 py-3 text-right font-bold tabular-nums text-green-700">{clientTotals.net.toFixed(2)}</td>',
      ],
      // L7a: PDF clientBody
      [
        "      const clientBody = clientSummary.map((c) => [\n        c.name,\n        c.invoiceCount,\n        c.totalDeliveredBox,\n        c.RTGBox,\n        c.totalGross.toFixed(2),\n        c.totalNet.toFixed(2),\n      ]);",
        "      const clientBody = clientSummary.map((c) => [\n        c.name,\n        c.invoiceCount,\n        c.totalDeliveredBox,\n        c.RTGBox,\n        c.totalGross.toFixed(2),\n        Number(c.SpecialTO || 0).toFixed(2),\n        c.totalNet.toFixed(2),\n      ]);",
      ],
      // L7b: PDF head
      [
        "        head: [['Client', 'Invoices', 'Delivered Box', 'RTG Box', 'Gross Amount', 'Net Sale']],",
        "        head: [['Client', 'Invoices', 'Delivered Box', 'RTG Box', 'Gross Amount', 'Scheme', 'Net Sale']],",
      ],
      // L7c: PDF foot
      [
        "          'TOTAL',\n          clientTotals.invoices,\n          clientTotals.delivered,\n          clientTotals.rtg,\n          clientTotals.gross.toFixed(2),\n          clientTotals.net.toFixed(2),\n        ]],",
        "          'TOTAL',\n          clientTotals.invoices,\n          clientTotals.delivered,\n          clientTotals.rtg,\n          clientTotals.gross.toFixed(2),\n          Number(clientTotals.Scheme || 0).toFixed(2),\n          clientTotals.net.toFixed(2),\n        ]],",
      ],
    ],
  },
];

let failed = false;
for (const patch of patches) {
  const abs = path.join(ROOT, patch.file);
  if (!fs.existsSync(abs)) {
    console.error('MISSING FILE: ' + abs);
    failed = true;
    continue;
  }
  let content = fs.readFileSync(abs, 'utf8');
  for (const [from, to] of patch.replacements) {
    const count = content.split(from).length - 1;
    if (count !== 1) {
      console.error(`FAIL (${patch.file}): expected 1 match, found ${count}`);
      console.error('--- from ---\n' + from.slice(0, 400) + '\n---');
      failed = true;
      continue;
    }
    content = content.replace(from, to);
  }
  if (!failed) {
    fs.writeFileSync(abs, content, 'utf8');
    console.log('OK: ' + patch.file);
  }
}
process.exit(failed ? 1 : 0);
