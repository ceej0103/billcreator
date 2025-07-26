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
  if (
    req.path === '/api/login' ||
    req.path.startsWith('/static') ||
    req.path.startsWith('/favicon') ||
    req.path.startsWith('/manifest') ||
    req.method === 'GET' && req.path.startsWith('/api/public')
  ) {
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

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 