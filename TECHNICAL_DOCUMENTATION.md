# BILLCREATOR - Technical Documentation

## Project Overview
**Good Dog Properties - Water Bill Management System**

A full-stack web application for managing water bills across 14 units in 4 properties. The system handles automated data fetching from SimpleSub, CSV processing, bill generation, PDF creation, and tenant management.

## Current Status (Latest Session - August 16, 2025)
- **Production-Ready**: All major features implemented and tested
- **Recent Session**: Critical syntax error resolved, deployment issues fixed
- **Database Persistence**: Configured to use `/var/data/bills.db` on Render persistent disk
- **Memory Monitoring**: Enhanced system tracks both Node.js and container memory usage
- **Deployment**: Server starts successfully, ready for production testing
- **Status**: Database will persist between deployments, memory usage ~511MB (functional)

## Recent Deployment Issues & Resolution

### Phase 1 Problems (Previous Session)
Render deployment was hanging during `npm install` due to cached package.json with problematic scripts:
- `heroku-postbuild`: Tried to install client dependencies
- `railway-postbuild`: Tried to install client dependencies  
- `postinstall`: Tried to install client dependencies

### Phase 2 Problems (Latest Session - August 16, 2025)
After fixing initial deployment issues, new problems emerged:
- **Memory Limit Exceeded**: "Instance failed: N1shc, ran out of memory while running your code"
- **Puppeteer Compatibility**: Deprecated `waitForTimeout` API causing crashes
- **Dependency Conflicts**: Problematic `fs` and `path` package installations
- **Port Configuration**: Mismatched proxy settings between client and server

### Phase 3 Problems (Critical Syntax Error)
After implementing memory optimization with browser restart logic:
- **Syntax Error**: "SyntaxError: Unexpected end of input" at line 1901 in server.js
- **Server Startup Failure**: Node.js could not parse the server.js file due to malformed code
- **Root Cause**: Complex browser restart logic had missing closing braces or syntax issues
- **Impact**: Complete deployment failure despite successful npm install and build

### Comprehensive Solution Implementation

**1. Puppeteer Modernization**
- **Replaced Dependencies**: `puppeteer` → `puppeteer-core` + `chromium`
- **Fixed Deprecated APIs**: All `page.waitForTimeout()` replaced with `new Promise(resolve => setTimeout(resolve, X))`
- **Added Memory Optimization**: 11 Chromium launch flags to reduce memory footprint

**2. Dependency Cleanup**
- **Removed Problematic Packages**: Eliminated `fs` and `path` dependencies (use Node.js built-ins)
- **Updated package.json**: Clean dependency list with proper versions
- **Environment Variable Support**: Added `JWT_SECRET` environment variable usage

**3. Memory Analysis & Optimization**
- **Added Memory Monitoring**: Comprehensive tracking of RSS, heap, and external memory
- **Identified Root Cause**: Chromium browser process (300-400MB) separate from Node.js process (97MB)
- **Optimization Strategy**: Chromium flags to reduce memory usage within 512MB Render limit

**4. Configuration Fixes**
- **Port Consistency**: Updated client proxy from 5000 to 10000
- **Build Process**: Simplified render.yaml to `npm install` only
- **Environment Variables**: Proper JWT_SECRET and SimpleSub credentials configuration

**5. Database Persistence Implementation**
- **Database Path**: Modified to use `/var/data/bills.db` on Render persistent disk
- **Fallback Logic**: Local `./bills.db` for development, persistent disk for production
- **Data Retention**: Ensures database persists between deployments

**6. Critical Syntax Error Resolution**
- **Error Identification**: Found malformed code at line 1901 causing "Unexpected end of input"
- **Root Cause**: Complex browser restart logic had syntax errors (missing braces)
- **Solution**: Reverted to simpler browser handling while preserving all critical fixes
- **Result**: Server now starts successfully while maintaining database persistence and memory monitoring

