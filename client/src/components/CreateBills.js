import React, { useState } from 'react';
import { Upload, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

function CreateBills() {
  const [step, setStep] = useState('upload'); // upload, preview, bills
  const [csvFiles, setCsvFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [bills, setBills] = useState([]);
  const [currentBillIndex, setCurrentBillIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState({ open: false, type: null, bill: null });

  // Expected property identifiers that should be in the CSV filenames
  const expectedProperties = ['CHAMPION', '483-489_BARNETT', '532_BARNETT', 'CUSHING'];

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    setCsvFiles(files);
  };

  // Check if uploaded files contain the expected property identifiers
  const validateFiles = () => {
    if (csvFiles.length === 0) return { isValid: false, missing: expectedProperties };
    
    const uploadedProperties = [];
    csvFiles.forEach(file => {
      const fileName = file.name.toUpperCase();
      if (fileName.includes('CHAMPION')) {
        uploadedProperties.push('CHAMPION');
      } else if (fileName.includes('483-489_BARNETT')) {
        uploadedProperties.push('483-489_BARNETT');
      } else if (fileName.includes('532_BARNETT')) {
        uploadedProperties.push('532_BARNETT');
      } else if (fileName.includes('CUSHING')) {
        uploadedProperties.push('CUSHING');
      }
    });

    const missingProperties = expectedProperties.filter(prop => !uploadedProperties.includes(prop));
    const isValid = missingProperties.length === 0 && csvFiles.length === 4;
    
    return { isValid, missing: missingProperties, uploaded: uploadedProperties };
  };

  const handleProcessBills = async () => {
    const validation = validateFiles();
    if (!validation.isValid) {
      setMessage(`Please upload CSV files for all 4 properties: ${validation.missing.join(', ')}`);
      return;
    }

    setProcessing(true);
    setMessage('');

    try {
      const formData = new FormData();
      csvFiles.forEach(file => {
        formData.append('csvFiles', file);
      });

      const response = await axios.post('/api/process-bills', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setBills(response.data.bills);
      setStep('preview');
      setProcessing(false);
    } catch (error) {
      console.error('Error processing bills:', error);
      setMessage('Error processing CSV files. Please check the file format and try again.');
      setProcessing(false);
    }
  };

  const handleDownloadSinglePDF = (billData) => {
    setModal({ open: true, type: 'single', bill: billData });
  };

  const handleDownloadAllPDFs = () => {
    setModal({ open: true, type: 'all', bill: null });
  };

  const proceedDownload = async (updateBalances) => {
    setModal({ open: false, type: null, bill: null });
    if (modal.type === 'single' && modal.bill) {
      if (updateBalances) {
        try {
          await axios.post('/api/update-balance-for-bill', { bill: modal.bill });
        } catch (err) {
          alert('Failed to update tenant balance.');
        }
      }
      try {
        const response = await axios.post('/api/generate-pdf', modal.bill, {
          responseType: 'blob',
        });
        const safeName = modal.bill.tenant_name.replace(/\s+/g, '_');
        const safeAddress = modal.bill.address.replace(/\s+/g, '_');
        const safePeriod = `${modal.bill.period_start}-${modal.bill.period_end}`.replace(/\s+/g, '_');
        const filename = `Water_Bill_${safeName}_${safeAddress}_${safePeriod}.pdf`;
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        setMessage('Error downloading PDF. Please try again.');
      }
    } else if (modal.type === 'all') {
      if (updateBalances) {
        try {
          await axios.post('/api/update-balances-for-bills', { bills });
        } catch (err) {
          alert('Failed to update tenant balances.');
        }
      }
      try {
        const response = await axios.post('/api/generate-all-pdfs', { bills }, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'all_bills.zip');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        setMessage('Error downloading PDFs. Please try again.');
      }
    }
  };

  const nextBill = () => {
    if (currentBillIndex < bills.length - 1) {
      setCurrentBillIndex(currentBillIndex + 1);
    }
  };

  const prevBill = () => {
    if (currentBillIndex > 0) {
      setCurrentBillIndex(currentBillIndex - 1);
    }
  };

  const currentBill = bills[currentBillIndex];

  if (step === 'upload') {
    return (
      <div className="space-y-6">
        {/* Modal overlay */}
        {modal.open && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Update Balances?</h2>
              <p style={{ marginBottom: 20 }}>
                {modal.type === 'single'
                  ? 'Do you want to write the bill charges to the tenant’s balance?'
                  : 'Do you want to write all bill charges to the tenants’ balances?'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => proceedDownload(true)} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 500 }}>Yes</button>
                <button onClick={() => proceedDownload(false)} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 500 }}>No</button>
              </div>
            </div>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Bills</h1>
          <p className="mt-2 text-gray-600">
            Upload CSV usage data and generate water bills
          </p>
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

        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Upload CSV Files</h2>
          <p className="text-gray-600 mb-4">
            Please upload the 4 CSV files for each property:
          </p>
          <ul className="list-disc list-inside text-gray-600 mb-6 space-y-1">
            <li>Champion usage data</li>
            <li>Barnett (483-489) usage data</li>
            <li>532 Barnett usage data</li>
            <li>Cushing usage data</li>
          </ul>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="csv-upload" className="btn-primary cursor-pointer">
                  Select CSV Files
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  multiple
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Select all 4 CSV files at once
              </p>
            </div>
          </div>

          {csvFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium text-gray-900 mb-2">Selected Files:</h3>
              <ul className="space-y-1">
                {csvFiles.map((file, index) => (
                  <li key={index} className="text-sm text-gray-600">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            {(() => {
              const validation = validateFiles();
              return (
                <>
                  <button
                    onClick={handleProcessBills}
                    disabled={!validation.isValid || processing}
                    className={`flex items-center ${
                      validation.isValid && !processing
                        ? 'btn-primary'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed px-4 py-2 rounded-lg font-medium'
                    }`}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {processing ? 'Processing...' : `Assemble Bills (${csvFiles.length}/4 files)`}
                  </button>
                  
                  {/* Show validation messages */}
                  {csvFiles.length > 0 && !validation.isValid && (
                    <div className="mt-2">
                      {validation.missing.length > 0 && (
                        <p className="text-sm text-orange-600">
                          Missing properties: {validation.missing.join(', ')}
                        </p>
                      )}
                      {validation.uploaded.length > 0 && (
                        <p className="text-sm text-green-600">
                          Uploaded: {validation.uploaded.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="space-y-6">
        {/* Modal overlay */}
        {modal.open && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 8, padding: 24, minWidth: 320, boxShadow: '0 2px 16px rgba(0,0,0,0.15)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Update Balances?</h2>
              <p style={{ marginBottom: 20 }}>
                {modal.type === 'single'
                  ? 'Do you want to write the bill charges to the tenant’s balance?'
                  : 'Do you want to write all bill charges to the tenants’ balances?'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button onClick={() => proceedDownload(true)} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 500 }}>Yes</button>
                <button onClick={() => proceedDownload(false)} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 500 }}>No</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bill Preview</h1>
            <p className="mt-2 text-gray-600">
              Review and download generated bills
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadAllPDFs}
              className="btn-primary flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Download All PDFs
            </button>
            <button
              onClick={() => setStep('upload')}
              className="btn-secondary"
            >
              Back to Upload
            </button>
          </div>
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

        {/* Bill Navigation */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Bill {currentBillIndex + 1} of {bills.length}
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={prevBill}
                disabled={currentBillIndex === 0}
                className="btn-secondary flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <button
                onClick={nextBill}
                disabled={currentBillIndex === bills.length - 1}
                className="btn-secondary flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>

          {/* Current Bill Preview */}
          {currentBill && (
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bill Header */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Information</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Tenant:</span>
                      <p className="text-gray-900">{currentBill.tenant_name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Address:</span>
                      <p className="text-gray-900">{currentBill.address}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Service Period:</span>
                      <p className="text-gray-900">{currentBill.period_start} - {currentBill.period_end}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Billing Days:</span>
                      <p className="text-gray-900">{currentBill.billing_days}</p>
                    </div>
                  </div>
                </div>

                {/* Usage Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage & Charges</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-600">CCF Usage:</span>
                      <p className="text-gray-900">{currentBill.ccf_usage.toFixed(2)} CCF</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Water Rate:</span>
                      <p className="text-gray-900">${currentBill.water_rate.toFixed(2)} per CCF</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Sewer Rate:</span>
                      <p className="text-gray-900">${currentBill.sewer_rate.toFixed(2)} per CCF</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charges Breakdown */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Charges Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Water Usage:</span>
                      <span className="font-medium">${currentBill.water_usage.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Water Base:</span>
                      <span className="font-medium">${currentBill.water_base.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stormwater:</span>
                      <span className="font-medium">${currentBill.stormwater.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sewer Usage:</span>
                      <span className="font-medium">${currentBill.sewer_usage.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sewer Base:</span>
                      <span className="font-medium">${currentBill.sewer_base.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Clean River Fund:</span>
                      <span className="font-medium">${currentBill.river_fund.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Previous Balance:</span>
                    <span className="font-medium">${currentBill.previous_balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">New Charges:</span>
                    <span className="font-medium">${currentBill.new_charges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">Total Amount Due:</span>
                    <span className="text-gray-900">${currentBill.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              <div className="mt-6">
                <button
                  onClick={() => handleDownloadSinglePDF(currentBill)}
                  className="btn-primary flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* The modal is now rendered alongside the main UI */}
    </div>
  );
}

export default CreateBills; 