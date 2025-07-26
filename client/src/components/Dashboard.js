import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Settings, FileText, CreditCard, Building } from 'lucide-react';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    totalUnits: 14,
    totalTenants: 0,
    totalBalance: 0,
    recentPayments: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Check if we have a token before making the request
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No authentication token found');
          return;
        }

        // Ensure axios has the authorization header set
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        const response = await axios.get('/api/units');
        const units = response.data;
        
        const totalTenants = units.filter(unit => unit.tenant_id).length;
        const totalBalance = units.reduce((sum, unit) => sum + (unit.current_balance || 0), 0);
        
        setStats({
          totalUnits: 14,
          totalTenants,
          totalBalance,
          recentPayments: 0 // This would need a separate API call for recent payments
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        // If it's a 401 error, the token might be invalid
        if (error.response && error.response.status === 401) {
          console.log('Authentication failed');
          // Don't reload the page, just let the App component handle the auth state
        }
      }
    };

    // Add a small delay to ensure the token is properly set in App.js
    const timer = setTimeout(fetchStats, 100);
    return () => clearTimeout(timer);
  }, []);

  const quickActions = [
    {
      title: 'Update Tenants',
      description: 'Manage tenant information for all units',
      icon: Users,
      link: '/tenants',
      color: 'bg-blue-500'
    },
    {
      title: 'Update Balances',
      description: 'Set current balances for tenants',
      icon: DollarSign,
      link: '/balances',
      color: 'bg-green-500'
    },
    {
      title: 'Usage Costs',
      description: 'Configure water and sewer rates',
      icon: Settings,
      link: '/costs',
      color: 'bg-purple-500'
    },
    {
      title: 'Enter Payments',
      description: 'Record tenant payments',
      icon: CreditCard,
      link: '/payments',
      color: 'bg-orange-500'
    },
    {
      title: 'Create Bills',
      description: 'Generate water bills from usage data',
      icon: FileText,
      link: '/bills',
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Monique’s Water Bill Creator</h1>
        <p className="mt-2 text-gray-600 italic">Because ain’t nobody got time for this mess…</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Units</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalUnits}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Tenants</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalTenants}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Balance</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${stats.totalBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="card hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  {action.title}
                </h3>
              </div>
              <p className="text-gray-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 