import React, { useState, useEffect } from 'react';
import { Save, User } from 'lucide-react';
import axios from 'axios';

function UpdateTenants() {
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
      console.log('Units data received:', response.data);
      setUnits(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching units:', error);
      setLoading(false);
    }
  };

  const handleTenantChange = (unitId, tenantName) => {
    setUnits(prevUnits =>
      prevUnits.map(unit =>
        unit.id === unitId
          ? { ...unit, name: tenantName }
          : unit
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const promises = units.map(unit =>
        axios.put(`/api/tenants/${unit.id}`, {
          name: unit.name || ''
        })
      );

      await Promise.all(promises);
      setMessage('Tenants updated successfully!');
      setSaving(false);
    } catch (error) {
      console.error('Error updating tenants:', error);
      setMessage('Error updating tenants. Please try again.');
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
    console.log('Grouped units:', grouped);
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
          <h1 className="text-3xl font-bold text-gray-900">Update Tenants</h1>
          <p className="mt-2 text-gray-600">
            Manage tenant information for all units
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
                    <User className="w-5 h-5 text-gray-500 mr-2" />
                    <h3 className="font-medium text-gray-900">
                      {unit.address}
                    </h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Name
                    </label>
                    <input
                      type="text"
                      value={unit.name || ''}
                      onChange={(e) => handleTenantChange(unit.id, e.target.value)}
                      placeholder="Enter tenant name"
                      className="input-field"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UpdateTenants; 