const mongoose = require('mongoose');

async function connect() {
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/transactionsDB', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Đã kết nối MongoDB !!');
    } catch (error) {
        console.log('❌ Lỗi kết nối MongoDB:ngoDB!!!');
    }
}
module.exports = { connect };