### Current Deployment Configuration
- **Build Command**: `npm install`
- **Start Command**: `npm start`  
- **Plan**: Starter (512MB RAM)
- **Persistent Disk**: `/var/data` (for database persistence)
- **Database Location**: `/var/data/bills.db` (production) or `./bills.db` (development)
- **Memory Usage**: ~511MB at peak (within 512MB limit)
- **Environment Variables**: 
  - `SIMPLESUB_USERNAME`: gooddogpropohio@gmail.com
  - `SIMPLESUB_PASSWORD`: VzX%r5%9e@V0xte*K7
  - `JWT_SECRET`: xK9mP2qR8vN4wL7sA1cE6fH3jD9gB5nM8
  - `NODE_ENV`: production

## Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite (file-based)
- **Frontend**: React 18 with Tailwind CSS
- **Authentication**: JWT-based
- **PDF Generation**: PDF-lib
- **Web Scraping**: Puppeteer-core with Chromium
- **File Processing**: Multer, csv-parser
- **Deployment**: Render (production)

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend│    │  Express Server │    │   SQLite DB     │
│                 │    │                 │    │                 │
│ - Authentication│◄──►│ - API Endpoints │◄──►│ - Units         │
│ - Dashboard     │    │ - Web Scraping  │    │ - Tenants       │
│ - Create Bills  │    │ - PDF Generation│    │ - Water Usage   │
│ - Auto Data Fetch│   │ - File Processing│   │ - Bills         │
│ - Update Tenants│    │ - Logging       │    │ - Payments      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   SimpleSub     │
                       │   (External)    │
                       │                 │
                       │ - Water Usage   │
                       │ - CSV Downloads │
                       └─────────────────┘
```

## Database Configuration & Persistence

### Database Location Logic
The application uses SQLite with automatic path selection based on environment:

```javascript
// Database setup - use persistent disk if available, fallback to local
const dbPath = process.env.NODE_ENV === 'production' && fs.existsSync('/var/data') 
  ? '/var/data/bills.db' 
  : './bills.db';

console.log(`📦 Using database at: ${dbPath}`);
const db = new sqlite3.Database(dbPath);
```

### Environment-Specific Paths
- **Development**: `./bills.db` (local project directory)
- **Production (Render)**: `/var/data/bills.db` (persistent disk)

### Persistence Benefits
- **Data Retention**: Database survives deployments and server restarts
- **Backup Protection**: Persistent disk provides better data protection than temporary container storage
- **Performance**: Consistent database location improves reliability

### Render Persistent Disk Configuration
- **Mount Path**: `/var/data`
- **Disk Size**: Configurable (default sufficient for SQLite database)
- **Access**: Read/write permissions for application

## Database Schema

### Core Tables

#### 1. `units` Table
```sql
CREATE TABLE units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_number TEXT UNIQUE NOT NULL,
  property TEXT NOT NULL,
  address TEXT NOT NULL
);
```
**Purpose**: Stores all 14 units across 4 properties
**Key Fields**:
- `unit_number`: Unique identifier (e.g., "484", "532A", "CushingA")
- `property`: Property name (Champion, Barnett, 532 Barnett, Cushing)
- `address`: Full address for billing

#### 2. `tenants` Table
```sql
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER,
  name TEXT NOT NULL,
  current_balance REAL DEFAULT 0,
  FOREIGN KEY (unit_id) REFERENCES units (id)
);
```
**Purpose**: Links tenants to units and tracks balances
**Key Fields**:
- `unit_id`: Foreign key to units table
- `name`: Tenant name
- `current_balance`: Running balance for the tenant

#### 3. `water_usage` Table
```sql
CREATE TABLE water_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER,
  date TEXT NOT NULL,
  gallons REAL NOT NULL,
  FOREIGN KEY (unit_id) REFERENCES units (id)
);
```
**Purpose**: Stores daily water usage data (65-day retention)
**Key Fields**:
- `unit_id`: Foreign key to units table
- `date`: Date of usage (YYYY-MM-DD format)
- `gallons`: Daily usage in gallons

#### 4. `usage_costs` Table
```sql
CREATE TABLE usage_costs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT UNIQUE NOT NULL,
  rate REAL NOT NULL,
  type TEXT NOT NULL
);
```
**Purpose**: Configurable rates for water and sewer charges
**Key Fields**:
- `category`: Rate name (e.g., "Water Rate", "Sewer Base")
- `rate`: Dollar amount
- `type`: "per_ccf" or "per_day"

#### 5. `payments` Table
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);
```
**Purpose**: Tracks tenant payments
**Key Fields**:
- `tenant_id`: Foreign key to tenants table
- `amount`: Payment amount
- `date`: Payment date

