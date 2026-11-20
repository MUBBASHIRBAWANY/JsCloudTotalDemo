const fs = require('fs');
const f = 'F:\\JaffarSonsFrontEnd\\src\\Pages\\Reports\\SalesInvoice\\SalesDumpData\\SalesDumpDataPopup.jsx';
let c = fs.readFileSync(f, 'utf8');

// Fix buildExcelTotalsRow - add Zone and Region after City
c = c.replace(
  /"City": "",\s*"OrderBooker": "",\s*"Sales Invoice": "",/g,
  '"City": "",\n    "Zone": "",\n    "Region": "",\n    "OrderBooker": "",\n    "Sales Invoice": "",'
);

// Fix footer - add 2 more empty td after City td (11th td)
// The footer has: Total + 9 empty + then numeric tds
// We need to add 2 more empty tds after the City td position (10th position, 0-indexed 9th empty td)
// Current footer: <td>Total</td> then 9 empty tds then numeric tds
// After adding Zone and Region columns, we need 11 empty tds before numeric tds
const footerPattern = /<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td ><\/td>\s*<td className="numeric">/g;
const replacement = '<td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td ></td>\n                    <td className="numeric">';
c = c.replace(footerPattern, replacement);

// Fix colSpan from 43 to 45
c = c.replace('colSpan="43"', 'colSpan="45"');

fs.writeFileSync(f, c, 'utf8');
console.log('Done - Popup file updated');
