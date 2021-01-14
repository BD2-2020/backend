const express = require('express');
const bodyParser = require('body-parser');
const { Pool, Client } = require('pg');

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

const app = express();
const port = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function formatDate(name) {
    return 'TO_CHAR("' + name + '", \'YYYY-MM-DD\') AS "' + name + '"';
}

app.get('/api/brands', (req, res) => {
    client.query('SELECT "ID" FROM "CAR_BRAND";', (err, qres) => {
        if (err) {
            res.send({message: null})
            console.log(err);
            return;
        }
        let brands = new Array();
        for (let i = 0; i < qres.rows.length; ++i) {
            brands.push(qres.rows[i]['ID']);
        }
        res.send({message: brands});
    });
});

app.get('/api/models/:id', (req, res) => {
    client.query('SELECT "ID" FROM "CAR_MODEL" WHERE "CAR_BRAND_ID" = \'' + req.params['id'] + '\';', (err, qres) => {
        if (err) {
            res.send({message: []});
            console.log(err);
            return;
        }
        let models = new Array();
        for (let i = 0; i < qres.rows.length; ++i) {
            models.push(qres.rows[i]['ID']);
        }
        res.send({message: models});
    });
});

app.get('/api/cars', (req, res) => {
    client.query('SELECT "CAR"."ID", "PRODUCTION_YEAR", "NUMBER_PLATE", "CAR_MODEL_ID", "CAR_BRAND_ID" FROM "CAR" ' +
        'JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID";', (err, qres) => {
        if (err) {
            res.send({message: []});
            return;
        }
        res.send({message: qres.rows});
    });
});

app.get('/api/available_cars/:from/:to', (req, res) => {
    const q = 'SELECT "CAR"."ID", "PRODUCTION_YEAR", "CAR_MODEL_ID", "CAR_BRAND_ID", "CAR_CLASS_ID" FROM "CAR" ' +
    'JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID" WHERE "RESERVATION_ID" ISNULL OR "RESERVATION_ID" NOT IN ' + 
    '(SELECT "ID" FROM "RESERVATION" WHERE ("START_DATE" <= \'' + req.params['from'] + '\' AND "END_DATE" >= \'' + req.params['from'] + '\') ' + 
    ' OR ("START_DATE" >= \'' + req.params['from'] + '\' AND "END_DATE" <= \'' + req.params['to'] + '\'));';
    console.log(q);
    client.query(q, 
        (err, qres) => {
            if (err) {
                console.log(err);
                res.send({message: []});
                return;
            }
            res.send({message: qres.rows});
    });
});

function insertValuesString(values) {
    var str = 'VALUES (';
    for (const value of values) {
        str += '\'' + value + '\', ';
    }
    return str.substring(0, str.length - 2) + ');';
}

app.post('/api/add_car', (req, res) => {
    const q = 'INSERT INTO "CAR" ("ID", "PRODUCTION_YEAR", "NUMBER_PLATE", "CAR_MODEL_ID") ' + 
        insertValuesString([req.body.VIN, req.body.year, req.body.numberPlate, req.body.model]);
    console.log(q);
    client.query(q, (err, qres) => {
        if (err) {
            res.send({message: 'Error'});
            console.log(err);
            return;
        }
        res.send({message: 'Success'});
    });
});

app.post('/api/remove_car', (req, res) => {
    const q = 'DELETE FROM "CAR" WHERE "ID" = \'' + req.body.VIN + '\';'
    console.log(q);
    client.query(q, (err, qres) => {
        if (err) {
            res.send({message: 'Error'});
            console.log(err);
            return;
        }
        res.send({message: 'Success'});
    });
});

app.get('/api/roles', (req, res) => {
    const q = 'SELECT "ID", "NAME" FROM "ROLE";';
    client.query(q, (err, qres) => {
        if (err) {
            res.send({message: null});
            console.log(err);
            return;
        }
        let roles = new Array();
        for (let i = 0; i < qres.rows.length; ++i) {
            roles.push({
                id: qres.rows[i]["ID"],
                name: qres.rows[i]["NAME"],
            });
        }
        res.send({message: roles});
    });
});

async function isEmailRegistered(email) {
    const rows = await client.query('SELECT "ID" FROM "EMPLOYEE" UNION SELECT "ID" FROM "CUSTOMER";');
    return rows.length !== 0;
}

