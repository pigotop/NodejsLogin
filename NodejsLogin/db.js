const monk = require('monk');
const url = 'localhost:27017/Login';
const db = monk(url);
const collection = db.get('user');
db.then(() => {
    console.log('Connected correctly to server');
})

module.exports = collection