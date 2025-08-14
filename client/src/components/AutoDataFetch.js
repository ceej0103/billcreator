import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';
import axios from 'axios';

function AutoDataFetch() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [lastFetch, setLastFetch] = useState(null);
  const [fetchHistory, setFetchHistory] = useState([]);
  const [error, setError] = useState('');
  const [databaseData, setDatabaseData] = useState(null);
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false);

  useEffect(() => {
    // Load last fetch time from localStorage
    const lastFetchTime = localStorage.getItem('lastDataFetch');
    if (lastFetchTime) {
      setLastFetch(new Date(lastFetchTime));
    }
  }, []);

  const handleAutoFetch = async () => {
    setIsLoading(true);
    setStatus('Starting automated data fetch...');
    setError('');

    try {
      // Step 1: Fetch data from the automated endpoint
      setStatus('Fetching water usage data from provider...');
      
      // Ensure we have the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.post('/api/auto-fetch-data', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
             if (response.data.success) {
         setStatus(`${response.data.message} - Data stored successfully!`);
         
         // Update last fetch time
         const now = new Date();
         setLastFetch(now);
         localStorage.setItem('lastDataFetch', now.toISOString());
         
         // Add to fetch history
         setFetchHistory(prev => [{
           timestamp: now,
           billsProcessed: 0, // No bills processed yet - data is just stored
           status: 'success',
           message: response.data.message,
           dateRange: response.data.dateRange
         }, ...prev.slice(0, 9)]); // Keep last 10 entries
       }
    } catch (error) {
      console.error('Auto fetch error:', error);
      setError(error.response?.data?.error || 'Failed to fetch data automatically');
      setStatus('Auto fetch failed');
      
      // Add to fetch history
      const now = new Date();
      setFetchHistory(prev => [{
        timestamp: now,
        billsProcessed: 0,
        status: 'error',
        error: error.response?.data?.error || 'Unknown error'
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestCSVParsing = async () => {
    setIsLoading(true);
    setStatus('Testing CSV parsing from SAMPLE DATA...');
    setError('');

    try {
      // Ensure we have the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.post('/api/test-csv-parsing', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setStatus(`${response.data.message} - Test completed successfully!`);
        
        // Update last fetch time
        const now = new Date();
        setLastFetch(now);
        localStorage.setItem('lastDataFetch', now.toISOString());
        
        // Add to fetch history
        setFetchHistory(prev => [{
          timestamp: now,
          billsProcessed: 0,
          status: 'success',
          message: response.data.message,
          filesProcessed: response.data.filesProcessed,
          dateRange: response.data.dateRange
        }, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Test CSV parsing error:', error);
      setError(error.response?.data?.error || 'Failed to test CSV parsing');
      setStatus('Test failed');
      
      // Add to fetch history
      const now = new Date();
      setFetchHistory(prev => [{
        timestamp: now,
        billsProcessed: 0,
        status: 'error',
        error: error.response?.data?.error || 'Unknown error'
      }, ...prev.slice(0, 9)]);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    if (error) return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (status.includes('Successfully')) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <Download className="w-5 h-5 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-blue-600';
    if (error) return 'text-red-600';
    if (status.includes('Successfully')) return 'text-green-600';
    return 'text-gray-600';
  };

  const loadDatabaseData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get('/api/water-usage-viewer', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setDatabaseData(response.data);
    } catch (error) {
      console.error('Error loading database data:', error);
      setError('Failed to load database data');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Automated Data Fetching</h1>
        <p className="mt-2 text-gray-600">
          Automatically fetch water usage data and generate bills without manual CSV uploads
        </p>
      </div>

      {/* Main Action Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quick Data Fetch</h2>
            <p className="text-gray-600">Fetch latest usage data and generate bills automatically</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleAutoFetch}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isLoading ? 'Fetching...' : 'Start Auto Fetch'}
            </button>
            <button
              onClick={handleTestCSVParsing}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLoading ? 'Testing...' : 'Test CSV Parsing'}
            </button>
          </div>
        </div>

        {/* Status Display */}
        {status && (
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            {getStatusIcon()}
            <span className={`font-medium ${getStatusColor()}`}>{status}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-600 font-medium">{error}</span>
          </div>
        )}
      </div>

      {/* Last Fetch Info */}
      {lastFetch && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Fetch</h3>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-600">
              {lastFetch.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Fetch History */}
      {fetchHistory.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {fetchHistory.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {entry.status === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <span className="text-sm text-gray-600">
                      {entry.timestamp.toLocaleString()}
                    </span>
                    {entry.status === 'success' ? (
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {entry.message || `Processed ${entry.billsProcessed} bills`}
                        </p>
                        {entry.dateRange && (
                          <p className="text-xs text-gray-500">
                            {entry.dateRange.start} to {entry.dateRange.end}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-red-600">
                        {entry.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

             {/* Database Viewer */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Database Viewer</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (showDatabaseViewer) {
                  setShowDatabaseViewer(false);
                } else {
                  setShowDatabaseViewer(true);
                  loadDatabaseData();
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              {showDatabaseViewer ? 'Hide' : 'Show'} Database
            </button>
          </div>
        </div>
        
        {showDatabaseViewer && databaseData && (
          <div className="overflow-x-auto">
            <div className="text-sm text-gray-600 mb-2">
              Showing last 65 days of water usage data (gallons per unit per day)
            </div>
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700">Date</th>
                  {databaseData.units.map(unit => (
                    <th key={unit} className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700">
                      {unit}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {databaseData.dates.map(date => (
                  <tr key={date} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700">
                      {new Date(date).toLocaleDateString()}
                    </td>
                    {databaseData.units.map(unit => (
                      <td key={unit} className="border border-gray-300 px-2 py-1 text-xs text-gray-600">
                        {databaseData.dataMatrix[date][unit] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
       <div className="card">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h3>
         <div className="space-y-3 text-gray-600">
           <div className="flex items-start space-x-3">
             <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
               1
             </div>
             <p>Automatically connects to water usage data sources</p>
           </div>
           <div className="flex items-start space-x-3">
             <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
               2
             </div>
             <p>Downloads and stores 65 days of water usage data</p>
           </div>
           <div className="flex items-start space-x-3">
             <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
               3
             </div>
             <p>Data is stored in the database for use in Create Bills</p>
           </div>
           <div className="flex items-start space-x-3">
             <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
               4
             </div>
             <p>Use Create Bills page to generate bills from the stored data</p>
           </div>
         </div>
       </div>
    </div>
  );
}

export default AutoDataFetch;