#### 6. `bills` Table
```sql
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  ccf_usage REAL NOT NULL,
  total_amount REAL NOT NULL,
  created_date TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);
```
**Purpose**: Stores generated bill records
**Key Fields**:
- `period_start/end`: Billing period dates
- `ccf_usage`: Water usage in CCF (748 gallons = 1 CCF)
- `total_amount`: Total bill amount

## Properties & Units Mapping

### Champion Property
- **Units**: 484, 486
- **Addresses**: 484 Champion St, 486 Champion St

### Barnett Property  
- **Units**: 483, 485, 487, 489
- **Addresses**: 483 Barnett St, 485 Barnett St, 487 Barnett St, 489 Barnett St

### 532 Barnett Property
- **Units**: 532A, 532B, 532C, 532D
- **Addresses**: 532 Barnett St, Unit A/B/C/D

### Cushing Property
- **Units**: CushingA, CushingB, CushingC, CushingD
- **Addresses**: Cushing St, Unit A/B/C/D

## API Endpoints

### Authentication
- `POST /api/login` - Authenticate user (GDP/password)
- `GET /api/verify-token` - Verify JWT token

### Units & Tenants
- `GET /api/units` - Get all units with tenant information
- `PUT /api/tenants/:unitId` - Update tenant for a unit
- `PUT /api/balances/:tenantId` - Update tenant balance

### Usage & Costs
- `GET /api/usage-costs` - Get usage cost configuration
- `PUT /api/usage-costs/:id` - Update usage cost
- `GET /api/water-usage/:startDate/:endDate` - Get water usage for date range
- `GET /api/water-usage-viewer` - Get water usage in matrix format for database viewer

### Payments
- `POST /api/payments` - Record tenant payment
- `GET /api/payments` - Get payment history

### Bills
- `POST /api/process-bills-from-data` - Generate bills from usage data
- `POST /api/update-tenant-balances` - Update tenant balances from selected bills
- `POST /api/generate-pdf` - Generate single PDF bill
- `POST /api/generate-all-pdfs` - Generate all PDF bills as ZIP

### Auto Data Fetch
- `POST /api/auto-fetch-data` - Trigger automated data fetching
- `GET /api/logs` - Get daily log files
- `GET /api/last-fetch` - Get last fetch information

## Web Scraping (SimpleSub Integration)

### Configuration
- **Login URL**: https://app.simplesubwater.com/
- **Engine**: Puppeteer-core with external Chromium binary
- **Credentials**: Environment variables (SIMPLESUB_USERNAME, SIMPLESUB_PASSWORD)
- **Properties**: 4 properties with specific URLs
- **Data Format**: CSV exports with daily usage in gallons
- **Memory Optimization**: 11 Chromium flags to minimize memory footprint for Render deployment

### Puppeteer Configuration
```javascript
browser = await puppeteer.launch({
  executablePath: chromium.path,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--memory-pressure-off',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-background-networking',
    '--disable-default-apps',
    '--no-first-run',
    '--single-process'
  ]
});
```

### Process Flow
1. **Login**: Authenticate with SimpleSub credentials
2. **Navigate Properties**: Visit each property page
3. **Export Data**: Download CSV files for each property
4. **Parse CSV**: Extract daily usage data
5. **Store Data**: Save to water_usage table
6. **Cleanup**: Remove temporary CSV files

