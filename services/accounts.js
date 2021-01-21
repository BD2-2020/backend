function date() {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

async function isEmailRegistered(client, email) {
    const resp = await client.query(
        `SELECT "ID" FROM "EMPLOYEE" UNION SELECT "ID" FROM "CUSTOMER" WHERE "ID"=$1`, 
        [email]
    );

    return resp.rowCount !== 0;
}

module.exports.add_customer = function(client, req, res) {
    const customer = req.body;

    isEmailRegistered(client, customer.email).then((isRegistered) => {
        if (!isRegistered) {
            client.query(`INSERT INTO "ADDRESS" ("ADDRESS1", "ADDRESS2", "POSTAL_CODE", "CITY") VALUES($1, $2, $3, $4);`,
                        [customer.address1, customer.address2, customer.postalCode,customer.city]
            ).then(() => {
                return client.query('SELECT "ID" FROM "ADDRESS" WHERE "ID"=(SELECT MAX("ID") FROM "ADDRESS");');
            }).then((resp) => {
                const addressID = resp.rows[0]["ID"];
                return client.query(
                        `INSERT INTO "CUSTOMER" ("ID", "PASSWORD", "FIRST_NAME", "LAST_NAME", 
                                                "PESEL", "LICENSE_NO", "REGISTEREDAT", "ADDRESS_ID") 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`, 
                        [customer.email, customer.password, customer.firstName, customer.lastName, 
                        customer.PESEL, customer.licenseNumber, date(), addressID]);
            }).then(() => {
                res.send({message: 'Success'});
            });
        } else {
            res.send({mesage: 'Error'});
        }
    });
};

module.exports.add_employee = function(client, req, res) {
    const employee = req.body;

    const isRegistered = isEmailRegistered(client, employee.email);
    if (!isRegistered) {
        client.query(`INSERT INTO "ADDRESS" ("ADDRESS1", "ADDRESS2", "POSTAL_CODE", "CITY") VALUES($1, $2, $3, $4);`,
                     [employee.address1, employee.address2, employee.postalCode,employee.city]
        ).then(() => {
            return client.query('SELECT "ID" FROM "ADDRESS" WHERE "ID"=(SELECT MAX("ID") FROM "ADDRESS");');
        }).then((resp) => {
            const addressID = resp.rows[0]["ID"];
            return client.query(
                `INSERT INTO "EMPLOYEE" ("ID", "PASSWORD", "FIRST_NAME", "LAST_NAME", 
                                         "PESEL", "SALARY", "ACCOUNT_NO", "ADDRESS_ID") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`, 
                [employee.email, employee.password, employee.firstName, employee.lastName, 
                employee.PESEL, employee.salary, employee.accountNumber, addressID]);
        }).then(() => {
            return client.query(`INSERT INTO "EMPLOYEE_ROLE" ("ROLE_ID", "EMPLOYEE_ID") VALUES($1, $2)`, 
                [employee.role.id, employee.email]);
        }).then(() => {
            res.send({message: 'Success'});
        });
    } else {
        res.send({mesage: 'Error'});
    }
};

module.exports.login = function(client, req, res) {
    const info = req.body;

    client.query('SELECT "ID" FROM "CUSTOMER" WHERE "ID" = $1 AND "PASSWORD" = $2;',
        [info.email, info.password]
    ).then((qres) => {
        if (qres.rows.length === 1) {
            res.send({message: {
                email: qres.rows[0]['ID'],
                type: 'customer',
            }});
        } else {
            client.query('SELECT "ID" FROM "EMPLOYEE" WHERE "ID" = $1 AND "PASSWORD" = $2;',
                [info.email, info.password]
            ).then((qres) => {
                if (qres.rows.length === 1) {
                    const id = qres.rows[0]['ID'];
                    client.query(`
                        SELECT * FROM "EMPLOYEE_ROLE" 
                        WHERE "EMPLOYEE_ID" = $1 AND "ROLE_ID" IN (
                            SELECT "ID" FROM "ROLE" 
                            WHERE "NAME" = \'Administrator\'
                        );`).then((err, qres) => {
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
};

module.exports.roles = function(client, req, res) {
    client.query(
        'SELECT "ID", "NAME" FROM "ROLE";'
    ).then((qres) => {
        let roles = new Array();
        for (let i = 0; i < qres.rows.length; ++i) {
            roles.push({
                id: qres.rows[i]["ID"],
                name: qres.rows[i]["NAME"],
            });
        }
        res.send({message: roles});
    });
};
