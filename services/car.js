module.exports.get_car_classes = function(client, req, res) {
    client.query('SELECT "ID", "CLASS", "PRICE" FROM "CAR_CLASS";', (err, qres) => {
        res.send({message: qres.rows});
    });
}

module.exports.get_car_brands = function(client, req, res) {
    client.query('SELECT "ID" FROM "CAR_BRAND";', (err, qres) => {
        let brands = new Array();
        for (let i = 0; i < qres.rows.length; ++i) {
            brands.push(qres.rows[i]['ID']);
        }
        res.send({message: brands});
    });
}

module.exports.get_cars = function(client, req, res) {
    client.query(
        `SELECT "CAR"."ID", "PRODUCTION_YEAR", "NUMBER_PLATE", 
                "CAR_MODEL_ID", "CAR_BRAND_ID" FROM "CAR" 
         JOIN "CAR_MODEL" ON "CAR"."CAR_MODEL_ID" = "CAR_MODEL"."ID";`
    ).then((qres) => {
        res.send({message: qres.rows});
    });
}

module.exports.add_car = function(client, req, res) {
    client.query(
        `INSERT INTO "CAR" ("ID", "PRODUCTION_YEAR", "NUMBER_PLATE", "CAR_MODEL_ID")
         VALUES ($1, $2, $3, $4)`,
        [req.body.VIN, req.body.year, req.body.numberPlate, req.body.model]
    ).then(() => {
        res.send({message: 'Success'});
    });
}

module.exports.remove_car = function(client, req, res) {
    client.query(
        'DELETE FROM "CAR" WHERE "ID" = $1;',
        [req.body.VIN]
    ).then(() => {
        res.send({message: 'Success'});
    }); 
}

module.exports.get_model_by_id = function(client, req, res) {
    client.query(
        'SELECT "ID" FROM "CAR_MODEL" WHERE "CAR_BRAND_ID" = $1;',
        [req.params['id']]
    ).then((qres) => {
        let models = new Array();
        for (let i = 0; i < qres.rows.length; ++i) {
            models.push(qres.rows[i]['ID']);
        }
        res.send({message: models});
    });
}
