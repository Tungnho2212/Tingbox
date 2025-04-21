const siteRouter = require('./site');
const transactionRouter = require('./transaction');
const userRouter = require('./user');

function route(app) {
    app.use('/site', siteRouter);
    app.use('/transaction', transactionRouter);
    app.use('/', userRouter);
}

module.exports = route;
