function formatDate(name) {
    return 'TO_CHAR("' + name + '", \'YYYY-MM-DD\') AS "' + name + '"';
}

function date() {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

module.exports.get_avail_cars = function(client, req, res) {
    client.query(
        `SELECT "CAR"."ID", "PRODUCTION_YEAR", "CAR_MODEL_ID", "CAR_BRAND_ID", "CAR_CLASS_ID" FROM "CAR"
        JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID" 
        WHERE "CAR"."ID" NOT IN (
            SELECT "CAR_ID" FROM "RESERVATION" 
            WHERE ("START_DATE" <= $1 AND "END_DATE" >= $1)
                OR ("START_DATE" >= $1 AND "END_DATE" <= $2)
        );`,
        [req.params['from'], req.params['to']]
    ).then((qres) => {
        res.send({message: qres.rows});
    });
};

module.exports.add_reservation = function(client, req, res) {
    const reservation = req.body;

    client.query(
        `INSERT INTO "RESERVATION" ("CREATED_AT", "START_DATE", "END_DATE", "PRICE", "EXPIRES", "CUSTOMER_ID", "CAR_ID")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [date(), reservation.startDate, reservation.endDate, reservation.price, 
         reservation.endDate, reservation.customerID, reservation.carID]
    ).then(() => {
        res.send({message: 'Success'});
    });
};

module.exports.add_rental = function(client, req, res) {
    const reservationID = req.body.ID;
    const rentalStart = req.body.startDate;
    let reservation;

    client.query(
        `SELECT ${formatDate("END_DATE")}, "PRICE", "CUSTOMER_ID", "CAR_ID" FROM "RESERVATION" WHERE "ID" = $1;`,
        [reservationID]
    ).then((qres) => {
        reservation = qres.rows[0];
        return client.query(
            `INSERT INTO "RENTAL" ("CREATED_AT", "START_DATE", "END_DATE", "PRICE", "CUSTOMER_ID")
             VALUES($1, $2, $3, $4, $5)`,
            [date(), rentalStart, reservation['END_DATE'], reservation['PRICE'], reservation['CUSTOMER_ID']]
        );
    }).then(() => {
        return client.query('SELECT MAX("ID") FROM "RENTAL";');
    }).then((qres) => {
        const rentalID = qres.rows[0]['max'];
        return client.query(
            'UPDATE "CAR" SET "RENTAL_ID" = $1 WHERE "ID" = $2;',
            [rentalID, reservation['CAR_ID']]
        );
    }).then(() => {
        return client.query(
            `INSERT INTO "RESERVATION_STATUS" ("STATUS", "RESERVATION_ID") VALUES($1, $2)`,
            ['Wypozyczone', reservationID]
        );
    }).then(() => {
        res.send({message: 'Success'});
    });
};

module.exports.get_reservation = function(client, req, res) {
    client.query(
        `SELECT "CAR_MODEL_ID", "CAR_BRAND_ID", "RESERVATION"."ID", ${formatDate("START_DATE")}, 
            ${formatDate("END_DATE")}, "PRICE" FROM "CAR"
        JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID"
        JOIN "RESERVATION" ON "CAR"."ID" = "RESERVATION"."CAR_ID"
        WHERE "CUSTOMER_ID" = $1 AND "RESERVATION"."ID" NOT IN
        (SELECT "RESERVATION_ID" FROM "RESERVATION_STATUS" WHERE "STATUS" = \'Wypozyczone\');`, 
        [req.params['id']]
    ).then((qres) => {
        res.send({message: qres.rows});
    });
};

module.exports.get_rental = function(client, req, res) {
    client.query(
        `SELECT "CAR_MODEL_ID", "CAR_BRAND_ID", "RENTAL"."ID",
            ${formatDate("START_DATE")}, ${formatDate("END_DATE")}, "PRICE"
        FROM "CAR"
        JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID"
        JOIN "RENTAL" ON "CAR"."RENTAL_ID" = "RENTAL"."ID" 
        WHERE "CUSTOMER_ID" = $1;`, [req.params['id']]
    ).then((qres) => {
        res.send({message: qres.rows});
    });
};

module.exports.end_rental = function(client, req, res) {
    client.query(
        'UPDATE "RENTAL" SET "END_DATE" = $1 WHERE "ID" = $2;',
        [req.body.endDate, req.body.ID]
    ).then(() => {
        res.send({message: 'Success'});
    });
};

module.exports.cancel_reservation = function(client, req, res) {
    client.query(
        'DELETE FROM "RESERVATION" WHERE "ID" = $1;',
        [req.body.ID]
    ).then(() => {
        res.send({message: 'Success'});
    });
};
