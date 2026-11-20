const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
};

export function buildInventoryValuationRows({
    data,
    beforeDate,
    userStores = [],
    selectedStores = [],
    productId,
    products = [],
    customers = [],
    stores = [],
    locations = [],
}) {
    if (!data || data.length === 0) return [];

    const loginVendor = { Store: Array.isArray(userStores) ? userStores : [] };
    const slectedStore = Array.isArray(selectedStores) ? selectedStores : [];
    const selectedProduct = productId;
    const allProduct = products;
    const Cust = customers;
    const storeforDrp = stores;
    const Location = locations;

    let totalOpeningBox = 0;
    let totalPerBoxCost = 0;
    let totalBalanceCost = 0;
    const openingRecord = data.filter(item => item.hasOwnProperty('opneingQty'));
    const openingPurchase = data.filter(item => item.hasOwnProperty(`totalPurchaseBoxBefore`)) ?? []
    const openingSale = data.filter(item => item.hasOwnProperty(`totalSaleBoxBefore`)) ?? []
    const OpeningfomBox = data.filter(item => item.hasOwnProperty(`BeforefromValue`)) ?? []
    const OpeningRomTo = data.filter(item => item.hasOwnProperty(`BeforeToValue`)) ?? []
    const openingTrnsferOut = data.filter(item => item.hasOwnProperty(`TransferOutBoxesBefore`)) ?? []
    const openingTrnsferIn = data.filter(item => item.hasOwnProperty(`TransferInBoxesBefore`)) ?? []
    const OpeningSalesReturn = data.filter((item) => item.hasOwnProperty(`totalReturnBoxBefore`)) ?? []
    const opneingStockReplace = data.filter((item) => item.hasOwnProperty(`totalBoxesToReplacementBefore`)) ?? []
    const openingPurchaseReturnBox = data.filter((item) => item.hasOwnProperty('totalPurchaseReturnBoxBefore')) ?? []
    const totalDCBoxBefore = data.filter((item) => item.hasOwnProperty('totalDCBoxBefore')) ?? []
    const totalOpening = openingRecord.concat(openingPurchase).concat(openingSale).concat(OpeningfomBox).concat(OpeningRomTo).concat(openingTrnsferOut).concat(openingTrnsferIn).concat(OpeningSalesReturn).concat(opneingStockReplace).concat(openingPurchaseReturnBox).concat(totalDCBoxBefore)
    const sortedbydate = totalOpening.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return -1;
        if (!b.date) return 1;
        return new Date(a.date) - new Date(b.date);
    });

    sortedbydate.reduce((acc, obj) => {
        const open = parseFloat(obj.opneingQty) || 0;
        const openValue = parseFloat(obj.opneingQtyValueExclGst) || 0;
        const sale = parseFloat(obj.totalSaleBoxBefore) || 0;
        const purchase = parseFloat(obj.totalPurchaseBoxBefore) || 0;
        const salesReturn = parseFloat(obj.totalReturnBoxBefore) || 0;
        const purchaseReturn = parseFloat(obj.totalPurchaseReturnBoxBefore) || 0;
        const TransferOutBoxesBefore = parseFloat(obj.TransferOutBoxesBefore) || 0;
        const TransferInBoxesBefore = parseFloat(obj.TransferInBoxesBefore) || 0;
        const TotalDCBoxBefore = parseFloat(obj.totalDCBoxBefore || 0) || 0;
        const TransferInValue = parseFloat(obj.TransferInAmountBefore) || 0;
        const purchaseValue = parseFloat(obj.totalPurchaseValueExclGst) || 0;
        const SalesReturnValue = parseFloat(obj.TotalSRValueExclGstBefore) || 0;
        const stockReplacement = parseFloat(obj.totalBoxesToReplacementBefore) || 0;

        if ("opneingQty" in obj) {
            totalOpeningBox += open;
            totalPerBoxCost = openValue;
            totalBalanceCost = totalOpeningBox * totalPerBoxCost;
        }

        if ("totalSaleBoxBefore" in obj) {
            let StoreAllow = loginVendor.Store.find((item) => item == obj.Store)
            if (!StoreAllow) return;
            totalOpeningBox -= sale;
            totalBalanceCost -= sale * totalPerBoxCost;
        }

        if ("totalValueToReplacementBefore" in obj) {
            let StoreAllow = loginVendor.Store.find((item) => item == obj.Store)
            if (!StoreAllow) return;
            totalOpeningBox -= stockReplacement;
            totalBalanceCost -= stockReplacement * totalPerBoxCost;
        }

        if ("TransferOutBoxesBefore" in obj) {
            const StoreAllow = slectedStore.find((item) => item == obj.StoreFrom)
            if (!StoreAllow) return;
            totalOpeningBox -= TransferOutBoxesBefore;
            totalBalanceCost -= TransferOutBoxesBefore * totalPerBoxCost;
        }
        if ("totalDCBoxBefore" in obj) {
            totalOpeningBox -= TotalDCBoxBefore;
            totalBalanceCost -= TotalDCBoxBefore * totalPerBoxCost;
        }

        if ("totalPurchaseReturnBoxBefore" in obj) {
            totalOpeningBox -= purchaseReturn;
            totalBalanceCost -= purchaseReturn * totalPerBoxCost;
        }

        if ("totalPurchaseBoxBefore" in obj) {
            let StoreAllow = loginVendor.Store.find((item) => item == obj.Store)
            if (!StoreAllow) return;
            totalOpeningBox += purchase;
            totalBalanceCost += purchaseValue;
            totalPerBoxCost = totalOpeningBox > 0 ? totalBalanceCost / totalOpeningBox : 0;
        }
        if ("totalReturnBoxBefore" in obj) {
            let StoreAllow = loginVendor.Store.find((item) => item == obj.Store)
            if (!StoreAllow) return;
            totalOpeningBox += salesReturn;
            totalBalanceCost += SalesReturnValue;
            totalPerBoxCost = totalOpeningBox > 0 ? totalBalanceCost / totalOpeningBox : 0;
        }

        if ("TransferInBoxesBefore" in obj) {
            const StoreAllow = slectedStore.find((item) => item == obj.StoreTo)
            if (!StoreAllow) return;

            totalOpeningBox += TransferInBoxesBefore;
            totalBalanceCost += TransferInValue;
            totalPerBoxCost = totalOpeningBox > 0 ? totalBalanceCost / totalOpeningBox : 0;
        }

        return acc + (open + purchase + salesReturn + TransferInBoxesBefore) - (sale + TransferOutBoxesBefore + stockReplacement);

    }, 0);

    const transactions = data
        .filter(item => item.type == 'Purchase' || item.type == 'Issue' || item.type == `TransferIn` || item.type == `TransferOut` || item.type == "Return" || item.type == "StockReplacement" || item.type == "PurchaseReturn" || item.type == "StockAdjustment")
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const rows = [];

    let currentBalanceQty = totalOpeningBox;
    let currentBalanceCost = totalOpeningBox * totalPerBoxCost;
    let currentperBox = totalPerBoxCost
    rows.push({
        id: 0,
        seq: 0,
        date: formatDate(beforeDate),
        type: 'Opening',
        quantity: totalOpeningBox,
        perBoxCost: parseFloat(totalPerBoxCost).toFixed(5),
        totalCost: (parseFloat(totalPerBoxCost) * totalOpeningBox).toFixed(5),
        balanceQty: totalOpeningBox,
        balanceCost: (parseFloat(totalPerBoxCost) * totalOpeningBox).toFixed(5),
        avgCostPerBox: parseFloat(totalPerBoxCost).toFixed(5),
    });
    currentBalanceQty = totalOpeningBox;
    currentBalanceCost = totalOpeningBox * totalPerBoxCost;
    currentperBox = parseFloat(totalPerBoxCost).toFixed(5)

    transactions.forEach((transaction, index) => {
        const productName = allProduct.find(item => item._id === selectedProduct)?.ProductName;
        const cus = Cust.find((item) => item._id == transaction.Client)
        if (transaction.type === "Purchase") {
            const qty = transaction.totalPurchaseBox;
            const cost = parseFloat(transaction.totalPurchaseValueExclGst);
            const perBoxCost = (cost / qty).toFixed(4);

            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: productName,
                SalesFlowRef: transaction.SalesFlowRef,
                invoice: `Pr${transaction.invoice}`,
                type: "Purchase",
                quantity: qty,
                perBoxCost,
                totalCost: cost.toFixed(5),
                balanceQty: currentBalanceQty += qty,
                balanceCost: (currentBalanceCost + cost).toFixed(5),
                avgCostPerBox: ((currentBalanceCost + cost) / (currentBalanceQty)).toFixed(5),
                Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                location: Location.find((item) => item.value == transaction.LocationFrom)?.label

            });


            currentBalanceCost += cost;
            currentperBox = (currentBalanceCost / currentBalanceQty).toFixed(5);
        }

        else if (transaction.type === "Issue") {
            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: allProduct.find((item1) => item1._id == selectedProduct)?.ProductName,
                SalesFlowRef: transaction.SalesFlowRef,
                Client: (cus && (cus.CutomerName || cus.DistrbutorName)) || "",
                invoice: transaction.invoice
                    ? `SL${transaction.invoice}`
                    : transaction.DCCode
                        ? `DC${transaction.DCCode}`
                        : "-",
                type: transaction.type,
                quantity: Number(transaction.totalSaleBox || transaction.totalDCBox || 0),
                totalCost: ((transaction.totalSaleBox || transaction.totalDCBox) * (currentBalanceCost / currentBalanceQty)).toFixed(5),
                perBoxCost: currentperBox,
                balanceQty: currentBalanceQty - (transaction.totalSaleBox || transaction.totalDCBox || 0),
                balanceCost: parseFloat((currentBalanceQty - Number(transaction.totalSaleBox || transaction.totalDCBox || 0)) * currentperBox).toFixed(5),
                avgCostPerBox: currentperBox,
                Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                location: Location.find((item) => item.value == transaction.LocationFrom)?.label

            });
            currentBalanceQty = currentBalanceQty - (transaction.totalSaleBox || transaction.totalDCBox || 0);
            currentBalanceCost -= parseFloat((Number(transaction.totalSaleBox || transaction.totalDCBox || 0) * currentperBox).toFixed(5));
        }

        else if (transaction.type === "StockReplacement") {
            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: allProduct.find((item1) => item1._id == selectedProduct)?.ProductName,
                SalesFlowRef: transaction.SalesFlowRef,
                invoice: `StockRep${transaction.invoice}`,
                type: transaction.type,
                quantity: parseInt(transaction.totalBoxesReplacementTo),
                totalCost: ((transaction.totalBoxesReplacementTo) * (currentBalanceCost / currentBalanceQty)).toFixed(5),
                perBoxCost: currentperBox,
                balanceQty: currentBalanceQty - transaction.totalBoxesReplacementTo,
                balanceCost: parseFloat((currentBalanceQty - transaction.totalBoxesReplacementTo) * currentperBox).toFixed(5),
                avgCostPerBox: currentperBox,
                Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                location: Location.find((item) => item.value == transaction.LocationFrom)?.label

            });
            currentBalanceQty = currentBalanceQty - transaction.totalBoxesReplacementTo;
            currentBalanceCost -= parseFloat((transaction.totalBoxesReplacementTo * currentperBox).toFixed(5));
        }
        else if (transaction.type === "PurchaseReturn") {

            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: allProduct.find((item1) => item1._id == selectedProduct)?.ProductName,
                SalesFlowRef: transaction.SalesFlowRef,
                invoice: `PurchaseReturn${transaction.invoice}`,
                type: transaction.type,
                quantity: parseInt(transaction.totalPurchaseReturnBox),
                totalCost: ((transaction.totalPurchaseReturnBox) * (currentBalanceCost / currentBalanceQty)).toFixed(5),
                perBoxCost: currentperBox,
                balanceQty: currentBalanceQty - transaction.totalPurchaseReturnBox,
                balanceCost: parseFloat((currentBalanceQty - transaction.totalPurchaseReturnBox) * currentperBox).toFixed(5),
                avgCostPerBox: currentperBox,
                Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                location: Location.find((item) => item.value == transaction.LocationFrom)?.label

            });
            currentBalanceQty = currentBalanceQty - transaction.totalPurchaseReturnBox;
            currentBalanceCost -= parseFloat((transaction.totalPurchaseReturnBox * currentperBox).toFixed(5));
        }

        else if (transaction.type === "StockAdjustment") {
            const lessBox = Number(transaction.totalAdjustmentLessBox) || 0;
            const addBox = Number(transaction.totalAdjustmentAddBox) || 0;

            if (lessBox > 0) {
                rows.push({
                    id: index + 1,
                    seq: rows.length,
                    date: formatDate(transaction.date),
                    ProductName: allProduct.find((item1) => item1._id == selectedProduct)?.ProductName,
                    invoice: `Adj Less`,
                    type: "StockAdj Less",
                    quantity: -lessBox,
                    totalCost: (-lessBox * currentperBox).toFixed(5),
                    perBoxCost: currentperBox,
                    balanceQty: currentBalanceQty - lessBox,
                    balanceCost: parseFloat((currentBalanceQty - lessBox) * currentperBox).toFixed(5),
                    avgCostPerBox: currentperBox,
                    Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                    location: Location.find((item) => item.value == transaction.Location)?.label
                });
                currentBalanceQty -= lessBox;
                currentBalanceCost -= parseFloat((lessBox * currentperBox).toFixed(5));
            }

            if (addBox > 0) {
                rows.push({
                    id: index + 1,
                    seq: rows.length,
                    date: formatDate(transaction.date),
                    ProductName: allProduct.find((item1) => item1._id == selectedProduct)?.ProductName,
                    invoice: `Adj Add`,
                    type: "StockAdj Add",
                    quantity: addBox,
                    totalCost: (addBox * currentperBox).toFixed(5),
                    perBoxCost: currentperBox,
                    balanceQty: currentBalanceQty + addBox,
                    balanceCost: parseFloat((currentBalanceQty + addBox) * currentperBox).toFixed(5),
                    avgCostPerBox: currentperBox,
                    Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                    location: Location.find((item) => item.value == transaction.Location)?.label
                });
                currentBalanceQty += addBox;
                currentBalanceCost += parseFloat((addBox * currentperBox).toFixed(5));
            }
        }

        else if (transaction.type == "TransferIn") {
            const StoreAllow = slectedStore.find((item) => item == transaction.StoreTo)
            if (!StoreAllow) return;

            const qty = transaction.totalInBoxes;
            const cost = parseFloat(transaction.TransferInAmount);
            const perBoxCost = (cost / qty).toFixed(4);

            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: productName,
                SalesFlowRef: transaction.SalesFlowRef,
                invoice: `Tr${transaction.TransferCode}`,
                type: "TransferIn",
                quantity: qty,
                perBoxCost,
                totalCost: cost.toFixed(5),
                balanceQty: currentBalanceQty += qty,
                balanceCost: (currentBalanceCost + cost).toFixed(5),
                avgCostPerBox: ((currentBalanceCost + cost) / (currentBalanceQty)).toFixed(5),
                Store: storeforDrp.find((item) => item._id == transaction.StoreTo)?.StoreName,
                location: Location.find((item) => item.value == transaction.LocationFrom)?.label

            });


            currentBalanceCost += cost;
            currentperBox = (currentBalanceCost / currentBalanceQty).toFixed(5);
        }

        else if (transaction.type == "TransferOut") {
            const StoreAllow = slectedStore?.find((item) => item == transaction.StoreFrom)
            if (!StoreAllow) return;
            const qty = transaction.totalOutBoxes;
            const totalCost = qty * currentperBox;


            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: productName,
                SalesFlowRef: transaction.SalesFlowRef,
                invoice: `TrOut${transaction.TransferCode}`,
                type: "Transfer Out",
                quantity: qty,
                perBoxCost: currentperBox,
                totalCost: totalCost.toFixed(5),
                balanceQty: currentBalanceQty -= transaction.totalOutBoxes,
                balanceCost: (currentBalanceCost - parseInt(transaction.TrsferOutGrossAmount)).toFixed(5),
                avgCostPerBox: currentperBox,
                Store: storeforDrp.find((item) => item._id == transaction.StoreFrom)?.StoreName,
                location: Location.find((item) => item.value == transaction.LocationFrom)?.label
            });


            currentBalanceCost -= totalCost;
            currentperBox = currentBalanceQty > 0 ? (currentBalanceCost / currentBalanceQty).toFixed(5) : "0.00000";

        }
        else if (transaction.type == "Return") {
            const qty = transaction.totalReturnBox;
            const cost = parseFloat(transaction.totalValueExclReturnGst);
            const perBoxCost = (cost / qty).toFixed(5);

            rows.push({
                id: index + 1,
                seq: rows.length,
                date: formatDate(transaction.date),
                ProductName: productName,
                SalesFlowRef: transaction.SalesFlowRef,
                invoice: `Sr${transaction.invoice}`,
                type: "SR",
                quantity: qty,
                perBoxCost,
                totalCost: cost.toFixed(5),
                balanceQty: currentBalanceQty += qty,
                balanceCost: (currentBalanceCost + cost).toFixed(5),
                avgCostPerBox: ((currentBalanceCost + cost) / (currentBalanceQty)).toFixed(5),
                Store: storeforDrp.find((item) => item._id == transaction.Store)?.StoreName,
                location: Location.find((item) => item.value == transaction.Location)?.label

            });


            currentBalanceCost += cost;
            currentperBox = (currentBalanceCost / currentBalanceQty).toFixed(5);
        }
    });

    return rows;
}
