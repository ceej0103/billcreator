import React, { useState, useEffect } from 'react';
import { Save, Settings } from 'lucide-react';
import axios from 'axios';

function UpdateUsageCosts() {
  const [costs, setCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCosts();
  }, []);

  const fetchCosts = async () => {
    try {
      const response = await axios.get('/api/usage-costs');
      setCosts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching costs:', error);
      setLoading(false);
    }
  };

  const handleCostChange = (id, rate) => {
    setCosts(prevCosts =>
      prevCosts.map(cost =>
        cost.id === id
          ? { ...cost, rate: parseFloat(rate) || 0 }
          : cost
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const promises = costs.map(cost =>
        axios.put(`/api/usage-costs/${cost.id}`, {
          rate: cost.rate
        })
      );

      await Promise.all(promises);
      setMessage('Usage costs updated successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error updating costs:', error);
      setMessage('Error updating costs. Please try again.');
      setSaving(false);
    }
  };

  const getRateTypeLabel = (type) => {
    return type === 'per_ccf' ? 'per CCF' : 'per day';
  };

  const getCategoryDescription = (category) => {
    const descriptions = {
      'Water Rate': 'Rate charged per CCF of water used ($3.52)',
      'Sewer Rate': 'Rate charged per CCF for sewer service ($5.35)',
      'Water Base': 'Daily base charge for water service ($0.080084)',
      'Stormwater': 'Daily stormwater management charge ($0.126489)',
      'Sewer Base': 'Daily base charge for sewer service ($0.041320)',
      'Clean River Fund': 'Daily charge for clean river fund ($0.103567)'
    };
    return descriptions[category] || '';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Update Usage Costs</h1>
          <p className="mt-2 text-gray-600">
            Configure water and sewer rates for billing calculations
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All'}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('Error') 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per CCF Charges */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Per CCF Charges
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Charges calculated based on water usage (CCF = 748 gallons)
          </p>
          <div className="space-y-4">
            {costs.filter(cost => cost.type === 'per_ccf').map(cost => (
              <div key={cost.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{cost.category}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {getRateTypeLabel(cost.type)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {getCategoryDescription(cost.category)}
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost.rate}
                      onChange={(e) => handleCostChange(cost.id, e.target.value)}
                      placeholder="0.00"
                      className="input-field pl-8"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per Day Charges */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Per Day Charges
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Daily charges applied for the billing period. Billing days are calculated as: (End Date - Start Date) + 1
          </p>
          <div className="space-y-4">
            {costs.filter(cost => cost.type === 'per_day').map(cost => (
              <div key={cost.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{cost.category}</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {getRateTypeLabel(cost.type)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {getCategoryDescription(cost.category)}
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost.rate}
                      onChange={(e) => handleCostChange(cost.id, e.target.value)}
                      placeholder="0.00"
                      className="input-field pl-8"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rate Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Per CCF Charges</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${costs.filter(c => c.type === 'per_ccf').reduce((sum, c) => sum + c.rate, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Per Day Charges</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${costs.filter(c => c.type === 'per_day').reduce((sum, c) => sum + c.rate, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Daily Base Total</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${costs.filter(c => c.type === 'per_day').reduce((sum, c) => sum + c.rate, 0).toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateUsageCosts; 