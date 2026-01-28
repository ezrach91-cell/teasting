const mysql = require('mysql2');

// បង្កើតការតភ្ជាប់ទៅកាន់ Database
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',      // ឈ្មោះ user របស់ MySQL
  password: 'R@chez007',      // password របស់ MySQL
  database: 'ecommerce_db'
});

module.exports = pool.promise();
