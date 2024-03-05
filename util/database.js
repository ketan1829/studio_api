
const mongodb = require('mongodb');

const mongoClient = mongodb.MongoClient;

let _db;


const mongoConnect = (callback) => {

    mongoClient.connect(process.env.DB_HOST, { useUnifiedTopology: true, useNewUrlParser: true })
        .then(client => {
            console.log("Connected....\n");
            _db = client.db();
            callback();
        }).catch(err => {
            console.log(err);
            throw err;

        });

};

//another function
const getDB = () => {
    if (_db) {
        return _db;

    }
    //else
    throw 'No Database Found';
}


exports.mongoConnect = mongoConnect;
exports.getDB = getDB;


