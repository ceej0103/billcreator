import React, { useState, useEffect } from 'react';
import { Save, DollarSign } from 'lucide-react';
import axios from 'axios';

function UpdateBalances() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await axios.get('/api/units');
      setUnits(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching units:', error);
      setLoading(false);
    }
  };

  const handleBalanceChange = (unitId, balance) => {
    setUnits(prevUnits =>
      prevUnits.map(unit =>
        unit.id === unitId
          ? { ...unit, current_balance: parseFloat(balance) || 0 }
          : unit
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const promises = units
        .filter(unit => unit.tenant_id) // Only save for units with tenants
        .map(unit =>
          axios.put(`/api/balances/${unit.tenant_id}`, {
            balance: unit.current_balance || 0
          })
        );

      await Promise.all(promises);
      setMessage('Balances updated successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error updating balances:', error);
      setMessage('Error updating balances. Please try again.');
      setSaving(false);
    }
  };

  const groupUnitsByProperty = () => {
    const grouped = {};
    units.forEach(unit => {
      if (!grouped[unit.property]) {
        grouped[unit.property] = [];
      }
      grouped[unit.property].push(unit);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  const groupedUnits = groupUnitsByProperty();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Update Balances</h1>
          <p className="mt-2 text-gray-600">
            Set current balances for all tenants
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

      <div className="space-y-8">
        {Object.entries(groupedUnits).map(([property, propertyUnits]) => (
          <div key={property} className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {property} Properties
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyUnits.map(unit => (
                <div key={unit.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <DollarSign className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="font-medium text-gray-900">
                      {unit.address}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Tenant: {unit.name || 'No tenant assigned'}
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Balance
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={(unit.current_balance || 0).toFixed(2)}
                      onChange={(e) => handleBalanceChange(unit.id, e.target.value)}
                      placeholder="0.00"
                      className="input-field pl-8"
                      disabled={!unit.tenant_id}
                    />
                  </div>
                  {!unit.tenant_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Assign a tenant first to set balance
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Units</p>
            <p className="text-2xl font-semibold text-gray-900">{units.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Units with Tenants</p>
            <p className="text-2xl font-semibold text-gray-900">
              {units.filter(unit => unit.tenant_id).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Balance</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${units.reduce((sum, unit) => sum + (unit.current_balance || 0), 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateBalances; 