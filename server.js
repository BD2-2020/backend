const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');

const { add_customer, add_employee, login, roles } = require('./services/accounts');
const { get_car_classes, get_cars, add_car, remove_car, get_model_by_id, get_car_brands } = require('./services/car');
const { get_avail_cars, get_reservation, get_rental, 
        add_reservation, add_rental, end_rental, cancel_reservation } = require('./services/rentals');

/*
 * DATABASE CONNECTION
 */
const client = new Client({
    user: 'postgres',
    database: 'postgres',
    password: 'root',
});

client.connect(err => {
    if (err) {
        console.error('connection error', err.stack);
    }
})

/*
 * APP INITIALIZATION
 */
const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/*
 * ACCOUNTS MANAGEMENT
 */
app.get('/api/roles',           (req, res) => { roles(client, req, res) });

app.post('/api/login',          (req, res) => { login(client, req, res) });
app.post('/api/add_employee',   (req, res) => { add_employee(client, req, res) });
app.post('/api/add_customer',   (req, res) => { add_customer(client, req, res) });


/*
 * CAR SERVICE
 */
app.get('/api/classes',         (req, res) => { get_car_classes(client, req, res) });
app.get('/api/brands',          (req, res) => { get_car_brands(client, req, res) });
app.get('/api/cars',            (req, res) => { get_cars(client, req, res) });
app.get('/api/add_car',         (req, res) => { add_car(client, req, res) });
app.get('/api/remove_car',      (req, res) => { remove_car(client, req, res) });
app.get('/api/models/:id',      (req, res) => { get_model_by_id(client, req, res) });


/*
 * RENTALS AND RESERVATION SERVICE
 */
app.get('/api/available_cars/:from/:to',    (req, res) => { get_avail_cars(client, req, res); });
app.get('/api/reservations/:id',            (req, res) => { get_reservation(client, req, res); });
app.get('/api/rentals/:id',                 (req, res) => { get_rental(client, req, res); });

app.post('/api/add_reservation',            (req, res) => { add_reservation(client, req, res); });
app.post('/api/add_rental',                 (req, res) => { add_rental(client, req, res); });
app.post('/api/end_rental',                 (req, res) => { end_rental(client, req, res); });
app.post('/api/cancel_reservation',         (req, res) => { cancel_reservation(client, req, res); });



app.listen(port, () => console.log(`Listening on port ${port}`));
