# Good Dog Properties - Water Bill Management System

A modern web application for managing water bills for Good Dog Properties' 14 units across 4 properties. This system handles CSV data processing, bill generation, PDF creation, and tenant management.

## Features

- **Tenant Management**: Update tenant information for all units
- **Balance Management**: Set and track current balances for tenants
- **Usage Cost Configuration**: Configure water and sewer rates (per CCF and per day)
- **Payment Tracking**: Record tenant payments and update balances
- **CSV Processing**: Upload and process water usage data from CSV files
- **Bill Generation**: Generate individual and bulk PDF bills
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite (file-based, perfect for free hosting)
- **Frontend**: React with Tailwind CSS
- **PDF Generation**: PDF-lib for filling PDF templates
- **File Processing**: Multer for CSV uploads, csv-parser for data parsing
- **Deployment**: Ready for free hosting platforms (Vercel, Netlify, Railway)

## Properties & Units

The system manages 14 units across 4 properties:

- **Champion**: 484, 486
- **Barnett**: 483, 485, 487, 489
- **532 Barnett**: A, B, C, D
- **Cushing**: A, B, C, D

## CSV Data Format

The system expects CSV files with the following structure:
- Date column with "Date (America/New_York)" header
- Unit columns with "(gal)" suffix (e.g., "484 (gal)", "A (gal)")
- Total row with usage data in gallons
- System automatically converts gallons to CCF (748 gallons = 1 CCF)

## Setup Instructions

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
   ```bash
   cd BILLCREATOR
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

### Development Mode

- Backend runs on port 5000
- Frontend development server runs on port 3000
- Proxy is configured to forward API calls to the backend

## Usage Workflow

### 1. Initial Setup
1. **Update Tenants**: Assign tenant names to all units
2. **Update Balances**: Set current balances for existing tenants
3. **Update Usage Costs**: Configure water and sewer rates

### 2. Monthly Billing Process
1. **Enter Payments**: Record any payments received from tenants
2. **Create Bills**: Upload CSV usage data and generate bills
3. **Review & Download**: Preview bills and download PDFs

## Deployment

### Free Hosting Options

#### Option 1: Railway (Recommended)
1. Create account at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will automatically detect the Node.js app
4. Set environment variables if needed
5. Deploy!

#### Option 2: Render
1. Create account at [render.com](https://render.com)
2. Create a new Web Service
3. Connect your repository
4. Set build command: `npm install && cd client && npm install && npm run build`
5. Set start command: `npm start`

#### Option 3: Heroku
1. Create account at [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Run: `heroku create your-app-name`
4. Run: `git push heroku main`

### Environment Variables

For production deployment, you may want to set:
- `PORT`: Port number (usually set automatically by hosting platform)
- `NODE_ENV`: Set to "production"

## File Structure

```
BILLCREATOR/
├── server.js              # Main Express server
├── package.json           # Backend dependencies
├── bills.db              # SQLite database (created automatically)
├── BILL TEMPLATE (1).pdf # PDF template for bills
├── *.csv                 # Sample CSV files
├── client/               # React frontend
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.js
│   │   └── index.js
│   └── tailwind.config.js
└── README.md
```

## API Endpoints

- `GET /api/units` - Get all units with tenant information
- `PUT /api/tenants/:unitId` - Update tenant for a unit
- `PUT /api/balances/:tenantId` - Update tenant balance
- `GET /api/usage-costs` - Get usage cost configuration
- `PUT /api/usage-costs/:id` - Update usage cost
- `POST /api/payments` - Record tenant payment
- `POST /api/process-bills` - Process CSV files and generate bills
- `POST /api/generate-pdf` - Generate single PDF bill
- `POST /api/generate-all-pdfs` - Generate all PDF bills as ZIP

## Database Schema

### Units Table
- `id` (Primary Key)
- `unit_number` (Text)
- `property` (Text)
- `address` (Text)

### Tenants Table
- `id` (Primary Key)
- `unit_id` (Foreign Key)
- `name` (Text)
- `current_balance` (Real)

### Usage Costs Table
- `id` (Primary Key)
- `category` (Text)
- `rate` (Real)
- `type` (Text: 'per_ccf' or 'per_day')

### Payments Table
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `amount` (Real)
- `date` (Text)

### Bills Table
- `id` (Primary Key)
- `tenant_id` (Foreign Key)
- `period_start` (Text)
- `period_end` (Text)
- `ccf_usage` (Real)
- `total_amount` (Real)
- `created_date` (Text)

## PDF Template Placeholders

The system fills the following placeholders in the PDF template:
- `{{NAME}}` - Tenant name
- `{{ADDRESS}}` - Service address
- `{{PERIOD}}` - Service period
- `{{DATE}}` - Bill creation date
- `{{PREVIOUS}}` - Previous balance
- `{{NEW_CHARGES}}` - Current month charges total
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

## Troubleshooting

### Common Issues

1. **CSV Upload Fails**
   - Ensure CSV files have the correct column headers
   - Check that unit numbers match the expected format
   - Verify files are not corrupted

2. **PDF Generation Fails**
   - Ensure the PDF template file is present
   - Check that all placeholder fields exist in the template
   - Verify PDF template is not password protected

3. **Database Issues**
   - Delete `bills.db` file to reset the database
   - Restart the application to recreate tables

### Development Tips

- Use browser developer tools to check API responses
- Check server console for error messages
- Verify CSV data format matches expected structure
- Test with sample data before using production data

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the CSV format requirements
3. Verify all dependencies are installed correctly
4. Check browser console and server logs for error messages

## License

This project is created for Good Dog Properties. All rights reserved. 