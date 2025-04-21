const Transaction = require('../models/Transaction');
const { mongooseToObject } = require('../../util/mongoose');

class TransactionController {
    async getTransactions(req, res) {
        try {
            let { filter } = req.query; // Lấy filter từ query string (tuần, tháng, năm, tất cả)

            let startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            let endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            if (filter === "week") {
                const firstDayOfWeek = new Date();
                firstDayOfWeek.setDate(startDate.getDate() - startDate.getDay() + 1);
                firstDayOfWeek.setHours(0, 0, 0, 0);
                startDate = firstDayOfWeek;
            } else if (filter === "month") {
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else if (filter === "year") {
                startDate.setMonth(0, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else if (filter === "all") {
                startDate = null; // Không giới hạn ngày
                endDate.setHours(23, 59, 59, 999);
            } else {
                startDate.setDate(endDate.getDate() - 3);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            }

            let matchCondition = {};
            if (startDate) {
                matchCondition.transaction_date_obj = { $gte: startDate, $lte: endDate };
            }

            let transactions = await Transaction.aggregate([
                {
                    $addFields: {
                        transaction_date_obj: {
                            $dateFromString: {
                                dateString: "$transaction_date",
                                format: "%Y-%m-%d %H:%M:%S"
                            }
                        }
                    }
                },
                { $match: matchCondition },
                { $sort: { transaction_date_obj: -1 } }
            ]);

            let chartData = await Transaction.aggregate([
                {
                    $addFields: {
                        transaction_date_obj: {
                            $dateFromString: {
                                dateString: "$transaction_date",
                                format: "%Y-%m-%d %H:%M:%S"
                            }
                        }
                    }
                },
                { $match: matchCondition },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$transaction_date_obj" } },
                        total_in: { $sum: "$amount_in" },
                        total_out: { $sum: "$amount_out" }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            res.render('truyvandate', { transactions, chartData: JSON.stringify(chartData), filter });
        } catch (err) {
            res.status(500).send('Lỗi truy vấn dữ liệu: ' + err.message);
        }
    }

    async getTransactionsByDate(req, res) {
        try {
            let { start, end } = req.query;

            // Nếu không có ngày được chọn, hiển thị form
            if (!start || !end) {
                return res.render('date-filter', { transactions: [], start: "", end: "", totalIn: 0, totalOut: 0 });
            }

            let startDate = new Date(start);
            startDate.setHours(0, 0, 0, 0);

            let endDate = new Date(end);
            endDate.setHours(23, 59, 59, 999);

            let transactions = await Transaction.aggregate([
                {
                    $addFields: {
                        transaction_date_obj: { $dateFromString: { dateString: "$transaction_date", format: "%Y-%m-%d %H:%M:%S" } }
                    }
                },
                {
                    $match: {
                        transaction_date_obj: { $gte: startDate, $lte: endDate }
                    }
                },
                { $sort: { transaction_date_obj: -1 } }
            ]);

            // Tính tổng tiền vào & ra
            let totalIn = transactions.reduce((sum, t) => sum + (t.amount_in || 0), 0);
            let totalOut = transactions.reduce((sum, t) => sum + (t.amount_out || 0), 0);

            res.render('date-filter', { transactions, start, end, totalIn, totalOut });
        } catch (err) {
            res.status(500).send("Lỗi truy vấn dữ liệu: " + err.message);
        }
    }



}

module.exports = new TransactionController();
