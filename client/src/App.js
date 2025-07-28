import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home, Users, DollarSign, Settings, FileText, CreditCard } from 'lucide-react';
import Dashboard from './components/Dashboard';
import UpdateTenants from './components/UpdateTenants';
import UpdateBalances from './components/UpdateBalances';
import UpdateUsageCosts from './components/UpdateUsageCosts';
import EnterPayments from './components/EnterPayments';
import CreateBills from './components/CreateBills';
import Login from './components/Login';
import axios from 'axios';

// Add this after importing axios
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    setAuthChecked(true);
  }, [token]);

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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 