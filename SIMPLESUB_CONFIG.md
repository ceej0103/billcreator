# SimpleSub Web Scraping Configuration

The bill creator now uses web scraping to automatically fetch water usage data from the SimpleSub website. This approach logs into your SimpleSub account and downloads usage data for each property.

## How It Works

1. **Login**: Automatically logs into SimpleSub using your credentials
2. **Property Navigation**: Visits each property page
3. **Usage Tab**: Clicks the "Usage" tab for each property
4. **Date Selection**: Sets the date range for the requested period
5. **Data Export**: Clicks "Export to Spreadsheet" to download CSV data
6. **Data Processing**: Parses the CSV files and stores data in the database

## Configuration

The system is pre-configured with your SimpleSub credentials and property URLs:

### Login Credentials
- **Username**: gooddogpropohio@gmail.com
- **Password**: VzX%r5%9e@V0xte*K7
- **Login URL**: https://app.simplesubwater.com/

### Property URLs
- **Barnett (483-489)**: https://app.simplesubwater.com/properties/3a0baf1f-4a10-4422-83a9-b26306ee70f5
- **532 Barnett**: https://app.simplesubwater.com/properties/41b988a0-d59f-471e-89b7-9b2b023fe4ff
- **Champion**: https://app.simplesubwater.com/properties/14e278ff-33c4-4e7b-9229-30cc4cb03a6e
- **Cushing**: https://app.simplesubwater.com/properties/977f14ba-2a4c-4f1f-9c98-1b93554a4e2a

## Requirements

### Dependencies
The system requires Puppeteer for web scraping:
```bash
npm install puppeteer
```

### Browser Requirements
- Puppeteer will automatically download and use Chromium
- No additional browser installation required
- Runs in headless mode (no visible browser window)

## Testing the Connection

To test the web scraping functionality:

1. **Install dependencies**: Run `npm install` to install Puppeteer
2. **Run Auto Data Fetch**: Use the Auto Data Fetch feature in the web app
3. **Check logs**: Monitor the server console for scraping progress
4. **Verify data**: Check that water usage data is stored in the database

## Troubleshooting

### Common Issues

1. **Login Failures**: 
   - Verify credentials are correct
   - Check if SimpleSub requires 2FA
   - Ensure the login page structure hasn't changed

2. **Element Not Found**:
   - The website structure may have changed
   - Check console logs for specific error messages
   - May need to update selectors

3. **Download Issues**:
   - Ensure the `downloads` folder is created
   - Check file permissions
   - Verify CSV files are being generated

### Debug Mode

To run in debug mode (visible browser):
```javascript
// In server.js, change headless: true to headless: false
browser = await puppeteer.launch({
  headless: false, // This will show the browser window
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

## Security Notes

- Credentials are hardcoded in the server file
- Consider using environment variables for production
- The system runs in headless mode for security
- Downloaded files are automatically cleaned up after processing

## Data Flow

1. **Auto Data Fetch** → Triggers web scraping
2. **Login to SimpleSub** → Authenticates with your account
3. **Navigate Properties** → Visits each property page
4. **Export Data** → Downloads CSV files for each property
5. **Parse CSV** → Extracts water usage data
6. **Store in Database** → Saves data to water_usage table
7. **Cleanup** → Removes temporary CSV files
