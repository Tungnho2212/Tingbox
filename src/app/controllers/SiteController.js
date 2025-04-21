const Transaction = require('../models/Transaction');
const { mutipleMongooseToObject } = require('../../util/mongoose');

class SiteController {
    // [GET] /
    async index(req, res) {
        try {
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);

            // Truy vấn giao dịch 30 ngày để vẽ biểu đồ
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
                {
                    $match: {
                        transaction_date_obj: { $gte: startDate, $lte: endDate }
                    }
                },
                { $sort: { transaction_date_obj: 1 } } // Sắp xếp theo thời gian tăng dần
            ]);

            // Dữ liệu cho biểu đồ
            const labels = transactions.map(t => t.transaction_date);
            const dataIn = transactions.map(t => t.amount_in || 0);
            const dataOut = transactions.map(t => t.amount_out || 0);

            // Tính số dư (balance)
            let balance = [];
            let currentBalance = 0;
            transactions.forEach(t => {
                currentBalance += (t.amount_in || 0) - (t.amount_out || 0);
                balance.push(currentBalance);
            });

            // 👉 **Truy vấn danh sách giao dịch trong 3 ngày gần nhất**
            const startRecentDate = new Date();
            startRecentDate.setDate(endDate.getDate() - 3); // Lấy từ 3 ngày trước đến hôm nay
            startRecentDate.setHours(0, 0, 0, 0);

            let recentTransactions = await Transaction.aggregate([
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
                {
                    $match: {
                        transaction_date_obj: { $gte: startRecentDate, $lte: endDate }
                    }
                },
                { $sort: { transaction_date_obj: -1 } } // Sắp xếp mới nhất trước
            ]);

            res.render('home', {
                transactions: recentTransactions, // Chỉ lấy  3 ngày gần nhất để hiển thị
                labels: JSON.stringify(labels),
                dataIn: JSON.stringify(dataIn),
                dataOut: JSON.stringify(dataOut),
                balance: JSON.stringify(balance)
            });

        } catch (err) {
            res.status(500).send('Lỗi truy vấn dữ liệu: ' + err.message);
        }
    }
}

module.exports = new SiteController();