app.post('/api/add_employee', (req, res) => {
    const employee = req.body;
    isEmailRegistered(employee.email).then((isRegistered) => {
        if (!isRegistered) {
            const address = 'INSERT INTO "ADDRESS" ("ADDRESS1", "ADDRESS2", "POSTAL_CODE", "CITY") ' + 
                insertValuesString([employee.address1, employee.address2, employee.postalCode, employee.city]);
            console.log(address);
            client.query(address, (err, qres) => {
                if (err) {
                    res.send({message: 'Error'});
                    console.log(err);
                    return;
                }
                client.query('SELECT "ID" FROM "ADDRESS" WHERE "ID"=(SELECT MAX("ID") FROM "ADDRESS");', (err, qres) => {
                    if (err) {
                        res.send({message: 'Error'});
                        console.log(err);
                        return;
                    }
                    const addressID = qres.rows[0]["ID"];
                    const q = 'INSERT INTO "EMPLOYEE" ("ID", "PASSWORD", "FIRST_NAME", "LAST_NAME", "PESEL", "SALARY", "ACCOUNT_NO", "ADDRESS_ID") ' +
                        insertValuesString([employee.email, employee.password, employee.firstName, employee.lastName, 
                            employee.PESEL, employee.salary, employee.accountNumber, addressID]);
                    console.log(q);
                    client.query(q, (err, qres) => {
                        if (err) {
                            res.send({message: 'Error'});
                            console.log(err);
                            return;
                        }
                        client.query('INSERT INTO "EMPLOYEE_ROLE" ("ROLE_ID", "EMPLOYEE_ID") ' + insertValuesString([employee.role.id, employee.email]), (err, qres) => {
                            if (err) {
                                res.send({message: 'Error'});
                                console.log(err);
                                return;
                            }
                            res.send({message: 'Success'});
                        })
                    });
        
                });
            });
        } else {
            res.send({mesage: 'Error'});
        }
    })

});

