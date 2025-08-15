const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database in current directory
const dbPath = path.join(__dirname, 'bills.db');
console.log('Creating database at:', dbPath);

const db = new sqlite3.Database(dbPath);

// Initialize database tables
db.serialize(() => {
  console.log('Creating tables...');
  
  // Units table
  db.run(`CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_number TEXT UNIQUE NOT NULL,
    property TEXT NOT NULL,
    address TEXT NOT NULL
  )`, (err) => {
    if (err) console.error('Error creating units table:', err);
    else console.log('Units table created');
  });

  // Tenants table
  db.run(`CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER,
    name TEXT NOT NULL,
    current_balance REAL DEFAULT 0,
    FOREIGN KEY (unit_id) REFERENCES units (id)
  )`, (err) => {
    if (err) console.error('Error creating tenants table:', err);
    else console.log('Tenants table created');
  });

  // Usage costs table
  db.run(`CREATE TABLE IF NOT EXISTS usage_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    rate REAL NOT NULL,
    type TEXT NOT NULL
  )`, (err) => {
    if (err) console.error('Error creating usage_costs table:', err);
    else console.log('Usage costs table created');
  });

  // Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  )`, (err) => {
    if (err) console.error('Error creating payments table:', err);
    else console.log('Payments table created');
  });

  // Bills table
  db.run(`CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    ccf_usage REAL NOT NULL,
    total_amount REAL NOT NULL,
    created_date TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  )`, (err) => {
    if (err) console.error('Error creating bills table:', err);
    else console.log('Bills table created');
  });

  // Usage data table (for automation)
  db.run(`CREATE TABLE IF NOT EXISTS usage_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_number TEXT NOT NULL,
    property TEXT NOT NULL,
    date TEXT NOT NULL,
    ccf REAL NOT NULL,
    gallons REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating usage_data table:', err);
    else console.log('Usage data table created');
  });

  // Fetch logs table (for automation)
  db.run(`CREATE TABLE IF NOT EXISTS fetch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) console.error('Error creating fetch_logs table:', err);
    else console.log('Fetch logs table created');
  });

  // Insert default units
  const units = [
    { unit_number: '484', property: 'Champion', address: '484 S Champion Avenue' },
    { unit_number: '486', property: 'Champion', address: '486 S Champion Avenue' },
    { unit_number: '483', property: 'Barnett', address: '483 Barnett Road' },
    { unit_number: '485', property: 'Barnett', address: '485 Barnett Road' },
    { unit_number: '487', property: 'Barnett', address: '487 Barnett Road' },
    { unit_number: '489', property: 'Barnett', address: '489 Barnett Road' },
    { unit_number: '532A', property: '532 Barnett', address: '532 Barnett Road, Unit A' },
    { unit_number: '532B', property: '532 Barnett', address: '532 Barnett Road, Unit B' },
    { unit_number: '532C', property: '532 Barnett', address: '532 Barnett Road, Unit C' },
    { unit_number: '532D', property: '532 Barnett', address: '532 Barnett Road, Unit D' },
    { unit_number: 'CushingA', property: 'Cushing', address: '3631 Cushing Drive, Unit A' },
    { unit_number: 'CushingB', property: 'Cushing', address: '3631 Cushing Drive, Unit B' },
    { unit_number: 'CushingC', property: 'Cushing', address: '3631 Cushing Drive, Unit C' },
    { unit_number: 'CushingD', property: 'Cushing', address: '3631 Cushing Drive, Unit D' }
  ];

  units.forEach(unit => {
    db.run(`INSERT OR IGNORE INTO units (unit_number, property, address) VALUES (?, ?, ?)`,
      [unit.unit_number, unit.property, unit.address], (err) => {
        if (err) console.error('Error inserting unit:', unit.unit_number, err);
        else console.log('Inserted unit:', unit.unit_number);
      });
  });

  // Insert default usage costs
  const costs = [
    { category: 'Water Rate', rate: 3.52, type: 'per_ccf' },
    { category: 'Sewer Rate', rate: 5.35, type: 'per_ccf' },
    { category: 'Water Base', rate: 0.080084, type: 'per_day' },
    { category: 'Stormwater', rate: 0.126489, type: 'per_day' },
    { category: 'Sewer Base', rate: 0.041320, type: 'per_day' },
    { category: 'Clean River Fund', rate: 0.103567, type: 'per_day' }
  ];

  costs.forEach(cost => {
    db.run(`INSERT OR IGNORE INTO usage_costs (category, rate, type) VALUES (?, ?, ?)`,
      [cost.category, cost.rate, cost.type], (err) => {
        if (err) console.error('Error inserting cost:', cost.category, err);
        else console.log('Inserted cost:', cost.category);
      });
  });

  console.log('Database initialization complete!');
  db.close((err) => {
    if (err) console.error('Error closing database:', err);
    else console.log('Database closed successfully');
  });
});

