const express = require('express');
const db = require('./db');
const app = express();

app.use(express.json());

// ទាញយក Categories ទាំងអស់ដើម្បីដឹងពី ID
app.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products/category/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params; // ចាប់យក ID ពី URL

    // SQL query ដើម្បីទាញយកផលិតផលតាមប្រភេទ
    const sql = `SELECT * FROM products WHERE category_id = ?`;
    const [rows] = await db.query(sql, [category_id]);

    // បើរកមិនឃើញផលិតផលក្នុង Category ហ្នឹងទេ
    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "មិនមានផលិតផលនៅក្នុងប្រភេទ (Category) នេះទេ" 
      });
    }

    // បង្ហាញទិន្នន័យដែលរកឃើញ
    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "មានបញ្ហាបច្ចេកទេសនៅខាង Server" });
  }
});

// API: ទាញយកផលិតផលទាំងអស់
app.get('/products', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: ទាញយកផលិតផលមួយតាមរយៈ ID
app.get('/products/:id', async (req, res) => {
  const productId = req.params.id;

  try {
    // ប្រើ JOIN ដើម្បីទាញយកឈ្មោះ Category មកបង្ហាញជាមួយ
    const sql = `
      SELECT p.*, c.name AS category_name 
      FROM products p 
      JOIN categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `;
    
    const [rows] = await db.query(sql, [productId]);

    if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "រកមិនឃើញផលិតផលនេះទេ!" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/products', async (req, res) => {
  try {
    // ១. ទទួលទិន្នន័យពី Client (រួមទាំង id ផងដែរ)
    const { id, category_id, name, description, price, stock, image_url } = req.body;

    // ២. ឆែកមើលទិន្នន័យចាំបាច់
    if (!id || !category_id || !name || !price) {
      return res.status(400).json({ 
        message: "សូមបំពេញព័ត៌មានចាំបាច់: id, category_id, name, price" 
      });
    }

    // ៣. រៀបចំ SQL Command (ត្រូវតែមានសញ្ញាសួរ ៧ គ្រាប់ ដើម្បីឱ្យត្រូវនឹង Column ទាំង ៧)
    const sql = `INSERT INTO products (id, category_id, name, description, price, stock, image_url) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`; // បន្ថែម ? មួយទៀតនៅទីនេះ
    
    // ៤. បញ្ចូលទៅក្នុង Database
    const [result] = await db.query(sql, [
      id,              // បន្ថែម id ចូលទៅក្នុង Array នេះ
      category_id, 
      name, 
      description || null, 
      price, 
      stock || 0, 
      image_url || null
    ]);

    // ៥. ឆ្លើយតបទៅកាន់ Client
    res.status(201).json({ 
      success: true,
      message: "ផលិតផលត្រូវបានបង្កើតដោយជោគជ័យ!", 
      productId: id // បង្ហាញ id ដែលអ្នកបានបញ្ចូល
    });

  } catch (err) {
    console.error("Database Error: ", err);
    // ប្រសិនបើបញ្ចូល id ជាន់គ្នា វានឹងចូលមកក្នុង catch នេះ
    res.status(500).json({ 
      success: false,
      error: "បញ្ហា៖ " + err.message 
    });
  }
});
// ប្រើ :id ដើម្បីទទួលយកលេខសម្គាល់ពី URL
app.put('/products/:id', async (req, res) => {
  try {
    const { id } = req.params; // ចាប់យកលេខ 4 ពី URL
    const { category_id, name, description, price, stock, image_url } = req.body;

    const sql = `UPDATE products SET 
                  category_id = ?, 
                  name = ?, 
                  description = ?, 
                  price = ?, 
                  stock = ?, 
                  image_url = ? 
                 WHERE id = ?`;

    const [result] = await db.query(sql, [category_id, name, description, price, stock, image_url, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "រកមិនឃើញផលិតផលនេះឡើយ" });
    }

    res.json({ success: true, message: "កែប្រែបានជោគជ័យ" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: លុបផលិតផល (DELETE)
app.delete('/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [productId]);

        if (result.affectedRows > 0) {
            res.json({ message: "លុបទិន្នន័យបានសម្រេច!" });
        } else {
            res.status(404).json({ message: "រកមិនឃើញផលិតផលដែលត្រូវលុបទេ!" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//Order

// ១. ទាញយក Order ទាំងអស់ (Get All Orders)
app.get('/orders', async (req, res) => {
  try {
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    const [rows] = await db.query(sql);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "មិនអាចទាញយកទិន្នន័យបានទេ" });
  }
});

// ២. ទាញយក Order តាម ID (Get Single Order)
app.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "SELECT * FROM orders WHERE id = ?";
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "រកមិនឃើញ Order នេះទេ" });
    }

    res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "មានបញ្ហាបច្ចេកទេស" });
  }
});


