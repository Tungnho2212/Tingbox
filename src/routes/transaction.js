const express = require('express');
const router = express.Router();
const Transaction = require('../app/models/Transaction')
const TransactionController = require('../app/controllers/TransactionController');


router.post("/save-transaction", async (req, res) => {
    try {
        const { id, transaction_date, account_number, amount_in, amount_out, bank_brand_name, transaction_content } = req.body;

        const existingTransaction = await Transaction.findOne({ id });
        if (existingTransaction) {
            return res.status(200).json({ message: "⚠️ Giao dịch đã tồn tại" });
        }
        const newTransaction = new Transaction({
            id,
            transaction_date,
            account_number,
            amount_in,
            amount_out,           // 🆕 Lưu amount_out
            bank_brand_name,      // 🆕 Lưu bank_brand_name
            transaction_content
        });

        await newTransaction.save();
        res.status(201).json({ message: "✅ Giao dịch đã lưu", transaction: newTransaction });
    } catch (error) {
        res.status(500).json({ message: "❌ Lỗi server", error });
    }
});
router.get('/truyvan', TransactionController.getTransactions);
router.get('/date-filter', TransactionController.getTransactionsByDate);
module.exports = router;
