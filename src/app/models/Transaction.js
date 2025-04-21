const mongoose = require('mongoose');
const { Double } = require('mongoose/lib/schema/index');

const TransactionSchema = new mongoose.Schema({
    id: String,
    transaction_date: String,
    account_number: String,
    amount_in: Double,
    amount_out: Double,
    bank_brand_name: String,
    transaction_content: String,
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = Transaction;
