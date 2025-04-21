const express = require('express');
const morgan = require('morgan');
const handlebars = require('express-handlebars');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const moment = require('moment');
const session = require('express-session');

const route = require('./routes');
const db = require('./config/db');

db.connect();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));

const port = 4000;

app.use(express.static(path.join(__dirname, 'public')));
// app.use(morgan('combined'));
//Template engine
app.engine('hbs', handlebars.engine({
    extname: '.hbs',
    helpers: {
        formatDate: function (dateString) {
            return moment(dateString, "YYYY-MM-DD HH:mm:ss").format("DD/MM/YYYY HH:mm");
        }
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views'));
// Routes init
route(app);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