function date() {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

app.post('/api/add_customer', (req, res) => {
    const customer = req.body;
    isEmailRegistered(customer.email).then((isRegistered) => {
        if (!isRegistered) {
            const address = 'INSERT INTO "ADDRESS" ("ADDRESS1", "ADDRESS2", "POSTAL_CODE", "CITY") ' + 
                insertValuesString([customer.address1, customer.address2, customer.postalCode, customer.city]);
            console.log(address);
            client.query(address, (err, qres) => {
                if (err) {
                    res.send({message: 'Error'});
                    console.log(err);
                    return;
                }
                client.query('SELECT "ID" FROM "ADDRESS" WHERE "ID"=(SELECT MAX("ID") FROM "ADDRESS");', (err, qres) => {
                    if (err) {
                        res.send({message: 'Error'});
                        console.log(err);
                        return;
                    }
                    const addressID = qres.rows[0]["ID"];
                    const q = 'INSERT INTO "CUSTOMER" ("ID", "PASSWORD", "FIRST_NAME", "LAST_NAME", "PESEL", "LICENSE_NO", "REGISTEREDAT", "ADDRESS_ID") ' +
                        insertValuesString([customer.email, customer.password, customer.firstName, customer.lastName, 
                            customer.PESEL, customer.licenseNumber, date(), addressID]);
                    console.log(q);
                    client.query(q, (err, qres) => {
                        if (err) {
                            res.send({message: 'Error'});
                            console.log(err);
                            return;
                        }
                        res.send({message: 'Success'});
                    });
                });
            });
        } else {
            res.send({mesage: 'Error'});
        }
    })
});

app.get('/api/classes', (req, res) => {
    client.query('SELECT "ID", "CLASS", "PRICE" FROM "CAR_CLASS";', (err, qres) => {
        if (err) {
            res.send({message: []});
            console.log(err);
            return;
        }
        res.send({message: qres.rows});
    });
});

app.post('/api/login', (req, res) => {
    const info = req.body;
    client.query('SELECT "ID" FROM "CUSTOMER" WHERE "ID" = \'' + info.email + '\' AND "PASSWORD" = \'' + info.password + '\';', (err, qres) => {
        if (err) {
            res.send({message: null});
            console.log(err);
            return;
        }
        if (qres.rows.length === 1) {
            res.send({message: {
                email: qres.rows[0]['ID'],
                type: 'customer',
            }});
        } else {
            client.query('SELECT "ID" FROM "EMPLOYEE" WHERE "ID" = \'' + info.email + '\' AND "PASSWORD" = \'' + info.password + '\';', (err, qres) => {
                if (err) {
                    res.send({message: null});
                    console.log(err);
                    return;
                }
                if (qres.rows.length === 1) {
                    const id = qres.rows[0]['ID'];
                    client.query('SELECT * FROM "EMPLOYEE_ROLE" WHERE "EMPLOYEE_ID" = \'' + id + '\' AND ' + 
                    '"ROLE_ID" IN (SELECT "ID" FROM "ROLE" WHERE "NAME" = \'Administrator\');', (err, qres) => {
                        if (err) {
                            res.send({message: null});
                            console.log(err);
                            return;
                        }
                        if (qres.rows.length > 0) {
                            res.send({message: {
                                email: id,
                                type: 'admin',
                            }});
                        } else {
                            res.send({message: {
                                email: id,
                                type: 'worker',
                            }});
                        }
                    });
                } else {
                    res.send({message: null});
                }
            });
        }
    });
});

app.post('/api/add_reservation', (req, res) => {
    const reservation = req.body;
    client.query('INSERT INTO "RESERVATION" ("CREATED_AT", "START_DATE", "END_DATE", "PRICE", "EXPIRES", "CUSTOMER_ID") ' +
        insertValuesString([date(), reservation.startDate, reservation.endDate, reservation.price, reservation.endDate, reservation.customerID]), (err, qres) => {
            if (err) {
                res.send({message: 'Error'});
                console.log(err);
                return;
            }
            client.query('SELECT MAX("ID") FROM "RESERVATION";', (err, qres) => {
                if (err || qres.rows.length === 0) {
                    res.send({message: 'Error'});
                    console.log(err);
                    return;
                }
                const reservationID = qres.rows[0]["max"];
                const q = 'UPDATE "CAR" SET "RESERVATION_ID" = \'' + reservationID + '\' WHERE "ID" = \'' + reservation.carID + '\';'
                console.log(q);
                client.query(q, (err, qres) => {
                    if (err) {
                        res.send({message: 'Error'});
                        console.log(err);
                        return;
                    }
                        res.send({message: 'Success'});
                });
            });
        });
});

app.post('/api/add_rental', (req, res) => {
    const reservationID = req.body.ID;
    const rentalStart = req.body.startDate;
    const q = 'SELECT ' + formatDate("END_DATE") + ', "PRICE", "CUSTOMER_ID" FROM "RESERVATION" WHERE "ID" = \'' + reservationID + '\';';
    console.log(q);
    client.query(q, (err, qres) => {
        if (err || qres.length === 0) {
            res.send({message: 'Error'});
            console.log(err);
            return;
        }
        const reservation = qres.rows[0];
        const q = 'INSERT INTO "RENTAL" ("CREATED_AT", "START_DATE", "END_DATE", "PRICE", "CUSTOMER_ID") ' + 
        insertValuesString([date(), rentalStart, reservation['END_DATE'], reservation['PRICE'], reservation['CUSTOMER_ID']]);
        console.log(q);
        client.query(q, (err, qres) => {
                if (err) {
                    res.send({message: 'Error'});
                    console.log(err);
                    return;
                }
                client.query('SELECT MAX("ID") FROM "RENTAL";', (err, qres) => {
                    if (err || qres.rows.length === 0) {
                        res.send({message: 'Error'});
                        console.log(err);
                        return;
                    }
                    const rentalID = qres.rows[0]['max'];
                    client.query('UPDATE "CAR" SET "RENTAL_ID" = \'' + rentalID + '\' WHERE "RESERVATION_ID" = \'' + reservationID + '\';', (err, qres) => {
                        if (err) {
                            res.send({message: 'Error'});
                            console.log(err);
                            return;
                        }
                            res.send({message: 'Success'});
                    });
                });
            });
    });
});

app.get('/api/reservations/:id', (req, res) => {
    const q = 'SELECT "CAR_MODEL_ID", "CAR_BRAND_ID", "RESERVATION"."ID", ' + formatDate("START_DATE") + ', ' + 
    formatDate("END_DATE") + ', "PRICE" FROM "CAR" ' +
    'JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID" ' + 
    'JOIN "RESERVATION" ON "CAR"."RESERVATION_ID" = "RESERVATION"."ID" ' + 
    'WHERE "CUSTOMER_ID" = \'' + req.params['id'] + '\' AND "RENTAL_ID" ISNULL;';
    console.log(q);
    client.query(q, (err, qres) => {
            if (err) {
                res.send({message: null});
                console.log(err);
                return;
            }
            res.send ({message: qres.rows});
        });
});

app.get('/api/rentals/:id', (req, res) => {
    client.query('SELECT "CAR_MODEL_ID", "CAR_BRAND_ID", "RENTAL"."ID", ' + formatDate("START_DATE") + ', ' + 
    formatDate("END_DATE") + ', "PRICE" FROM "CAR" ' +
        'JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID" ' + 
        'JOIN "RENTAL" ON "CAR"."RENTAL_ID" = "RENTAL"."ID" ' + 
        'WHERE "CUSTOMER_ID" = \'' + req.params['id'] + '\';', (err, qres) => {
            if (err) {
                res.send({message: null});
                console.log(err);
                return;
            }
            res.send({message: qres.rows});
        });
});

app.post('/api/end_rental', (req, res) => {
    client.query('UPDATE "RENTAL" SET "END_DATE" = \'' + req.body.endDate + '\' WHERE "ID" = \'' + req.body.ID + '\';', (err, qres) => {
        if (err) {
            res.send({message: 'Error'});
            console.log(err);
            return;
        }
        res.send({message: 'Success'});
    });
});

app.post('/api/cancel_reservation', (req, res) => {
    client.query('DELETE FROM "RESERVATION" WHERE "ID" = \'' + req.body.ID + '\';'), (err, qres) => {
        if (err) {
            res.send({message: 'Error'});
            console.log(err);
            return;
        }
        res.send({message: 'Success'});
    }
});



app.listen(port, () => console.log(`Listening on port ${port}`));