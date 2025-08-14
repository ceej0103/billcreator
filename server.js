// Load environment variables
require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Now put your authentication constants here:
const AUTH_USER = 'GDP';
const AUTH_PASS_HASH = '$2b$10$eo0OFQFJm.f8XdC3xrqK5ehqqWd4NGEVE8nWCTlhS0CKSDrkASzLy';
const JWT_SECRET = 'supersecretkey';

// Then the rest of your code:
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('client/build'));

// Auth middleware
function authMiddleware(req, res, next) {
  // Only apply auth to API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  // Skip auth for login endpoint
  if (req.path === '/api/login') {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.use(authMiddleware);

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  console.log('Hash matches:', bcrypt.compareSync(password, AUTH_PASS_HASH));
  if (username !== AUTH_USER) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, AUTH_PASS_HASH)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Database setup
const db = new sqlite3.Database('./bills.db');

// Initialize database tables
db.serialize(() => {
  // Units table
  db.run(`CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_number TEXT UNIQUE NOT NULL,
    property TEXT NOT NULL,
    address TEXT NOT NULL
  )`);

  // Tenants table
  db.run(`CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER,
    name TEXT NOT NULL,
    current_balance REAL DEFAULT 0,
    FOREIGN KEY (unit_id) REFERENCES units (id)
  )`);

  // Usage costs table
  db.run(`CREATE TABLE IF NOT EXISTS usage_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT UNIQUE NOT NULL,
    rate REAL NOT NULL,
    type TEXT NOT NULL
  )`);

  // Payments table
  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants (id)
  )`);

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
  )`);

  // Water usage table - stores 65 days of usage data
  db.run(`CREATE TABLE IF NOT EXISTS water_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    gallons REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (unit_id) REFERENCES units (id),
    UNIQUE(unit_id, date)
  )`);

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
      [unit.unit_number, unit.property, unit.address]);
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
      [cost.category, cost.rate, cost.type]);
  });
});

// File upload configuration
const upload = multer({ dest: 'uploads/' });

// API Routes

