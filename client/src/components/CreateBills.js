import React, { useState, useEffect } from 'react';
import { Calendar, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

function CreateBills() {
  const [units, setUnits] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [waterUsage, setWaterUsage] = useState({});
  const [previousMonthUsage, setPreviousMonthUsage] = useState({});
  const [bills, setBills] = useState([]);
  const [billCheckboxes, setBillCheckboxes] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingBills, setIsGeneratingBills] = useState(false);
  const [isUpdatingBalances, setIsUpdatingBalances] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUnits();
    // Pre-populate date range based on current date
    const { startDate: suggestedStart, endDate: suggestedEnd } = calculateSuggestedDateRange();
    setStartDate(suggestedStart);
    setEndDate(suggestedEnd);
    
    // Immediately fetch water usage data for the suggested date range
    if (suggestedStart && suggestedEnd) {
      fetchWaterUsageForDates(suggestedStart, suggestedEnd);
    }
  }, []);

  // Auto-load usage data when both dates are set
  useEffect(() => {
    if (startDate && endDate) {
      fetchWaterUsage();
    }
  }, [startDate, endDate]);

  const calculateSuggestedDateRange = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Always assume 2 months back from current month
    // 2 months ago 26th to 1 month ago 25th
    const start = new Date(currentYear, currentMonth - 2, 26);
    const end = new Date(currentYear, currentMonth - 1, 25);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const fetchUnits = async () => {
    try {
      const response = await axios.get('/api/units');
      setUnits(response.data);
    } catch (error) {
      console.error('Error fetching units:', error);
      setError('Failed to fetch units');
    }
  };

  const fetchWaterUsageForDates = async (start, end) => {
    if (!start || !end) {
      setError('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Fetch current period usage
      const response = await axios.get(`/api/water-usage/${start}/${end}`);
      const usageData = {};
      response.data.forEach(unit => {
        const key = `${unit.property}-${unit.unit_number}`;
        usageData[key] = unit;
      });
      setWaterUsage(usageData);
      
      // Fetch previous month usage for comparison
      await fetchPreviousMonthUsageForDates(start, end);
    } catch (error) {
      console.error('Error fetching water usage:', error);
      setError('Failed to fetch water usage data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWaterUsage = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Fetch current period usage
      const response = await axios.get(`/api/water-usage/${startDate}/${endDate}`);
      const usageData = {};
      response.data.forEach(unit => {
        const key = `${unit.property}-${unit.unit_number}`;
        usageData[key] = unit;
      });
      setWaterUsage(usageData);
      
      // Fetch previous month usage for comparison
      await fetchPreviousMonthUsage();
    } catch (error) {
      console.error('Error fetching water usage:', error);
      setError('Failed to fetch water usage data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBillingDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  };

  const calculatePreviousMonthRange = () => {
    if (!startDate || !endDate) return { start: null, end: null };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // For typical billing periods (26th to 25th), calculate the previous month
    // Previous month should be: 26th of month before start month to 25th of start month
    const previousStart = new Date(start.getFullYear(), start.getMonth() - 1, 26);
    const previousEnd = new Date(start.getFullYear(), start.getMonth(), 25);
    
    return {
      start: previousStart.toISOString().split('T')[0],
      end: previousEnd.toISOString().split('T')[0]
    };
  };

  const navigatePeriod = (direction) => {
    if (!startDate || !endDate) return;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (direction === 'left') {
      // Move back one period (subtract one month from both dates)
      start.setMonth(start.getMonth() - 1);
      end.setMonth(end.getMonth() - 1);
    } else {
      // Move forward one period (add one month to both dates)
      start.setMonth(start.getMonth() + 1);
      end.setMonth(end.getMonth() + 1);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const fetchPreviousMonthUsageForDates = async (start, end) => {
    if (!start || !end) return;
    
    // Calculate previous month range based on provided dates
    const startDate = new Date(start);
    const previousStart = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 26);
    const previousEnd = new Date(startDate.getFullYear(), startDate.getMonth(), 25);
    
    const previousRange = {
      start: previousStart.toISOString().split('T')[0],
      end: previousEnd.toISOString().split('T')[0]
    };
    
    if (!previousRange.start || !previousRange.end) return;
    
    try {
      const response = await axios.get(`/api/water-usage/${previousRange.start}/${previousRange.end}`);
      const usageData = {};
      response.data.forEach(unit => {
        const key = `${unit.property}-${unit.unit_number}`;
        usageData[key] = unit;
      });
      setPreviousMonthUsage(usageData);
    } catch (error) {
      console.error('Error fetching previous month usage:', error);
      // Don't set error state for previous month - it's optional
    }
  };

  const fetchPreviousMonthUsage = async () => {
    if (!startDate || !endDate) return;
    
    const previousRange = calculatePreviousMonthRange();
    if (!previousRange.start || !previousRange.end) return;
    
    try {
      const response = await axios.get(`/api/water-usage/${previousRange.start}/${previousRange.end}`);
      const usageData = {};
      response.data.forEach(unit => {
        const key = `${unit.property}-${unit.unit_number}`;
        usageData[key] = unit;
      });
      setPreviousMonthUsage(usageData);
    } catch (error) {
      console.error('Error fetching previous month usage:', error);
      // Don't set error state for previous month - it's optional
    }
  };

  const generateBills = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    setIsGeneratingBills(true);
    setError('');

    try {
      // Prepare bill data for each unit
      const billData = units.map(unit => {
        const key = `${unit.property}-${unit.unit_number}`;
        const usage = waterUsage[key];
        const totalGallons = usage ? usage.total_gallons : 0;
        const ccfUsage = totalGallons / 748; // Convert gallons to CCF

        return {
          tenant_id: unit.tenant_id,
          tenant_name: unit.name || 'No Tenant',
          unit_number: unit.unit_number,
          property: unit.property,
          address: unit.address,
          period_start: startDate,
          period_end: endDate,
          ccf_usage: ccfUsage,
          billing_days: calculateBillingDays(),
          total_gallons: totalGallons
        };
      });

      // Process bills through the existing endpoint
      const response = await axios.post('/api/process-bills-from-data', {
        bills: billData
      });

      setBills(response.data.bills);
    } catch (error) {
      console.error('Error generating bills:', error);
      setError('Failed to generate bills');
    } finally {
      setIsGeneratingBills(false);
    }
  };

  const downloadAllBills = async () => {
    if (bills.length === 0) {
      setError('No bills to download');
      return;
    }

    try {
      const response = await axios.post('/api/generate-all-pdfs', { bills }, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'all_bills.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading bills:', error);
      setError('Failed to download bills');
    }
  };

  // Handle checkbox changes for bill balance updates
  const handleBillCheckboxChange = (billIndex, checked) => {
    setBillCheckboxes(prev => ({
      ...prev,
      [billIndex]: checked
    }));
  };

  // Initialize checkboxes when bills are generated
  useEffect(() => {
    if (bills.length > 0) {
      const initialCheckboxes = {};
      bills.forEach((_, index) => {
        initialCheckboxes[index] = true; // Default to checked
      });
      setBillCheckboxes(initialCheckboxes);
    }
  }, [bills]);

  // Update tenant balances for selected bills
  const updateTenantBalances = async () => {
    const selectedBills = bills.filter((_, index) => billCheckboxes[index]);
    
    if (selectedBills.length === 0) {
      setError('No bills selected for balance update');
      return;
    }

    setIsUpdatingBalances(true);
    setError('');

    try {
      const response = await axios.post('/api/update-tenant-balances', {
        bills: selectedBills
      });

      if (response.data.success) {
        setError(''); // Clear any previous errors
        // You could add a success message here
        console.log('Balances updated successfully');
      }
    } catch (error) {
      console.error('Error updating balances:', error);
      setError('Failed to update tenant balances');
    } finally {
      setIsUpdatingBalances(false);
    }
  };

  const formatDate = (dateString) => {
    // Ensure the date is parsed correctly by adding timezone info
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create Bills</h1>
        <p className="mt-2 text-gray-600">
          Select a date range and generate water bills for all units
        </p>
      </div>

      {/* Date Range Selection */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Billing Period</h2>
        <p className="text-sm text-gray-600 mb-4">
          Date range has been automatically suggested based on the current date. You can modify it if needed.
        </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
             <div>
               <div className="flex items-center mb-2">
                 <label className="block text-sm font-medium text-gray-700">
                   Start Date
                 </label>
                 <div className="flex space-x-1 ml-2">
                   <button
                     onClick={() => navigatePeriod('left')}
                     disabled={!startDate || !endDate}
                     className={`p-1.5 rounded-md transition-all duration-200 ${
                       !startDate || !endDate
                         ? 'text-gray-300 cursor-not-allowed'
                         : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200'
                     }`}
                     title="Previous Period"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                     </svg>
                   </button>
                   <button
                     onClick={() => navigatePeriod('right')}
                     disabled={!startDate || !endDate}
                     className={`p-1.5 rounded-md transition-all duration-200 ${
                       !startDate || !endDate
                         ? 'text-gray-300 cursor-not-allowed'
                         : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200'
                     }`}
                     title="Next Period"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                   </button>
                 </div>
               </div>
               <input
                 type="date"
                 value={startDate}
                 onChange={(e) => setStartDate(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
             </div>
             
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 End Date
               </label>
               <input
                 type="date"
                 value={endDate}
                 onChange={(e) => setEndDate(e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
             </div>
           </div>
           
           <div>
             {startDate && endDate ? (
               <div className="p-4 bg-blue-50 rounded-lg h-full">
                 <div className="space-y-3">
                   <div>
                     <p className="text-sm text-blue-800">
                       <strong>Billing Period:</strong><br />
                       {formatDate(startDate)} - {formatDate(endDate)}
                     </p>
                   </div>
                   <div>
                     <p className="text-sm text-blue-800">
                       <strong>Billing Days:</strong><br />
                       {calculateBillingDays()} days
                     </p>
                   </div>
                   <div>
                     <p className="text-sm text-blue-800">
                       <strong>Previous Month Comparison:</strong><br />
                       {(() => {
                         const prev = calculatePreviousMonthRange();
                         return prev.start && prev.end ? `${formatDate(prev.start)} - ${formatDate(prev.end)}` : 'Not available';
                       })()}
                     </p>
                   </div>
                   {isLoading && (
                     <div className="flex items-center text-blue-600 pt-2">
                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                       <span className="text-sm">Loading usage data...</span>
                     </div>
                   )}
                 </div>
               </div>
             ) : (
               <div className="p-4 bg-gray-50 rounded-lg h-full flex items-center justify-center">
                 <p className="text-sm text-gray-500 text-center">
                   Select start and end dates to see billing information
                 </p>
               </div>
             )}
           </div>
         </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-600 font-medium">{error}</span>
        </div>
      )}

      {/* Units and Usage Data */}
      {units.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Units and Water Usage ({units.length} units)
            </h2>
            <button
              onClick={generateBills}
              disabled={!startDate || !endDate || isGeneratingBills}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !startDate || !endDate || isGeneratingBills
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isGeneratingBills ? 'Generating...' : 'Generate Bills'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Water Usage (Gallons)
                  </th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                     Previous Month (Gallons)
                   </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                                 {units.map((unit) => {
                   const key = `${unit.property}-${unit.unit_number}`;
                   const usage = waterUsage[key];
                   const previousUsage = previousMonthUsage[key];
                   const totalGallons = usage ? usage.total_gallons : 0;
                   const previousGallons = previousUsage ? previousUsage.total_gallons : 0;

                   return (
                     <tr key={unit.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                         {unit.unit_number}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {unit.property}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {unit.name || 'No Tenant'}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {usage ? totalGallons.toFixed(2) : 'No data'}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                         {previousUsage ? previousGallons.toFixed(2) : 'No data'}
                       </td>
                     </tr>
                   );
                 })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generated Bills */}
      {bills.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Generated Bills ({bills.length} bills)
            </h2>
            <div className="flex space-x-3">
              <button
                onClick={updateTenantBalances}
                disabled={isUpdatingBalances}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isUpdatingBalances ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 inline mr-2" />
                    Update Balances
                  </>
                )}
              </button>
              <button
                onClick={downloadAllBills}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4 inline mr-2" />
                Download All Bills
              </button>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Balance Update:</strong> Check the boxes below to add bill amounts to tenant balances. 
              Unchecked bills will not affect tenant balances. Existing balances will be added to.
            </p>
          </div>

          <div className="space-y-3">
            {bills.map((bill, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billCheckboxes[index] || false}
                      onChange={(e) => handleBillCheckboxChange(index, e.target.checked)}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Update Balance</span>
                  </label>
                </div>
                <div className="flex-1 ml-4">
                  <h3 className="font-medium text-gray-900">{bill.tenant_name}</h3>
                  <p className="text-sm text-gray-600">{bill.address}</p>
                  <p className="text-sm text-gray-500">
                    {bill.ccf_usage.toFixed(2)} CCF • ${bill.total_amount.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{bill.unit_number}</p>
                  <p className="text-sm text-gray-500">
                    {bill.period_start} - {bill.period_end}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateBills; 