app.post('/orders', async (req, res) => {
  try {
    const { id, customer_name, customer_phone, customer_address, total, status } = req.body;

    // ១. ឆែកមើល ID (ត្រូវតែមាន បើអ្នកចង់បញ្ចូលដោយខ្លួនឯង)
    if (!id || !customer_name || !customer_phone || !customer_address) {
      return res.status(400).json({ message: "សូមបំពេញ ID និងព័ត៌មានចាំបាច់ផ្សេងទៀត" });
    }

    // ២. SQL Command ត្រូវតែមាន Column 'id' និងសញ្ញាសួរ '?' គ្រប់ចំនួន
    const sql = `INSERT INTO orders (id, customer_name, customer_phone, customer_address, total, status) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    const [result] = await db.query(sql, [id, customer_name, customer_phone, customer_address, total || 0, status || 'pending']);

    res.status(201).json({ success: true, message: "បង្កើត Order ជោគជ័យ!", orderId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "លេខ ID នេះអាចមានរួចហើយ ឬមានកំហុសបច្ចេកទេស" });
  }
});

app.put('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_phone, customer_address, status, total } = req.body || {};

    if (!customer_name) {
      return res.status(400).json({ error: "សូមបញ្ចូលឈ្មោះអតិថិជន" });
    }

    // ១. លុប "id=?" ចេញពី SET
    const sql = `UPDATE orders SET customer_name=?, customer_phone=?, customer_address=?, status=?, total=? WHERE id=?`;

    // ២. ដាក់ values ឱ្យត្រូវតាមលំដាប់នៃសញ្ញាសួរ (id នៅចុងក្រោយគេ)
    const values = [customer_name, customer_phone, customer_address, status, total, id];

    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "រកមិនឃើញ Order ដែលត្រូវកែប្រែទេ" });
    }

    res.json({ success: true, message: "កែប្រែបានជោគជ័យ" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params; // ចាប់យក ID ពី URL

    // SQL សម្រាប់លុបទិន្នន័យ
    const sql = "DELETE FROM orders WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    // ពិនិត្យមើលថា តើមានទិន្នន័យត្រូវបានលុបដែរឬទេ
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "មិនអាចលុបបានទេ ព្រោះរកមិនឃើញ Order ID នេះឡើយ" 
      });
    }

    res.json({ 
      success: true, 
      message: "លុបការបញ្ជាទិញបានជោគជ័យ!" 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: "មានបញ្ហាបច្ចេកទេស មិនអាចលុបទិន្នន័យបានទេ" 
    });
  }
});

//Pay

app.get('/payments', async (req, res) => {
  try {
    // ប្រើ JOIN ដើម្បីទាញយកឈ្មោះអតិថិជនពីតារាង orders មកជាមួយ
    const sql = `
      SELECT p.*, o.customer_name 
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      ORDER BY p.paid_at DESC`;

    const [rows] = await db.query(sql);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error("Error fetching payments: ", err);
    res.status(500).json({
      success: false,
      error: "មិនអាចទាញយកទិន្នន័យបង់ប្រាក់បានទេ"
    });
  }
});

app.get('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params; // ទាញយក ID ពី URL

    const sql = `
      SELECT p.*, o.customer_name, o.customer_phone 
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      WHERE p.id = ?`;

    const [rows] = await db.query(sql, [id]);

    // ឆែកមើលថា តើមានទិន្នន័យឬទេ
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "រកមិនឃើញទិន្នន័យបង់ប្រាក់សម្រាប់ ID នេះឡើយ"
      });
    }

    res.json({
      success: true,
      data: rows[0] // បង្ហាញតែទិន្នន័យមួយដែលរកឃើញ
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "មានបញ្ហាបច្ចេកទេស៖ " + err.message
    });
  }
});

app.post('/payments', async (req, res) => {
  try {
    const { order_id, payment_method, amount, transaction_id } = req.body;

    // ១. បញ្ចូលទិន្នន័យបង់ប្រាក់
    const paymentSql = `INSERT INTO payments (order_id, payment_method, amount, transaction_id, status) 
                        VALUES (?, ?, ?, ?, 'completed')`;
    
    await db.query(paymentSql, [order_id, payment_method, amount, transaction_id]);

    // ២. Update ស្ថានភាព Order ទៅជា 'paid'
    const updateOrderSql = `UPDATE orders SET status = 'paid' WHERE id = ?`;
    await db.query(updateOrderSql, [order_id]);

    res.status(201).json({ success: true, message: "ការបង់ប្រាក់ទទួលបានជោគជ័យ!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.put('/payments/:oldId', async (req, res) => {
  try {
    const { oldId } = req.params;
    // ទាញយកទិន្នន័យពី req.body 
    const { id, payment_method, amount, transaction_id, status } = req.body; 

    const sql = `UPDATE payments 
                 SET id = ?, payment_method = ?, amount = ?, transaction_id = ?, status = ? 
                 WHERE id = ?`;
    
    const [result] = await db.query(sql, [id, payment_method, amount, transaction_id, status, oldId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "រកមិនឃើញ ID ចាស់ដែលអ្នកចង់កែឡើយ" });
    }

    res.json({ success: true, message: "កែប្រែបានជោគជ័យ!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params; // យក ID ពី URL 

    // ១. ឆែកមើលថា តើមាន ID ហ្នឹងក្នុង Database ឬអត់
    const [existing] = await db.query("SELECT * FROM payments WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "រកមិនឃើញទិន្នន័យបង់ប្រាក់ដែលត្រូវលុបឡើយ" 
      });
    }

    // ២. SQL DELETE Command
    const sql = "DELETE FROM payments WHERE id = ?";
    await db.query(sql, [id]);

    res.json({ 
      success: true, 
      message: `បានលុបទិន្នន័យបង់ប្រាក់ ID: ${id} រួចរាល់!` 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: "មិនអាចលុបទិន្នន័យបានទេ៖ " + err.message 
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});