// Get all units with tenants
app.get('/api/units', (req, res) => {
  db.all(`
    SELECT u.id, u.unit_number, u.property, u.address, t.id as tenant_id, t.name, t.current_balance
    FROM units u
    LEFT JOIN tenants t ON u.id = t.unit_id
    ORDER BY u.property, u.unit_number
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update tenant
app.put('/api/tenants/:unitId', (req, res) => {
  const { unitId } = req.params;
  const { name } = req.body;

  db.run(`DELETE FROM tenants WHERE unit_id = ?`, [unitId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (name && name.trim()) {
      db.run(`INSERT INTO tenants (unit_id, name) VALUES (?, ?)`, [unitId, name], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ success: true, tenantId: this.lastID });
      });
    } else {
      res.json({ success: true });
    }
  });
});

// Update balance
app.put('/api/balances/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const { balance } = req.body;

  db.run(`UPDATE tenants SET current_balance = ? WHERE id = ?`, [balance, tenantId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Get usage costs
app.get('/api/usage-costs', (req, res) => {
  db.all(`SELECT * FROM usage_costs ORDER BY id`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update usage costs
app.put('/api/usage-costs/:id', (req, res) => {
  const { id } = req.params;
  const { rate } = req.body;

  db.run(`UPDATE usage_costs SET rate = ? WHERE id = ?`, [rate, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true });
  });
});

// Add payment
app.post('/api/payments', (req, res) => {
  const { tenantId, amount, date } = req.body;

  db.run(`INSERT INTO payments (tenant_id, amount, date) VALUES (?, ?, ?)`, 
    [tenantId, amount, date], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Update tenant balance
    db.run(`UPDATE tenants SET current_balance = current_balance - ? WHERE id = ?`, 
      [amount, tenantId], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, paymentId: this.lastID });
    });
  });
});

// Process CSV files and create bills
app.post('/api/process-bills', upload.array('csvFiles', 4), async (req, res) => {
  try {
    const files = req.files;
    const usageData = {};
    let periodStart = null;
    let periodEnd = null;
    let billingDays = null;

    // Process each CSV file
    for (const file of files) {
      const results = [];
      const propertyName = file.originalname.includes('CHAMPION') ? 'Champion' :
                          file.originalname.includes('483-489_BARNETT') ? 'Barnett' :
                          file.originalname.includes('532_BARNETT') ? '532 Barnett' :
                          file.originalname.includes('CUSHING') ? 'Cushing' : 'Unknown';

      await new Promise((resolve, reject) => {
        fs.createReadStream(file.path)
          .pipe(csv())
          .on('data', (data) => {
            // Extract period from the Total row
            if (data['Date (America/New_York)'] && data['Date (America/New_York)'].includes('Total')) {
              console.log('Total row value:', data['Date (America/New_York)']);
              const match = data['Date (America/New_York)'].match(/Total\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
              if (match) {
                periodStart = match[1];
                periodEnd = match[2];
                const startDate = new Date(periodStart);
                const endDate = new Date(periodEnd);
                const timeDiff = endDate.getTime() - startDate.getTime();
                const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                billingDays = dayDiff + 1;
              }
              Object.keys(data).forEach(key => {
                if (key.includes('(gal)') && data[key]) {
                  let unitNumber = key.replace(' (gal)', '');
                  // For 532 Barnett and Cushing, prepend property prefix
                  if (propertyName === '532 Barnett' && ['A','B','C','D'].includes(unitNumber)) {
                    unitNumber = '532' + unitNumber;
                  }
                  if (propertyName === 'Cushing' && ['A','B','C','D'].includes(unitNumber)) {
                    unitNumber = 'Cushing' + unitNumber;
                  }
                  const gallons = parseFloat(data[key]);
                  const ccf = gallons / 748; // Convert gallons to CCF
                  if (!usageData[propertyName]) {
                    usageData[propertyName] = {};
                  }
                  usageData[propertyName][unitNumber] = ccf;
                }
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      fs.unlinkSync(file.path);
    }

    // Get usage costs
    const costs = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM usage_costs`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Fallback if period not found in CSVs
    if (!periodStart || !periodEnd || !billingDays) {
      periodStart = '05/26/2025';
      periodEnd = '06/24/2025';
      billingDays = 30;
    }

    // Format dates for display
    const formatDateForDisplay = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    };
    periodStart = formatDateForDisplay(periodStart);
    periodEnd = formatDateForDisplay(periodEnd);

    // Generate bills for each unit
    const bills = [];
    const units = await new Promise((resolve, reject) => {
      db.all(`SELECT u.*, t.id as tenant_id, t.name, t.current_balance 
              FROM units u 
              LEFT JOIN tenants t ON u.id = t.unit_id`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const unit of units) {
      const property = unit.property;
      const unitNumber = unit.unit_number;
      // Find usage data for this unit
      let ccfUsage = 0;
      if (usageData[property] && usageData[property][unitNumber]) {
        ccfUsage = usageData[property][unitNumber];
      }
      // Calculate charges using exact values without rounding
      const waterRate = costs.find(c => c.category === 'Water Rate')?.rate || 0;
      const sewerRate = costs.find(c => c.category === 'Sewer Rate')?.rate || 0;
      let waterBase = costs.find(c => c.category === 'Water Base')?.rate || 0;
      let stormwater = costs.find(c => c.category === 'Stormwater')?.rate || 0;
      let sewerBase = costs.find(c => c.category === 'Sewer Base')?.rate || 0;
      let riverFund = costs.find(c => c.category === 'Clean River Fund')?.rate || 0;

      // Double per-day charges for Champion units
      if (property === 'Champion') {
        waterBase *= 2;
        stormwater *= 2;
        sewerBase *= 2;
        riverFund *= 2;
        console.log(`Champion unit: ${unitNumber}`);
        console.log('Doubled per-day rates:', { waterBase, stormwater, sewerBase, riverFund });
      }

      const waterUsage = ccfUsage * waterRate;
      const sewerUsage = ccfUsage * sewerRate;
      const waterBaseCharge = waterBase * billingDays;
      const stormwaterCharge = stormwater * billingDays;
      const sewerBaseCharge = sewerBase * billingDays;
      const riverFundCharge = riverFund * billingDays;
      if (property === 'Champion') {
        console.log('Calculated per-day charges:', { waterBaseCharge, stormwaterCharge, sewerBaseCharge, riverFundCharge, billingDays });
      }

      const totalCharges = waterUsage + sewerUsage + waterBaseCharge + 
                          stormwaterCharge + sewerBaseCharge + riverFundCharge;

      const bill = {
        tenant_id: unit.tenant_id,
        tenant_name: unit.name || 'No Tenant',
        unit_number: unit.unit_number,
        address: unit.address,
        period_start: periodStart,
        period_end: periodEnd,
        ccf_usage: ccfUsage,
        billing_days: billingDays,
        water_rate: waterRate,
        sewer_rate: sewerRate,
        water_usage: waterUsage,
        water_base: waterBaseCharge,
        stormwater: stormwaterCharge,
        sewer_usage: sewerUsage,
        sewer_base: sewerBaseCharge,
        river_fund: riverFundCharge,
        new_charges: totalCharges,
        previous_balance: unit.current_balance || 0,
        total_amount: (unit.current_balance || 0) + totalCharges
      };

      bills.push(bill);
    }

    res.json({ bills, usageData });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate PDF for a single bill
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const billData = req.body;
    
    // Read the PDF template
    const pdfBytes = fs.readFileSync('BILL TEMPLATE (1).pdf');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    
    // Get the form fields
    const form = pdfDoc.getForm();
    
    // Fill in the form fields
    const fields = {
      'NAME': billData.tenant_name,
      'ADDRESS': billData.address,
      'PERIOD': `${billData.period_start} - ${billData.period_end}`,
      'DATE': new Date().toLocaleDateString(),
      'PREVIOUS': `$${billData.previous_balance.toFixed(2)}`,
      'NEW_CHARGES': `$${billData.new_charges.toFixed(2)}`,
      'TOTAL': `$${billData.total_amount.toFixed(2)}`,
      'DAYS': billData.billing_days.toString(),
      'CCF': billData.ccf_usage.toFixed(2),
      'WATER_RATE': `$${billData.water_rate.toFixed(2)}`,
      'SEWER_RATE': `$${billData.sewer_rate.toFixed(2)}`,
      'WATER_USAGE': `$${billData.water_usage.toFixed(2)}`,
      'WATER_BASE': `$${billData.water_base.toFixed(2)}`,
      'STORM': `$${billData.stormwater.toFixed(2)}`,
      'SEWER_USAGE': `$${billData.sewer_usage.toFixed(2)}`,
      'SEWER_BASE': `$${billData.sewer_base.toFixed(2)}`,
      'RIVER': `$${billData.river_fund.toFixed(2)}`
    };

    console.log('Filling PDF fields:', fields);

    // Fill each field
    Object.entries(fields).forEach(([fieldName, value]) => {
      try {
        const field = form.getTextField(fieldName);
        if (field) {
          field.setText(value);
        }
      } catch (e) {
        // Field might not exist, continue
      }
    });

    // Check if form has fields and flatten them
    const formFields = form.getFields();
    console.log('Form fields found:', formFields.length);
    
    if (formFields.length > 0) {
      // Flatten the form fields to make them non-editable
      form.flatten();
      console.log('Form flattened successfully');
    } else {
      console.log('No form fields found to flatten');
    }
    
    // Alternative approach: Try to remove form fields completely
    try {
      // Get all fields and remove them
      const allFields = form.getFields();
      allFields.forEach(field => {
        try {
          field.remove();
        } catch (e) {
          console.log('Could not remove field:', e.message);
        }
      });
      console.log('Attempted to remove all form fields');
    } catch (e) {
      console.log('Error removing form fields:', e.message);
    }

    // Save the filled PDF
    const filledPdfBytes = await pdfDoc.save();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bill_${billData.unit_number}.pdf"`);
    res.send(Buffer.from(filledPdfBytes));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate all PDFs
app.post('/api/generate-all-pdfs', async (req, res) => {
  try {
    const bills = req.body.bills;
    const pdfBuffers = [];

    for (const billData of bills) {
      const pdfBytes = fs.readFileSync('BILL TEMPLATE (1).pdf');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();
      const fields = {
        'NAME': billData.tenant_name,
        'ADDRESS': billData.address,
        'PERIOD': `${billData.period_start} - ${billData.period_end}`,
        'DATE': new Date().toLocaleDateString(),
        'PREVIOUS': `$${billData.previous_balance.toFixed(2)}`,
        'NEW_CHARGES': `$${billData.new_charges.toFixed(2)}`,
        'TOTAL': `$${billData.total_amount.toFixed(2)}`,
        'DAYS': billData.billing_days.toString(),
        'CCF': billData.ccf_usage.toFixed(2),
        'WATER_RATE': `$${billData.water_rate.toFixed(2)}`,
        'SEWER_RATE': `$${billData.sewer_rate.toFixed(2)}`,
        'WATER_USAGE': `$${billData.water_usage.toFixed(2)}`,
        'WATER_BASE': `$${billData.water_base.toFixed(2)}`,
        'STORM': `$${billData.stormwater.toFixed(2)}`,
        'SEWER_USAGE': `$${billData.sewer_usage.toFixed(2)}`,
        'SEWER_BASE': `$${billData.sewer_base.toFixed(2)}`,
        'RIVER': `$${billData.river_fund.toFixed(2)}`
      };
      Object.entries(fields).forEach(([fieldName, value]) => {
        try {
          const field = form.getTextField(fieldName);
          if (field) {
            field.setText(value);
          }
        } catch (e) {}
      });
      
      // Check if form has fields and flatten them
      const formFields = form.getFields();
      console.log('Form fields found:', formFields.length);
      
      if (formFields.length > 0) {
        // Flatten the form fields to make them non-editable
        form.flatten();
        console.log('Form flattened successfully');
      } else {
        console.log('No form fields found to flatten');
      }
      
      // Alternative approach: Try to remove form fields completely
      try {
        // Get all fields and remove them
        const allFields = form.getFields();
        allFields.forEach(field => {
          try {
            field.remove();
          } catch (e) {
            console.log('Could not remove field:', e.message);
          }
        });
        console.log('Attempted to remove all form fields');
      } catch (e) {
        console.log('Error removing form fields:', e.message);
      }
      
      const filledPdfBytes = await pdfDoc.save();
      // Use the same filename format as single bill download, but replace / and spaces with _
      const safeName = billData.tenant_name.replace(/\s+/g, '_');
      const safeAddress = billData.address.replace(/\s+/g, '_');
      const safePeriod = `${billData.period_start}-${billData.period_end}`.replace(/[\s/]+/g, '_');
      const filename = `Water_Bill_${safeName}_${safeAddress}_${safePeriod}.pdf`;
      console.log('Generated PDF filename:', filename);
      pdfBuffers.push({
        name: filename,
        buffer: Buffer.from(filledPdfBytes)
      });
    }

    // Create a zip file with all PDFs
    const JSZip = require('jszip');
    const zip = new JSZip();
    pdfBuffers.forEach(pdf => {
      zip.file(pdf.name, pdf.buffer);
    });
    const zipContent = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="all_bills.zip"');
    res.send(zipContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/update-balance-for-bill', (req, res) => {
  const { bill } = req.body;
  if (!bill || !bill.tenant_id || typeof bill.new_charges !== 'number') {
    return res.status(400).json({ error: 'Invalid bill data' });
  }
  db.run(
    `UPDATE tenants SET current_balance = current_balance + ? WHERE id = ?`,
    [bill.new_charges, bill.tenant_id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    }
  );
});

app.post('/api/update-balances-for-bills', (req, res) => {
  const { bills } = req.body;
  if (!Array.isArray(bills)) {
    return res.status(400).json({ error: 'Invalid bills data' });
  }
  let completed = 0;
  let hasError = false;
  bills.forEach(bill => {
    if (!bill.tenant_id || typeof bill.new_charges !== 'number') {
      hasError = true;
      return;
    }
    db.run(
      `UPDATE tenants SET current_balance = current_balance + ? WHERE id = ?`,
      [bill.new_charges, bill.tenant_id],
      function (err) {
        if (err) {
          hasError = true;
        }
        completed++;
        if (completed === bills.length) {
          if (hasError) {
            res.status(500).json({ error: 'One or more updates failed' });
          } else {
            res.json({ success: true });
          }
        }
      }
    );
  });
});

// Automated data fetching endpoints
app.post('/api/auto-fetch-data', async (req, res) => {
  try {
    console.log('Automated data fetch requested');
    
             // Calculate date range (last 65 days up to yesterday)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 65);
    
    console.log(`Fetching data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    // TODO: Replace this with actual API call to your water usage provider
    // For now, we'll simulate the API call with realistic data
    const waterUsageData = await fetchWaterUsageFromProvider(startDate, endDate);
    
    // Store the data in the database
    await storeWaterUsageData(waterUsageData);
    
    // Clean up old data (keep only last 65 days)
    await cleanupOldWaterUsageData();
    
         res.json({ 
       success: true, 
       message: `Successfully fetched and stored ${Object.keys(waterUsageData).length} days of water usage data (65-day rolling window)`,
       dateRange: {
         start: startDate.toISOString().split('T')[0],
         end: endDate.toISOString().split('T')[0]
       }
     });
  } catch (error) {
    console.error('Auto fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

 // Function to format date for SimpleSub date picker (Mmm D, YYYY format)
 function formatDateForSimpleSub(date) {
   const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
   const month = months[date.getMonth()];
   const day = date.getDate(); // No padding - single digit for 1-9
   const year = date.getFullYear();
   return `${month} ${day}, ${year}`;
 }

 // Function to fetch water usage from SimpleSub website using web scraping
 async function fetchWaterUsageFromProvider(startDate, endDate) {
   const puppeteer = require('puppeteer');
   const fs = require('fs');
   const path = require('path');
   const csv = require('csv-parser');
  
  // SimpleSub login credentials
  const SIMPLESUB_USERNAME = 'gooddogpropohio@gmail.com';
  const SIMPLESUB_PASSWORD = 'VzX%r5%9e@V0xte*K7';
  const SIMPLESUB_LOGIN_URL = 'https://app.simplesubwater.com/';
  
  // Property URLs
  const propertyUrls = {
    'Barnett': 'https://app.simplesubwater.com/properties/3a0baf1f-4a10-4422-83a9-b26306ee70f5',
    '532 Barnett': 'https://app.simplesubwater.com/properties/41b988a0-d59f-471e-89b7-9b2b023fe4ff',
    'Champion': 'https://app.simplesubwater.com/properties/14e278ff-33c4-4e7b-9229-30cc4cb03a6e',
    'Cushing': 'https://app.simplesubwater.com/properties/977f14ba-2a4c-4f1f-9c98-1b93554a4e2a'
  };
  
  const usageData = {};
  
  // Initialize usageData with empty objects for each date
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    usageData[dateStr] = {
      'Champion': {},
      'Barnett': {},
      '532 Barnett': {},
      'Cushing': {}
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  let browser;
  
  try {
    console.log('Starting SimpleSub web scraping...');
    
         // Launch browser with download configuration
     browser = await puppeteer.launch({
       headless: false,
       args: ['--no-sandbox', '--disable-setuid-sandbox']
     });
    
         const page = await browser.newPage();
     
     // Set viewport
     await page.setViewport({ width: 1920, height: 1080 });
     
           // Configure download behavior
      const downloadsPath = path.join(process.cwd(), 'downloads');
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath);
      }
      
      // Clean up any existing CSV files before starting
      const existingFiles = fs.readdirSync(downloadsPath).filter(file => file.endsWith('.csv'));
      existingFiles.forEach(file => {
        const filePath = path.join(downloadsPath, file);
        try {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old CSV file: ${file}`);
        } catch (error) {
          console.warn(`Could not delete old CSV file: ${file}`);
        }
      });
     
     // Set download path using the correct Puppeteer method
     const client = await page.target().createCDPSession();
     await client.send('Page.setDownloadBehavior', {
       behavior: 'allow',
       downloadPath: downloadsPath
     });
    
    // Navigate to login page
    console.log('Navigating to SimpleSub login page...');
    await page.goto(SIMPLESUB_LOGIN_URL, { waitUntil: 'networkidle2' });
    
    // Wait for login form to load
    await page.waitForSelector('input[type="email"], input[name="email"], input[type="text"]', { timeout: 10000 });
    
    // Fill in login credentials
    console.log('Logging into SimpleSub...');
    await page.type('input[type="email"], input[name="email"], input[type="text"]', SIMPLESUB_USERNAME);
    await page.type('input[type="password"]', SIMPLESUB_PASSWORD);
    
    // Click login button
    await page.click('button[type="submit"], input[type="submit"], .login-button');
    
         // Wait for login to complete
     await page.waitForNavigation({ waitUntil: 'networkidle2' });
     
     console.log('Successfully logged into SimpleSub');
     
     // Add a 20-second delay after login to ensure everything is loaded
     console.log('Waiting 20 seconds for page to fully load...');
     await page.waitForTimeout(20000);
    
    // Process each property
    for (const [propertyName, propertyUrl] of Object.entries(propertyUrls)) {
      console.log(`Processing property: ${propertyName}`);
      
      try {
        // Navigate to property page
        await page.goto(propertyUrl, { waitUntil: 'networkidle2' });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // Look for and click the "Usage" tab
        console.log(`Looking for Usage tab for ${propertyName}...`);
        
                 // Try different selectors for the Usage tab based on the actual HTML structure
         const usageTabSelectors = [
           'button[role="tab"][aria-controls*="P-2"]',
           'button[id*="T-2"]',
           'button[aria-controls*="P-2"]',
           'button.MuiTab-root'
         ];
         
         let usageTabFound = false;
         for (const selector of usageTabSelectors) {
           try {
             const tab = await page.$(selector);
             if (tab) {
               const text = await tab.evaluate(el => el.textContent);
               if (text && text.trim() === 'Usage') {
                 await tab.click();
                 usageTabFound = true;
                 console.log(`Found and clicked Usage tab using selector: ${selector} for ${propertyName}`);
                 break;
               }
             }
           } catch (e) {
             // Continue to next selector
           }
         }
         
         if (!usageTabFound) {
           // Try to find by text content with more specific targeting
           const tabs = await page.$$('button[role="tab"]');
           for (const tab of tabs) {
             const text = await tab.evaluate(el => el.textContent);
             if (text && text.trim() === 'Usage') {
               await tab.click();
               usageTabFound = true;
               console.log(`Found Usage tab by exact text match for ${propertyName}`);
               break;
             }
           }
         }
        
        if (!usageTabFound) {
          console.warn(`Could not find Usage tab for ${propertyName}, skipping...`);
          continue;
        }
        
        // Wait for usage page to load
        await page.waitForTimeout(3000);
        
        // Look for date picker and set date range
        console.log(`Setting date range for ${propertyName}...`);
        
        // Try to find date picker inputs using the correct selectors from SimpleSub
        console.log(`Looking for date picker inputs for ${propertyName}...`);
        
        // Wait for the date picker to be visible
        await page.waitForTimeout(2000);
        
        // Try to find the date range picker inputs
        let startDateInput, endDateInput;
        
        try {
          // Look for the specific date range inputs
          startDateInput = await page.$('input[date-range="start"]');
          endDateInput = await page.$('input[date-range="end"]');
          
          if (startDateInput && endDateInput) {
            console.log(`Found date range inputs for ${propertyName}`);
            
                         // Clear and set start date
             await startDateInput.click();
             await startDateInput.evaluate(el => el.value = '');
             const formattedStartDate = formatDateForSimpleSub(startDate);
             await startDateInput.type(formattedStartDate);
             
             // Clear and set end date
             await endDateInput.click();
             await endDateInput.evaluate(el => el.value = '');
             const formattedEndDate = formatDateForSimpleSub(endDate);
             await endDateInput.type(formattedEndDate);
             
             console.log(`Set date range for ${propertyName}: ${formattedStartDate} to ${formattedEndDate}`);
            
                         // Wait a moment for the date picker to update
             await page.waitForTimeout(2000);
             
             // Press Enter to confirm the date selection and close the picker
             await page.keyboard.press('Enter');
             console.log(`Pressed Enter to confirm date selection for ${propertyName}`);
             
             // Wait 3 seconds for the chart to populate with the new date range
             await page.waitForTimeout(3000);
          } else {
            console.warn(`Could not find date range inputs for ${propertyName}`);
          }
        } catch (error) {
          console.warn(`Error setting date range for ${propertyName}:`, error.message);
        }
        
        // Look for and click "Export to Spreadsheet" button
        console.log(`Looking for Export button for ${propertyName}...`);
        
        // Wait for the export button to be visible
        await page.waitForTimeout(2000);
        
        let exportButtonFound = false;
        
        try {
          // Try multiple selectors for the export button based on the HTML structure
          const exportSelectors = [
            'button.MuiButton-root',
            'button.MuiButtonBase-root',
            'button[class*="MuiButton"]'
          ];
          
          for (const selector of exportSelectors) {
            try {
              const buttons = await page.$$(selector);
              for (const button of buttons) {
                const text = await button.evaluate(el => el.textContent);
                if (text && text.trim() === 'Export to Spreadsheet') {
                  await button.click();
                  exportButtonFound = true;
                  console.log(`Found Export button using selector: ${selector} for ${propertyName}`);
                  break;
                }
              }
              if (exportButtonFound) break;
            } catch (e) {
              // Continue to next selector
            }
          }
          
          // Fallback: try to find by text content
          if (!exportButtonFound) {
            const buttons = await page.$$('button');
            for (const button of buttons) {
              const text = await button.evaluate(el => el.textContent);
              if (text && text.trim() === 'Export to Spreadsheet') {
                await button.click();
                exportButtonFound = true;
                console.log(`Found Export button by exact text match for ${propertyName}`);
                break;
              }
            }
          }
        } catch (error) {
          console.warn(`Error finding export button for ${propertyName}:`, error.message);
        }
        
        if (!exportButtonFound) {
          console.warn(`Could not find Export button for ${propertyName}`);
          continue;
        }
        
        // Wait for download to start
        await page.waitForTimeout(5000);
        
                          // Look for the most recent CSV file in downloads
         const files = fs.readdirSync(downloadsPath).filter(file => file.endsWith('.csv'));
         if (files.length > 0) {
           // Get the most recent file (by modification time, not just name)
           const fileStats = files.map(file => ({
             name: file,
             path: path.join(downloadsPath, file),
             mtime: fs.statSync(path.join(downloadsPath, file)).mtime
           }));
           const latestFile = fileStats.sort((a, b) => b.mtime - a.mtime)[0];
           const filePath = latestFile.path;
          
                     console.log(`Processing downloaded file: ${latestFile.name}`);
          
          // Parse the CSV file
          const csvData = [];
          await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
              .pipe(csv())
              .on('data', (data) => csvData.push(data))
              .on('end', resolve)
              .on('error', reject);
          });
          
                     // Process the CSV data
           csvData.forEach(row => {
             const dateKey = row['Date (America/New_York)'] || row['Date'] || row['date'];
             
             // Skip the Total row and Property Total rows
             if (dateKey && (dateKey.includes('Total') || dateKey.includes('Property Total'))) {
               return;
             }
             
             // Parse the date
             if (dateKey && dateKey.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
               const [month, day, year] = dateKey.split('/');
               const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
               
               // Only process dates within our range
               if (dateStr >= startDate.toISOString().split('T')[0] && 
                   dateStr <= endDate.toISOString().split('T')[0]) {
                 
                 // Process each unit column based on the property
                 Object.keys(row).forEach(key => {
                   if (key.includes('(gal)') && row[key]) {
                     let unitNumber = key.replace(' (gal)', '').trim();
                     
                     // Skip Property Total columns
                     if (unitNumber.includes('Property Total')) {
                       return;
                     }
                     
                     // Map unit numbers correctly based on property
                     // Each CSV file only contains units for that specific property
                     let mappedUnitNumber = unitNumber;
                     
                     if (propertyName === 'Champion') {
                       // Champion CSV only contains 484 and 486
                       if (!['484', '486'].includes(unitNumber)) {
                         console.log(`Skipping unit ${unitNumber} for Champion property`);
                         return; // Skip units that don't belong to Champion
                       }
                     } else if (propertyName === 'Barnett') {
                       // Barnett CSV only contains 483, 485, 487, 489
                       if (!['483', '485', '487', '489'].includes(unitNumber)) {
                         console.log(`Skipping unit ${unitNumber} for Barnett property`);
                         return; // Skip units that don't belong to Barnett
                       }
                     } else if (propertyName === '532 Barnett') {
                       // 532 Barnett CSV only contains A, B, C, D (mapped to 532A, 532B, etc.)
                       if (!['A', 'B', 'C', 'D'].includes(unitNumber)) {
                         console.log(`Skipping unit ${unitNumber} for 532 Barnett property`);
                         return; // Skip units that don't belong to 532 Barnett
                       }
                       mappedUnitNumber = '532' + unitNumber;
                     } else if (propertyName === 'Cushing') {
                       // Cushing CSV only contains A, B, C, D (mapped to CushingA, CushingB, etc.)
                       if (!['A', 'B', 'C', 'D'].includes(unitNumber)) {
                         console.log(`Skipping unit ${unitNumber} for Cushing property`);
                         return; // Skip units that don't belong to Cushing
                       }
                       mappedUnitNumber = 'Cushing' + unitNumber;
                     }
                     
                     console.log(`Processing ${propertyName} - ${mappedUnitNumber}: ${row[key]} gallons on ${dateStr}`);
                     
                     const gallons = parseFloat(row[key]);
                     if (!isNaN(gallons)) {
                       if (!usageData[dateStr][propertyName]) {
                         usageData[dateStr][propertyName] = {};
                       }
                       usageData[dateStr][propertyName][mappedUnitNumber] = gallons;
                     }
                   }
                 });
               }
             }
           });
          
                     // Keep the downloaded file for testing purposes
           console.log(`Keeping downloaded file for testing: ${filePath}`);
          
          console.log(`Successfully processed data for ${propertyName}`);
        } else {
          console.warn(`No CSV file found for ${propertyName}`);
        }
        
      } catch (error) {
        console.error(`Error processing property ${propertyName}:`, error.message);
        // Continue with other properties even if one fails
      }
    }
    
    console.log(`Successfully scraped water usage data for ${Object.keys(usageData).length} days`);
    return usageData;
    
  } catch (error) {
    console.error('Error scraping SimpleSub website:', error);
    throw new Error(`Failed to scrape water usage data: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Function to store water usage data in database
async function storeWaterUsageData(usageData) {
  return new Promise((resolve, reject) => {
    // Get all units first
    db.all(`SELECT id, unit_number, property FROM units`, (err, units) => {
      if (err) {
        reject(err);
        return;
      }
      
      let completed = 0;
      let totalOperations = 0;
      
      // Count total operations
      Object.keys(usageData).forEach(date => {
        Object.keys(usageData[date]).forEach(property => {
          Object.keys(usageData[date][property]).forEach(unitNumber => {
            totalOperations++;
          });
        });
      });
      
      if (totalOperations === 0) {
        resolve();
        return;
      }
      
      // Store data for each unit and date
      Object.keys(usageData).forEach(date => {
        Object.keys(usageData[date]).forEach(property => {
          Object.keys(usageData[date][property]).forEach(unitNumber => {
            const gallons = usageData[date][property][unitNumber];
            const unit = units.find(u => u.unit_number === unitNumber && u.property === property);
            
            if (unit) {
              db.run(
                `INSERT OR REPLACE INTO water_usage (unit_id, date, gallons) VALUES (?, ?, ?)`,
                [unit.id, date, gallons],
                function(err) {
                  if (err) {
                    console.error('Error storing water usage:', err);
                  }
                  completed++;
                  if (completed === totalOperations) {
                    resolve();
                  }
                }
              );
            } else {
              console.warn(`Unit not found: ${property} - ${unitNumber}`);
              completed++;
              if (completed === totalOperations) {
                resolve();
              }
            }
          });
        });
      });
    });
  });
}

 // Function to cleanup old water usage data (keep only last 65 days)
 async function cleanupOldWaterUsageData() {
   return new Promise((resolve, reject) => {
     const cutoffDate = new Date();
     cutoffDate.setDate(cutoffDate.getDate() - 65);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    db.run(
      `DELETE FROM water_usage WHERE date < ?`,
      [cutoffDateStr],
      function(err) {
        if (err) {
          reject(err);
        } else {
          console.log(`Cleaned up water usage data older than ${cutoffDateStr}`);
          resolve();
        }
      }
    );
  });
}

 // Get water usage data for database viewer (last 65 days)
 app.get('/api/water-usage-viewer', (req, res) => {
   const endDate = new Date();
   const startDate = new Date(endDate);
   startDate.setDate(startDate.getDate() - 65);
   
   const startDateStr = startDate.toISOString().split('T')[0];
   const endDateStr = endDate.toISOString().split('T')[0];
   
   db.all(`
     SELECT u.unit_number, u.property, wu.date, wu.gallons
     FROM units u
     LEFT JOIN water_usage wu ON u.id = wu.unit_id AND wu.date BETWEEN ? AND ?
     ORDER BY wu.date DESC, u.property, u.unit_number
   `, [startDateStr, endDateStr], (err, rows) => {
     if (err) {
       res.status(500).json({ error: err.message });
       return;
     }
     
     // Create a matrix structure for the table
     const dates = [];
     const units = [];
     const dataMatrix = {};
     
     // Get all unique dates and units
     rows.forEach(row => {
       if (row.date && !dates.includes(row.date)) {
         dates.push(row.date);
       }
       const unitKey = `${row.property}-${row.unit_number}`;
       if (!units.includes(unitKey)) {
         units.push(unitKey);
       }
     });
     
     // Sort dates (newest first) and units
     dates.sort((a, b) => new Date(b) - new Date(a));
     units.sort();
     
     // Initialize data matrix
     dates.forEach(date => {
       dataMatrix[date] = {};
       units.forEach(unit => {
         dataMatrix[date][unit] = 0;
       });
     });
     
     // Fill in the actual data
     rows.forEach(row => {
       if (row.date && row.gallons) {
         const unitKey = `${row.property}-${row.unit_number}`;
         dataMatrix[row.date][unitKey] = row.gallons;
       }
     });
     
     res.json({
       dates: dates,
       units: units,
       dataMatrix: dataMatrix
     });
   });
 });

 // Get water usage data for a date range
 app.get('/api/water-usage/:startDate/:endDate', (req, res) => {
  const { startDate, endDate } = req.params;
  
  db.all(`
    SELECT u.unit_number, u.property, u.address, t.name as tenant_name, wu.date, wu.gallons
    FROM units u
    LEFT JOIN tenants t ON u.id = t.unit_id
    LEFT JOIN water_usage wu ON u.id = wu.unit_id AND wu.date BETWEEN ? AND ?
    WHERE wu.date IS NOT NULL
    ORDER BY u.property, u.unit_number, wu.date
  `, [startDate, endDate], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Group by unit and calculate totals
    const usageByUnit = {};
    rows.forEach(row => {
      const key = `${row.property}-${row.unit_number}`;
      if (!usageByUnit[key]) {
        usageByUnit[key] = {
          unit_number: row.unit_number,
          property: row.property,
          address: row.address,
          tenant_name: row.tenant_name || 'No Tenant',
          total_gallons: 0,
          daily_usage: []
        };
      }
      usageByUnit[key].total_gallons += row.gallons;
      usageByUnit[key].daily_usage.push({
        date: row.date,
        gallons: row.gallons
      });
    });
    
    res.json(Object.values(usageByUnit));
  });
});

// Process bills from date range data (new format)
app.post('/api/process-bills-from-data', async (req, res) => {
  try {
    const { bills } = req.body;
    
    if (!Array.isArray(bills)) {
      return res.status(400).json({ error: 'Invalid bills data' });
    }

    // Get usage costs
    const costs = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM usage_costs`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Process each bill
    const processedBills = bills.map(billData => {
      const property = billData.property || 'Unknown';
      
      // Calculate charges using exact values without rounding
      const waterRate = costs.find(c => c.category === 'Water Rate')?.rate || 0;
      const sewerRate = costs.find(c => c.category === 'Sewer Rate')?.rate || 0;
      let waterBase = costs.find(c => c.category === 'Water Base')?.rate || 0;
      let stormwater = costs.find(c => c.category === 'Stormwater')?.rate || 0;
      let sewerBase = costs.find(c => c.category === 'Sewer Base')?.rate || 0;
      let riverFund = costs.find(c => c.category === 'Clean River Fund')?.rate || 0;

      // Double per-day charges for Champion units
      if (property === 'Champion') {
        waterBase *= 2;
        stormwater *= 2;
        sewerBase *= 2;
        riverFund *= 2;
      }

      const waterUsage = billData.ccf_usage * waterRate;
      const sewerUsage = billData.ccf_usage * sewerRate;
      const waterBaseCharge = waterBase * billData.billing_days;
      const stormwaterCharge = stormwater * billData.billing_days;
      const sewerBaseCharge = sewerBase * billData.billing_days;
      const riverFundCharge = riverFund * billData.billing_days;

      const totalCharges = waterUsage + sewerUsage + waterBaseCharge + 
                          stormwaterCharge + sewerBaseCharge + riverFundCharge;

      return {
        tenant_id: billData.tenant_id,
        tenant_name: billData.tenant_name,
        unit_number: billData.unit_number,
        address: billData.address,
        period_start: billData.period_start,
        period_end: billData.period_end,
        ccf_usage: billData.ccf_usage,
        billing_days: billData.billing_days,
        water_rate: waterRate,
        sewer_rate: sewerRate,
        water_usage: waterUsage,
        water_base: waterBaseCharge,
        stormwater: stormwaterCharge,
        sewer_usage: sewerUsage,
        sewer_base: sewerBaseCharge,
        river_fund: riverFundCharge,
        new_charges: totalCharges,
        previous_balance: billData.previous_balance || 0,
        total_amount: (billData.previous_balance || 0) + totalCharges
      };
    });

    res.json({ bills: processedBills });

  } catch (error) {
    console.error('Process bills from data error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/process-auto-bills', async (req, res) => {
  try {
    const { usageData } = req.body;
    
    if (!usageData) {
      return res.status(400).json({ error: 'No usage data provided' });
    }

    // Get usage costs
    const costs = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM usage_costs`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Set default billing period
    const periodStart = '05/26/2025';
    const periodEnd = '06/24/2025';
    const billingDays = 30;

    // Format dates for display
    const formatDateForDisplay = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    };

    // Generate bills for each unit
    const bills = [];
    const units = await new Promise((resolve, reject) => {
      db.all(`SELECT u.*, t.id as tenant_id, t.name, t.current_balance 
              FROM units u 
              LEFT JOIN tenants t ON u.id = t.unit_id`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const unit of units) {
      const property = unit.property;
      const unitNumber = unit.unit_number;
      
      // Find usage data for this unit
      let ccfUsage = 0;
      if (usageData[property] && usageData[property][unitNumber]) {
        ccfUsage = usageData[property][unitNumber];
      }

      // Calculate charges
      const waterRate = costs.find(c => c.category === 'Water Rate')?.rate || 0;
      const sewerRate = costs.find(c => c.category === 'Sewer Rate')?.rate || 0;
      let waterBase = costs.find(c => c.category === 'Water Base')?.rate || 0;
      let stormwater = costs.find(c => c.category === 'Stormwater')?.rate || 0;
      let sewerBase = costs.find(c => c.category === 'Sewer Base')?.rate || 0;
      let riverFund = costs.find(c => c.category === 'Clean River Fund')?.rate || 0;

      // Double per-day charges for Champion units
      if (property === 'Champion') {
        waterBase *= 2;
        stormwater *= 2;
        sewerBase *= 2;
        riverFund *= 2;
      }

      const waterUsage = ccfUsage * waterRate;
      const sewerUsage = ccfUsage * sewerRate;
      const waterBaseCharge = waterBase * billingDays;
      const stormwaterCharge = stormwater * billingDays;
      const sewerBaseCharge = sewerBase * billingDays;
      const riverFundCharge = riverFund * billingDays;

      const totalCharges = waterUsage + sewerUsage + waterBaseCharge + 
                          stormwaterCharge + sewerBaseCharge + riverFundCharge;

      const bill = {
        tenant_id: unit.tenant_id,
        tenant_name: unit.name || 'No Tenant',
        unit_number: unit.unit_number,
        address: unit.address,
        period_start: formatDateForDisplay(periodStart),
        period_end: formatDateForDisplay(periodEnd),
        ccf_usage: ccfUsage,
        billing_days: billingDays,
        water_rate: waterRate,
        sewer_rate: sewerRate,
        water_usage: waterUsage,
        water_base: waterBaseCharge,
        stormwater: stormwaterCharge,
        sewer_usage: sewerUsage,
        sewer_base: sewerBaseCharge,
        river_fund: riverFundCharge,
        new_charges: totalCharges,
        previous_balance: unit.current_balance || 0,
        total_amount: (unit.current_balance || 0) + totalCharges
      };

      bills.push(bill);
    }

    res.json({ bills, usageData });

  } catch (error) {
    console.error('Process auto bills error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to parse CSV files from SAMPLE DATA directory
app.post('/api/test-csv-parsing', async (req, res) => {
  try {
    console.log('Testing CSV parsing from SAMPLE DATA directory...');
    
    const fs = require('fs');
    const path = require('path');
    const csv = require('csv-parser');
    
    const sampleDataPath = path.join(process.cwd(), 'SAMPLE DATA');
    const csvFiles = fs.readdirSync(sampleDataPath).filter(file => file.endsWith('.csv'));
    
    console.log(`Found ${csvFiles.length} CSV files in SAMPLE DATA directory:`, csvFiles);
    
    const usageData = {};
    const allDates = new Set(); // Track all dates found in CSV files
    
    // Process each CSV file
    for (const csvFile of csvFiles) {
      const filePath = path.join(sampleDataPath, csvFile);
      console.log(`Processing CSV file: ${csvFile}`);
      
      // Determine property name from filename
      let propertyName = '';
      if (csvFile.includes('CHAMPION')) {
        propertyName = 'Champion';
      } else if (csvFile.includes('BARNETT') && !csvFile.includes('532')) {
        propertyName = 'Barnett';
      } else if (csvFile.includes('532_BARNETT')) {
        propertyName = '532 Barnett';
      } else if (csvFile.includes('CUSHING')) {
        propertyName = 'Cushing';
      }
      
      if (!propertyName) {
        console.warn(`Could not determine property name for file: ${csvFile}`);
        continue;
      }
      
      console.log(`Identified property: ${propertyName}`);
      
      // Parse the CSV file
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      
      console.log(`Parsed ${csvData.length} rows from ${csvFile}`);
      
      // Process the CSV data
      csvData.forEach(row => {
        const dateKey = row['Date (America/New_York)'] || row['Date'] || row['date'];
        
        // Skip the Total row and Property Total rows
        if (dateKey && (dateKey.includes('Total') || dateKey.includes('Property Total'))) {
          return;
        }
        
        // Parse the date
        if (dateKey && dateKey.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          const [month, day, year] = dateKey.split('/');
          const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          
          // Add this date to our set of all dates
          allDates.add(dateStr);
          
          // Process each unit column based on the property
          Object.keys(row).forEach(key => {
            if (key.includes('(gal)') && row[key]) {
              let unitNumber = key.replace(' (gal)', '').trim();
              
              // Skip Property Total columns
              if (unitNumber.includes('Property Total')) {
                return;
              }
              
              // Map unit numbers correctly based on property
              let mappedUnitNumber = unitNumber;
              
              if (propertyName === 'Champion') {
                // Champion CSV only contains 484 and 486
                if (!['484', '486'].includes(unitNumber)) {
                  console.log(`Skipping unit ${unitNumber} for Champion property`);
                  return; // Skip units that don't belong to Champion
                }
              } else if (propertyName === 'Barnett') {
                // Barnett CSV only contains 483, 485, 487, 489
                if (!['483', '485', '487', '489'].includes(unitNumber)) {
                  console.log(`Skipping unit ${unitNumber} for Barnett property`);
                  return; // Skip units that don't belong to Barnett
                }
              } else if (propertyName === '532 Barnett') {
                // 532 Barnett CSV only contains A, B, C, D (mapped to 532A, 532B, etc.)
                if (!['A', 'B', 'C', 'D'].includes(unitNumber)) {
                  console.log(`Skipping unit ${unitNumber} for 532 Barnett property`);
                  return; // Skip units that don't belong to 532 Barnett
                }
                mappedUnitNumber = '532' + unitNumber;
              } else if (propertyName === 'Cushing') {
                // Cushing CSV only contains A, B, C, D (mapped to CushingA, CushingB, etc.)
                if (!['A', 'B', 'C', 'D'].includes(unitNumber)) {
                  console.log(`Skipping unit ${unitNumber} for Cushing property`);
                  return; // Skip units that don't belong to Cushing
                }
                mappedUnitNumber = 'Cushing' + unitNumber;
              }
              
              console.log(`Processing ${propertyName} - ${mappedUnitNumber}: ${row[key]} gallons on ${dateStr}`);
              
              const gallons = parseFloat(row[key]);
              if (!isNaN(gallons)) {
                if (!usageData[dateStr]) {
                  usageData[dateStr] = {
                    'Champion': {},
                    'Barnett': {},
                    '532 Barnett': {},
                    'Cushing': {}
                  };
                }
                if (!usageData[dateStr][propertyName]) {
                  usageData[dateStr][propertyName] = {};
                }
                usageData[dateStr][propertyName][mappedUnitNumber] = gallons;
              }
            }
          });
        }
      });
      
      console.log(`Successfully processed data for ${propertyName}`);
    }
    
    // Store the parsed data in the database
    await storeWaterUsageData(usageData);
    
    // Clean up old data (keep only last 65 days)
    await cleanupOldWaterUsageData();
    
    // Determine the actual date range from the CSV data
    const sortedDates = Array.from(allDates).sort();
    const actualStartDate = sortedDates[0];
    const actualEndDate = sortedDates[sortedDates.length - 1];
    
    console.log(`Successfully parsed and stored data from ${csvFiles.length} CSV files`);
    console.log(`Date range found in CSV files: ${actualStartDate} to ${actualEndDate} (${sortedDates.length} days)`);
    
    res.json({ 
      success: true, 
      message: `Successfully parsed and stored data from ${csvFiles.length} CSV files`,
      filesProcessed: csvFiles,
      dateRange: {
        start: actualStartDate,
        end: actualEndDate,
        totalDays: sortedDates.length
      }
    });
    
  } catch (error) {
    console.error('Test CSV parsing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 