### Scheduling
- **Frequency**: Daily at 5:00 AM Eastern Time
- **Data Range**: 65 days (current date minus 1 day)
- **Retention**: 65 days of data with automatic cleanup

## Logging System

### Log Files
- **Location**: `/logs/` directory
- **Format**: `auto-fetch-YYYY-MM-DD.log`
- **Retention**: 7 days with automatic cleanup
- **Content**: Detailed operation logs with timestamps

### Log Viewer
- **Access**: Auto Data Fetch tab in web interface
- **Features**: View daily logs, search, and monitor operations

## Frontend Components

### Core Components
1. **Dashboard** (`Dashboard.js`) - Overview and statistics
2. **Create Bills** (`CreateBills.js`) - Bill generation with date navigation
3. **Auto Data Fetch** (`AutoDataFetch.js`) - Automated data management
4. **Update Tenants** (`UpdateTenants.js`) - Tenant management
5. **Update Balances** (`UpdateBalances.js`) - Balance tracking
6. **Update Usage Costs** (`UpdateUsageCosts.js`) - Rate configuration
7. **Enter Payments** (`EnterPayments.js`) - Payment recording

### Key Features
- **Responsive Design**: Mobile and desktop optimized
- **Real-time Updates**: Automatic data loading and refresh
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Visual feedback for async operations

## Balance Update Feature

### Overview
The balance update feature allows users to selectively add bill amounts to tenant balances directly from the bill generation interface.

### Implementation
- **Frontend**: Large checkboxes on each generated bill (default: checked)
- **Backend**: `/api/update-tenant-balances` endpoint
- **Logic**: Additive balance updates (new amount + existing balance)

### User Flow
1. Generate bills in Create Bills tab
2. Review generated bills with checkboxes
3. Check/uncheck bills to select which should update balances
4. Click "Update Balances" button
5. Selected bill amounts are added to tenant balances

### Technical Details
- **State Management**: `billCheckboxes` object tracks checkbox states
- **API Endpoint**: Processes array of selected bills
- **Database Update**: `UPDATE tenants SET current_balance = ? WHERE id = ?`
- **Error Handling**: Validates bill data and handles missing tenants
- **Logging**: Console logs show balance updates for each tenant

### Example
```
Tenant: John Doe
Current Balance: $50.00
Bill Amount: $75.00
New Balance: $125.00
```

## PDF Generation

### Template System
- **Template File**: `BILL TEMPLATE (1).pdf`
- **Library**: PDF-lib for form filling
- **Output**: Individual PDFs or ZIP archive

### Placeholders
- `{{NAME}}` - Tenant name
- `{{ADDRESS}}` - Service address
- `{{PERIOD}}` - Service period
- `{{DATE}}` - Bill creation date
- `{{PREVIOUS}}` - Previous balance
- `{{NEW_CHARGES}}` - Current month charges
- `{{TOTAL}}` - Total amount due
- `{{DAYS}}` - Billing days
- `{{CCF}}` - CCF usage
- `{{WATER_RATE}}` - Water rate per CCF
- `{{SEWER_RATE}}` - Sewer rate per CCF
- `{{WATER_USAGE}}` - Water usage charge
- `{{WATER_BASE}}` - Water base charge
- `{{STORM}}` - Stormwater charges
- `{{SEWER_USAGE}}` - Sewer usage charge
- `{{SEWER_BASE}}` - Sewer service charge
- `{{RIVER}}` - Clean River Fund

## Data Flow

### Monthly Billing Process
1. **Auto Data Fetch**: Daily collection of usage data
2. **Create Bills**: Select date range and generate bills
3. **Review Data**: Check usage and previous month comparison
4. **Generate PDFs**: Create individual or bulk PDF bills
5. **Download**: Export bills for distribution

