import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Users, DollarSign, Settings, FileText, CreditCard, Download, LogOut } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UpdateTenants from './components/UpdateTenants';
import UpdateBalances from './components/UpdateBalances';
import UpdateUsageCosts from './components/UpdateUsageCosts';
import EnterPayments from './components/EnterPayments';
import CreateBills from './components/CreateBills';
import AutoDataFetch from './components/AutoDataFetch';
import Login from './components/Login';
import axios from 'axios';

// Add this after importing axios
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Redirect to root path instead of reloading
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authChecked, setAuthChecked] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken('');
    window.location.href = '/';
  };

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          // Set the token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify the token is still valid by making a test request
          await axios.get('/api/verify-token');
          
          // If successful, set the token
          setToken(storedToken);
        } catch (error) {
          // If token verification fails, remove it and redirect to login
          console.log('Token verification failed, redirecting to login');
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setToken('');
          // Redirect to root to ensure we're on the login page
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }
      } else {
        // No token found, ensure we're on the login page
        delete axios.defaults.headers.common['Authorization'];
        setToken('');
        if (window.location.pathname !== '/') {
          window.location.href = '/';
        }
      }
      
      setAuthChecked(true);
    };

    verifyToken();
  }, []);

  // 1. Don't render anything until auth check is complete
  if (!authChecked) {
    return <div>Loading...</div>;
  }

  // 2. If no token, show login
  if (!token) {
    return <Login onLoginSuccess={setToken} />;
  }

  // 3. Only render the app if authenticated
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen">
          <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Good Dog Properties
            </h1>
            <nav className="space-y-2">
              <Link
                to="/"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Home className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
              <Link
                to="/tenants"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="w-5 h-5 mr-3" />
                Update Tenants
              </Link>
              <Link
                to="/balances"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <DollarSign className="w-5 h-5 mr-3" />
                Update Balances
              </Link>
              <Link
                to="/costs"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Settings className="w-5 h-5 mr-3" />
                Update Usage Costs
              </Link>
              <Link
                to="/payments"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <CreditCard className="w-5 h-5 mr-3" />
                Enter Payments
              </Link>
              <Link
                to="/bills"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileText className="w-5 h-5 mr-3" />
                Create Bills
              </Link>
              <Link
                to="/auto-fetch"
                className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Download className="w-5 h-5 mr-3" />
                Auto Data Fetch
              </Link>
              
              {/* Logout Button */}
              <div className="mt-8 pt-4 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors w-full"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tenants" element={<UpdateTenants />} />
            <Route path="/balances" element={<UpdateBalances />} />
            <Route path="/costs" element={<UpdateUsageCosts />} />
            <Route path="/payments" element={<EnterPayments />} />
            <Route path="/bills" element={<CreateBills />} />
            <Route path="/auto-fetch" element={<AutoDataFetch />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 