import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, CheckCircle, Clock, Database, FileText as LogIcon } from 'lucide-react';
import axios from 'axios';

function AutoDataFetch() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [lastFetch, setLastFetch] = useState(null);
  const [fetchHistory, setFetchHistory] = useState([]);
  const [error, setError] = useState('');
  const [databaseData, setDatabaseData] = useState(null);
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogViewer, setShowLogViewer] = useState(false);

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

  const handleViewDatabase = async () => {
    console.log('View Database button clicked');
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Making API call to /api/water-usage-viewer');
      const response = await axios.get('/api/water-usage-viewer', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      
       
       if (response.data && response.data.dates && response.data.units && response.data.dataMatrix) {
         setDatabaseData(response.data);
         setShowDatabaseViewer(true);
       } else {
         console.error('Expected matrix format but got:', typeof response.data);
         setError('Invalid data format received from server');
       }
         } catch (error) {
       console.error('Error fetching database data:', error);

       setError('Failed to load database data');
     } finally {
      setIsLoading(false);
    }
  };

  const handleViewLogs = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('/api/logs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setLogs(response.data);
      setShowLogViewer(true);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Auto Data Fetch</h1>
        <p className="mt-2 text-gray-600">
          Automated water usage data fetching from SimpleSub
        </p>
      </div>

      {/* Production Information */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Production Setup</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-700">Automated fetching scheduled for 5:00 AM Eastern Time daily</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-700">Fetches 65 days of data (current date minus 1 day)</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-700">Automatic CSV file cleanup after processing</span>
          </div>
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-gray-700">7-day log retention with automatic cleanup</span>
          </div>
        </div>
      </div>

      {/* Last Fetch Information */}
      {lastFetch && (
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">Last Fetch</h2>
          </div>
          <p className="text-gray-700">
            <strong>Date:</strong> {formatDate(lastFetch)}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={handleAutoFetch}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Manual Fetch
          </button>
          <button
            onClick={handleViewDatabase}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Database className="w-4 h-4 mr-2" />
            View Database
          </button>
          <button
            onClick={handleViewLogs}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <LogIcon className="w-4 h-4 mr-2" />
            View Logs
          </button>
        </div>
      </div>

      {/* Status Display */}
      {status && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
          <div className="flex items-center space-x-3">
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            <span className="text-gray-700">{status}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-600 font-medium">{error}</span>
        </div>
      )}

                    {/* Database Viewer */}
       {showDatabaseViewer && databaseData && (
         <div className="card">
           <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-semibold text-gray-900">Database Viewer</h2>
             <button
               onClick={() => setShowDatabaseViewer(false)}
               className="text-gray-500 hover:text-gray-700"
             >
               ×
             </button>
           </div>
           
           {databaseData.dates && databaseData.dates.length > 0 ? (
             <div className="overflow-x-auto">
               <div className="text-sm text-gray-600 mb-2">
                 Showing most recent 65 days of water usage data in database (gallons per unit per day)
                 
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
                          {new Date(date + 'T00:00:00').toLocaleDateString()}
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
           ) : (
             <div className="text-center py-8">
               <p className="text-gray-500">No water usage data found in the database.</p>
               <p className="text-sm text-gray-400 mt-2">Data will appear here after automated fetching runs.</p>
             </div>
           )}
         </div>
       )}

      {/* Log Viewer */}
      {showLogViewer && logs.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Log Viewer</h2>
            <button
              onClick={() => setShowLogViewer(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{log.date}</h3>
                  <span className="text-sm text-gray-500">{log.filename}</span>
                </div>
                <pre className="bg-gray-50 p-3 rounded text-sm text-gray-700 overflow-x-auto whitespace-pre-wrap">
                  {log.content}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fetch History */}
      {fetchHistory.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {fetchHistory.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">
                    {formatDate(entry.timestamp)}
                  </p>
                  {entry.status === 'success' ? (
                    <p className="text-sm text-green-600">{entry.message}</p>
                  ) : (
                    <p className="text-sm text-red-600">{entry.error}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {entry.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AutoDataFetch;