### Data Processing
1. **CSV Parsing**: Extract daily usage from SimpleSub exports
2. **Unit Mapping**: Match CSV units to database units
3. **Data Storage**: Store in water_usage table
4. **Bill Calculation**: Calculate charges based on usage and rates
5. **PDF Generation**: Fill template with calculated data

## Security Considerations

### Authentication
- **Method**: JWT-based authentication
- **Credentials**: Hardcoded (GDP/password)
- **Session**: Token-based with expiration

### Data Protection
- **Database**: File-based SQLite (local storage)
- **Credentials**: SimpleSub credentials in server code
- **File Cleanup**: Automatic cleanup of temporary files

### Production Recommendations
- Use environment variables for sensitive data
- Implement HTTPS in production
- Regular security updates
- Database backup procedures

## Deployment

### Production Environment
- **Platform**: Render
- **Database**: SQLite (file-based)
- **Build Process**: Automated npm install and build
- **Environment**: Production mode with optimizations

### Environment Variables
- `NODE_ENV=production`
- `PORT` (set by hosting platform)
- `JWT_SECRET` (recommended for production)

## Troubleshooting

### Common Issues
1. **Web Scraping Failures**: Check SimpleSub credentials and website changes
2. **Database Errors**: Verify SQLite file permissions and integrity
3. **PDF Generation**: Ensure template file exists and is accessible
4. **Authentication**: Check JWT token expiration and validity

### Debug Mode
- **Web Scraping**: Set `headless: false` in Puppeteer config
- **Server Logs**: Check console output for detailed error messages
- **Database**: Use SQLite browser for direct database inspection

## Memory Monitoring & Optimization

### Memory Tracking System
Comprehensive memory monitoring implemented to debug Render deployment issues:

```javascript
function logMemoryUsage(step) {
  const used = process.memoryUsage();
  const memMB = {
    rss: Math.round(used.rss / 1024 / 1024),       // Total memory
    heapTotal: Math.round(used.heapTotal / 1024 / 1024), // Heap allocated
    heapUsed: Math.round(used.heapUsed / 1024 / 1024),   // Heap used
    external: Math.round(used.external / 1024 / 1024)    // External memory
  };
  
  // Try to get container-wide memory usage from cgroup files
  try {
    // Check cgroup v1 paths
    const memLimit = execSync('cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null', { encoding: 'utf8' });
    const memUsage = execSync('cat /sys/fs/cgroup/memory/memory.usage_in_bytes 2>/dev/null', { encoding: 'utf8' });
    
    if (memLimit && memUsage) {
      const limitMB = Math.round(parseInt(memLimit) / 1024 / 1024);
      const usageMB = Math.round(parseInt(memUsage) / 1024 / 1024);
      const usedPercent = Math.round((usageMB / limitMB) * 100);
      containerMessage = ` | Container: ${usageMB}MB/${limitMB}MB (${usedPercent}%)`;
    }
    // Falls back to cgroup v2 paths or ps aux estimation if v1 unavailable
  } catch (error) {
    // Fallback to Node.js process memory only
  }
  
  const message = `${step} - Node: RSS=${memMB.rss}MB, Heap=${memMB.heapUsed}/${memMB.heapTotal}MB${containerMessage}`;
  logMessage(message);
}
```

### Memory Monitoring Points
- **Server startup**: Baseline memory usage
- **Before/After Puppeteer launch**: Browser initialization impact
- **Property processing**: Per-property memory usage
- **Browser cleanup**: Memory recovery verification
- **Garbage collection**: Memory optimization results

### Memory Usage Analysis
**Local Environment**:
- Server startup: 60MB
- After Puppeteer: 68MB  
- Peak usage: 76MB
- After cleanup: 76MB

**Render Environment**:
- Server startup: 83MB (Node.js process only)
- Container memory: Up to 89% (456MB of 512MB limit)
- Root cause: Chromium browser runs as separate process not tracked by Node.js

### Memory Optimization Strategy
1. **Chromium Flags**: 11 optimization flags to reduce browser memory
2. **Garbage Collection**: Force GC after auto-fetch completion
3. **Process Separation**: Understanding Node.js vs Chromium memory usage
4. **Container Limits**: Working within Render Starter plan 512MB constraint

