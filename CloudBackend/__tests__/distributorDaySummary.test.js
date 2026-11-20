import { isCountedOrder, summarizeDayOrders } from "../utils/distributorDaySummary.js";

const productId = "64b000000000000000000001";
const distributorId = "64b0000000000000000000aa";

describe("summarizeDayOrders", () => {
    test("counts accepted distributor orders and skips a rejected one", () => {
        const summary = summarizeDayOrders({
            date: "2026-10-24",
            orderBookerId: "booker-1",
            orderBookerName: "Ali",
            distributors: [{ _id: distributorId, DistrbutorName: "Karachi Store", DistrbutorSystemCode: "D-12" }],
            products: [{
                _id: productId,
                ProductName: "Oil 500ml",
                code: "P1",
                PcsinBox: "10",
                BoxinCarton: "12",
                GRAM: "0",
            }],
            orders: [
                {
                    _id: "order-1",
                    OrderCode: "000021",
                    PostStatus: "Accept",
                    Distrbutor: distributorId,
                    Remarks: "Morning",
                    OrderData: [{ product: productId, carton: "1", box: "6", Rate: "100", GrossAmount: "1800", Gst: "180", netAmunt: "1980" }],
                },
                {
                    _id: "order-2",
                    OrderCode: "000022",
                    PostStatus: "Reject",
                    Distrbutor: distributorId,
                    OrderData: [{ product: productId, carton: "9", box: "0", Rate: "100", GrossAmount: "9000", Gst: "0", netAmunt: "9000" }],
                },
            ],
        });

        expect(summary.orderBookerName).toBe("Ali");
        expect(summary.customers).toHaveLength(1);
        expect(summary.customers[0]).toMatchObject({
            saleOrderNumber: "000021",
            customerName: "Karachi Store",
            customerCode: "D-12",
            remarks: "Morning",
            net: 1980,
        });
        expect(summary.customers[0].lines[0]).toMatchObject({
            productName: "Oil 500ml",
            carton: 1,
            box: 6,
            units: 180,
            liters: 90,
            kg: 0,
        });
        expect(summary.totals).toMatchObject({
            orders: 1,
            customers: 1,
            net: 1980,
            avgSkuPerBill: 1,
            avgSkuPerOutlet: 1,
        });

        const withVisit = summarizeDayOrders({
            date: "2026-10-24",
            orderBookerId: "booker-1",
            orderBookerName: "Ali",
            distributors: [{ _id: distributorId, DistrbutorName: "Karachi Store", DistrbutorSystemCode: "D-12" }],
            products: [{ _id: productId, ProductName: "Oil 500ml", code: "P1", PcsinBox: "10", BoxinCarton: "12", GRAM: "0" }],
            orders: [
                {
                    _id: "order-1",
                    OrderCode: "000021",
                    PostStatus: "Accept",
                    Distrbutor: distributorId,
                    OrderData: [{ product: productId, carton: "1", box: "0", Rate: "100", GrossAmount: "100", Gst: "0", netAmunt: "100" }],
                },
                {
                    _id: "visit-1",
                    OrderCode: "000023",
                    PostStatus: "Accept",
                    Visit: true,
                    Distrbutor: "64b0000000000000000000bb",
                    OrderData: [],
                },
            ],
        });
        expect(withVisit.totals.orders).toBe(2);
        expect(withVisit.totals.customers).toBe(1);
        expect(isCountedOrder({ PostStatus: "Delivered" })).toBe(true);
        expect(isCountedOrder({ PostStatus: "Cancelled" })).toBe(false);
    });
});
