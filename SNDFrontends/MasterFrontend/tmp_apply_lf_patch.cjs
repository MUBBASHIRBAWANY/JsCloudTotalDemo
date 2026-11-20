/**
 * Temporary patch helper for LoadFormView.jsx only.
 * Each replacement must match exactly once, otherwise it errors out.
 */
const fs = require('fs');
const path = require('path');

const abs = 'F:/DistributorSND/PearlSNDClinet/PearlSNDClinet/src/Components/LoadForm/LoadFormView.jsx';

const replacements = [
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
  // L4a: print CLIENT SUMMARY thead (16-space indent)
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
  // L5: print SALES SUMMARY CALCULATION
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
];

if (!fs.existsSync(abs)) {
  console.error('MISSING FILE: ' + abs);
  process.exit(1);
}
let content = fs.readFileSync(abs, 'utf8');
let failed = false;
for (const [from, to] of replacements) {
  const count = content.split(from).length - 1;
  if (count !== 1) {
    console.error(`FAIL: expected 1 match, found ${count}`);
    console.error('--- from ---\n' + from.slice(0, 400) + '\n---');
    failed = true;
    continue;
  }
  content = content.replace(from, to);
}
if (!failed) {
  fs.writeFileSync(abs, content, 'utf8');
  console.log('OK: LoadFormView.jsx');
}
process.exit(failed ? 1 : 0);