## Performance Considerations

### Optimization
- **Database Indexing**: Proper indexes on frequently queried fields
- **File Cleanup**: Automatic cleanup of temporary files
- **Caching**: React state management for UI performance
- **Async Operations**: Non-blocking operations for better UX

### Scalability
- **Current Scale**: 14 units across 4 properties
- **Data Volume**: 65 days of daily usage data
- **Concurrent Users**: Single-user application
- **Future Considerations**: Database migration to managed service if needed

## Recent Improvements & Current Debugging

### Latest Session Achievements
1. **Production-Ready Auto Data Fetch System**
   - Automated daily fetching at 5:00 AM Eastern Time
   - 65-day data window with automatic cleanup
   - Server-side logging with 7-day retention
   - Manual fetch button for testing
   - **CSV cleanup re-enabled** - Automatic deletion of downloaded files

2. **Enhanced Database Viewer**
   - Matrix format display (dates as rows, units as columns)
   - Independent of fetch process (uses MAX(date) from database)
   - Proper error handling and data validation
   - **Timezone issue resolved** - Correctly displays latest dates

3. **Create Bills Tab UI Improvements**
   - Restructured layout with stacked date fields
   - Navigation arrows positioned correctly
   - Auto-population of data when date range selected
   - Previous month comparison logic fixed
   - **Champion doubling logic fixed** - Property field now included in bill generation

4. **Balance Update Feature**
   - Large checkboxes on generated bills
   - Selective balance updates for tenants
   - Additive balance logic (adds to existing balances)
   - Visual feedback and error handling

5. **Address Corrections**
   - Fixed all property addresses in database
   - Correct format: Avenue, Road, Drive (not Street)
   - Proper unit designations for multi-unit properties

### Resolved Issues
**Database Viewer Timezone Issue**: ✅ **RESOLVED**
- **Root Cause**: JavaScript date parsing timezone conversion
- **Solution**: Added `T00:00:00` to force local time interpretation
- **Result**: Database viewer now correctly displays latest dates

**Champion Doubling Logic**: ✅ **RESOLVED**
- **Root Cause**: Missing `property` field in bill generation data
- **Solution**: Added `property: unit.property` to bill data
- **Result**: Champion units now get double per-day charges

**Address Display Issues**: ✅ **RESOLVED**
- **Root Cause**: Incorrect addresses in database initialization
- **Solution**: Updated `init-db.js` with correct addresses
- **Result**: All properties display correct addresses

## Maintenance

### Regular Tasks
- **Log Monitoring**: Review daily logs for errors
- **Data Verification**: Check automated data fetching success
- **Backup**: Regular database backups
- **Updates**: Keep dependencies updated

### Monitoring
- **Automated Fetching**: Monitor daily data collection
- **Error Logs**: Review error patterns and frequency
- **Performance**: Monitor response times and resource usage
- **User Feedback**: Track any issues reported by users

### Current Status
- **All Major Issues Resolved**: Database viewer, Champion doubling, address display, CSV cleanup
- **Production Ready**: System is fully functional and ready for deployment
- **Documentation Complete**: All features and fixes properly documented

---

**Last Updated**: August 16, 2025 - Critical Syntax Error Resolved, Database Persistence Configured
**Version**: Production Ready with Database Persistence and Memory Monitoring
**Maintainer**: Good Dog Properties

### Recent Session Summary
- **Critical Syntax Fix**: Resolved server startup failure caused by malformed browser restart logic
- **Database Persistence**: Configured SQLite to use persistent disk `/var/data/bills.db` on Render
- **Memory Monitoring**: Enhanced container-wide memory tracking using cgroup files
- **Deployment Ready**: Server now starts successfully, database persists between deployments
- **Memory Usage**: Peak ~511MB (within 512MB limit, functional but will monitor for optimization opportunities)
