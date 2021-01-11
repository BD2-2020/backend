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

app.post('/api/world', (req, res) => {
  console.log(req.body);
  res.send(
    `I received your POST request. This is what you sent me: ${req.body.post}`,
  );
});

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

app.get('/api/available_cars', (req, res) => {
    client.query('SELECT "PRODUCTION_YEAR", "CAR_MODEL_ID", "CAR_BRAND_ID", "CAR_CLASS_ID" FROM "CAR" ' +
        'JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID" WHERE "CAR"."ID" NOT IN (SELECT "CAR_ID" FROM "CAR_STATUS");', (err, qres) => {
        if (err) {
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

app.post('/api/add_employee', (req, res) => {
    const employee = req.body;
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

});

app.post('/api/add_customer', (req, res) => {
    const customer = req.body;
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
            const now = new Date();
            const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
            const q = 'INSERT INTO "CUSTOMER" ("ID", "PASSWORD", "FIRST_NAME", "LAST_NAME", "PESEL", "LICENSE_NO", "REGISTEREDAT", "ADDRESS_ID") ' +
                insertValuesString([customer.email, customer.password, customer.firstName, customer.lastName, 
                    customer.PESEL, customer.licenseNumber, date, addressID]);
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

app.listen(port, () => console.log(`Listening on port ${port}`));