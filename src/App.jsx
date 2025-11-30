import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, 
  History, 
  Gem, 
  User, 
  Phone, 
  IndianRupee, 
  Save, 
  Search, 
  FileText, 
  X,
  Menu,
  Calculator,
  Calendar,
  Hash,
  MessageSquare,
  ClipboardCheck
} from 'lucide-react';

// --- Local Storage Utility Functions ---
const USER_ID_KEY = 'local_jewelry_user_id';
const SALES_KEY = 'local_jewelry_sales_ledger';

/**
 * Ensures a unique user ID exists in localStorage and returns it.
 * Simulates the Firebase user.uid structure.
 */
const getLocalUser = () => {
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        // Fallback for environments where crypto.randomUUID might not be available
        userId = self.crypto.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem(USER_ID_KEY, userId);
    }
    // Return an object that mimics the necessary Firebase 'user' structure
    return { uid: userId };
};

/**
 * Loads all sales records from localStorage.
 */
const getLocalSales = () => {
  try {
    const rawData = localStorage.getItem(SALES_KEY);
    const sales = rawData ? JSON.parse(rawData) : [];
    
    // Convert stored numeric timestamp back to Date object for sorting and display
    return sales.map(sale => ({
      ...sale,
      timestamp: new Date(sale.timestamp)
    }));

  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return [];
  }
};

/**
 * Adds a new sale record and saves the updated array to localStorage.
 */
const saveLocalSale = (newSaleData) => {
  const sales = getLocalSales().map(s => ({
    ...s,
    // Convert Date back to sortable number before saving
    timestamp: s.timestamp.getTime()
  }));

  const saleToSave = {
    ...newSaleData,
    id: self.crypto.randomUUID ? self.crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2, 5),
    // Use numeric timestamp (simulates serverTimestamp().toDate())
    timestamp: new Date().getTime() 
  };

  sales.push(saleToSave);

  try {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
    return true;
  } catch (error) {
    console.error("Error writing to localStorage:", error);
    return false;
  }
};


// --- Helper Data ---
const MONTHS = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

// --- Main Application Component ---
export default function JewelryManager() {
  const [localUser, setLocalUser] = useState(null); // Replaces Firebase 'user'
  const [view, setView] = useState('new-sale'); // 'new-sale' | 'history'
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null); // For viewing receipt details
  const [dataVersion, setDataVersion] = useState(0); // Used to force data refresh

  // --- Authentication (Local ID Generation) ---
  useEffect(() => {
    // This runs once to establish the unique local user ID
    const user = getLocalUser();
    setLocalUser(user);
    setLoading(false);
  }, []);

  // --- Data Sync (Local Storage Load) ---
  const loadSales = useCallback(() => {
    setLoading(true);
    const salesData = getLocalSales();
    
    // Sort in memory (Newest first)
    salesData.sort((a, b) => b.timestamp - a.timestamp);
    
    setSales(salesData);
    setLoading(false);
  }, []);

  // Effect to load sales when the user is ready or data is updated
  useEffect(() => {
    if (localUser) {
        loadSales();
    }
  }, [localUser, dataVersion, loadSales]);
  
  // Callback to trigger a data reload after a successful save
  const handleSaleSuccess = () => {
      // Incrementing dataVersion forces the useEffect above to reload sales
      setDataVersion(prev => prev + 1);
      handleNav('history'); // Navigate to history view
  };

  // --- Navigation Helper ---
  const handleNav = (target) => {
    setView(target);
    setSidebarOpen(false);
    setSelectedSale(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-amber-50 shadow-xl transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-700 flex items-center gap-3">
          <div className="bg-amber-500 p-2 rounded-lg text-slate-900">
            <Gem size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">GoldLedger</h1>
            <p className="text-xs text-slate-400">Jewelry Shop POS (Local Mode)</p>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => handleNav('new-sale')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              view === 'new-sale' 
                ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20' 
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <Plus size={20} />
            New Sale
          </button>
          
          <button
            onClick={() => handleNav('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              view === 'history' 
                ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20' 
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <History size={20} />
            Sales History
          </button>
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400 text-center">
            User ID: {localUser ? localUser.uid.slice(0, 6) + '...' : 'Connecting...'}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-slate-800">
              {view === 'new-sale' ? 'Record New Transaction' : 'Transaction History'}
            </h2>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {!localUser ? (
            <div className="flex h-full items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : view === 'new-sale' ? (
            <NewSaleForm onSuccess={handleSaleSuccess} />
          ) : (
            <SalesHistory 
              sales={sales} 
              loading={loading} 
              onSelect={(sale) => setSelectedSale(sale)} 
            />
          )}
        </div>
      </main>

      {/* Receipt Modal */}
      {selectedSale && (
        <ReceiptModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  );
}

// --- Component: New Sale Form (Manual Entry) ---
function NewSaleForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    itemName: 'Gold Ring', // Holds the selected item type (e.g., 'Custom Item')
    customItemName: '', // Holds the actual name if 'Custom Item' is selected
    huid: '', 
    notes: '', // New Notes field
    // Manual Price Fields
    itemBasePrice: '',
    gstAmount: '', 
    discountAmount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-Calculation based on manual inputs for consistency
  const base = parseFloat(formData.itemBasePrice) || 0;
  const gst = parseFloat(formData.gstAmount) || 0;
  const discount = parseFloat(formData.discountAmount) || 0;
  
  const totalPriceBeforeDiscount = base + gst; // Total Price (Item + GST)
  const finalPrice = totalPriceBeforeDiscount - discount; // Final Price (Total - Discount)

  // Use the custom name if 'Custom Item' is selected, otherwise use the dropdown value
  const finalItemName = formData.itemName === 'Custom Item' 
    ? (formData.customItemName || 'Custom Item') 
    : formData.itemName;

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow empty string or numbers for price fields
    const updatedValue = ['itemBasePrice', 'gstAmount', 'discountAmount'].includes(name) 
        ? (value.replace(/[^0-9.]/g, '')) 
        : value;
    setFormData(prev => ({ ...prev, [name]: updatedValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation: must have name and a base price
    if (!formData.customerName || !base) {
      console.error("Validation Error: Please fill in the Customer Name and Item Base Price.");
      return;
    }
    
    // Custom item validation
    if (formData.itemName === 'Custom Item' && !formData.customItemName.trim()) {
        console.error("Validation Error: Please enter a name for the Custom Item.");
        return;
    }


    setIsSubmitting(true);
    
    // Data structure for the local save function
    const saleData = {
        ...formData,
        itemName: finalItemName, 
        // Save numerical values and calculated totals for the ledger
        itemBasePrice: base,
        gstAmount: gst,
        discountAmount: discount,
        totalPriceBeforeDiscount: totalPriceBeforeDiscount,
        finalPrice: finalPrice, 
    };

    try {
      // Use the local storage save function instead of addDoc
      const success = saveLocalSale(saleData);
      
      if (success) {
          // Reset form
          setFormData({
            customerName: '',
            customerPhone: '',
            itemName: 'Gold Ring',
            customItemName: '',
            huid: '',
            notes: '',
            itemBasePrice: '',
            gstAmount: '', 
            discountAmount: '',
          });
          if (onSuccess) onSuccess(); // Trigger refresh and navigation
      } else {
          console.error("Failed to save transaction to local storage.");
      }
    } catch (error) {
      console.error("Error saving document: ", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Input Form */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Customer Details & Notes */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-600 font-semibold uppercase tracking-wider text-xs">
            <User size={16} /> Customer Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" 
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input 
                type="tel" 
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="98765 43210"
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-2 text-amber-600 font-semibold uppercase tracking-wider text-xs">
                <MessageSquare size={16} /> Additional Notes / Remarks
            </div>
            <textarea
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any specific details about the sale, gemstone description, or payment method..."
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none"
            />
          </div>
        </div>

        {/* Item & Price Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4 text-amber-600 font-semibold uppercase tracking-wider text-xs">
            <IndianRupee size={16} /> Item & Pricing
          </div>
          
          {/* Item Selector and Custom Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className={formData.itemName === 'Custom Item' ? 'col-span-1' : 'col-span-2'}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Description</label>
              <select 
                name="itemName" 
                value={formData.itemName}
                onChange={handleChange}
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option>Gold Ring</option>
                <option>Gold Necklace</option>
                <option>Gold Chain</option>
                <option>Gold Bangles</option>
                <option>Gold Earrings</option>
                <option>Pendant</option>
                <option>Silver Item</option>
                <option>Custom Item</option>
              </select>
            </div>
            
            {formData.itemName === 'Custom Item' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Name</label>
                <input 
                  type="text" 
                  name="customItemName"
                  value={formData.customItemName}
                  onChange={handleChange}
                  placeholder="e.g. Vintage Brooch"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                />
              </div>
            )}
            
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Hallmark ID (HUID)</label>
                <input 
                  type="text" 
                  name="huid"
                  value={formData.huid}
                  onChange={handleChange}
                  placeholder="ABC1234"
                  className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none uppercase tracking-widest"
                />
            </div>
          </div>
          
          <div className="h-px bg-slate-100 my-6"></div>

          {/* Manual Price Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Base Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price of Item (Base)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input 
                  type="number" 
                  name="itemBasePrice"
                  value={formData.itemBasePrice}
                  onChange={handleChange}
                  placeholder="100000"
                  className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-lg"
                  required
                />
              </div>
            </div>

            {/* 2. GST Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GST Applied (in ₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input 
                  type="number" 
                  name="gstAmount"
                  value={formData.gstAmount}
                  onChange={handleChange}
                  placeholder="3000"
                  className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-lg"
                />
              </div>
            </div>

            {/* 3. Discount Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Discount Given (in ₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                <input 
                  type="number" 
                  name="discountAmount"
                  value={formData.discountAmount}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full pl-8 pr-3 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview / Bill Summary */}
      <div className="lg:col-span-1">
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 sticky top-4">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Calculator className="text-amber-500" size={20} />
            Bill Summary
          </h3>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Item Base Price</span>
              <span>₹{base.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>GST Amount</span>
              <span>+ ₹{gst.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="h-px bg-slate-700 my-4"></div>

            <div className="flex justify-between font-medium text-base text-white">
              <span>Total Price (Inc. GST)</span>
              <span>₹{totalPriceBeforeDiscount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="flex justify-between text-red-400">
              <span>Discount Applied</span>
              <span>- ₹{discount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="h-px bg-slate-700 my-4"></div>
            
            <div className="flex justify-between items-end">
              <span className="text-slate-300 font-medium">Final Price Payable</span>
              <span className="text-3xl font-bold text-amber-500">
                ₹{finalPrice.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`w-full mt-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
              isSubmitting 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-amber-500 text-slate-900 hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/25 active:scale-95'
            }`}
          >
            {isSubmitting ? 'Saving...' : (
              <>
                <Save size={20} />
                Confirm Sale
              </>
            )}
          </button>
          
          <p className="text-xs text-center text-slate-500 mt-4">
            The final price is saved to your ledger locally in this browser.
          </p>
        </div>
      </div>

    </div>
  );
}

// --- Component: Sales History (UPDATED for Export) ---
function SalesHistory({ sales, loading, onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [exportMessage, setExportMessage] = useState('');
  
  // Initialize month/year to the current month/year
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const currentYear = currentDate.getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set();
    sales.forEach(sale => years.add(sale.timestamp.getFullYear()));
    // Ensure the current year is available even if no sales exist yet
    years.add(currentYear); 
    return Array.from(years).sort((a, b) => b - a);
  }, [sales, currentYear]);

  const filteredSales = useMemo(() => {
    // Filter by date first
    const dateFiltered = sales.filter(sale => 
        sale.timestamp.getMonth() === selectedMonth && 
        sale.timestamp.getFullYear() === selectedYear
    );

    // Then filter by search term
    if (!searchTerm) return dateFiltered;
    const lower = searchTerm.toLowerCase();
    return dateFiltered.filter(s => 
      s.customerName.toLowerCase().includes(lower) ||
      (s.customerPhone && s.customerPhone.includes(lower)) ||
      (s.huid && s.huid.toLowerCase().includes(lower))
    );
  }, [sales, searchTerm, selectedMonth, selectedYear]);

  // Function to determine the final price for display in the table
  const getFinalPrice = (sale) => {
      // Check for the new manual price field (always present in local storage version)
      if (typeof sale.finalPrice === 'number') {
          return sale.finalPrice;
      }
      return 0;
  }
  
  // --- Export Logic ---
  const handleExport = () => {
    if (filteredSales.length === 0) {
      setExportMessage(`No sales found for the selected filter combination.`);
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }

    // Define the header row (using tab '\t' as separator for easy spreadsheet import)
    const header = [
      "Date", "Customer Name", "Phone", "Item Name", "HUID", 
      "Base Price (₹)", "GST Amount (₹)", "Discount (₹)", "Final Price (₹)", "Notes"
    ].join('\t');

    // Format the data rows
    const dataRows = filteredSales.map(sale => {
      const dateStr = sale.timestamp.toLocaleDateString();
      const basePrice = sale.itemBasePrice;
      const gstAmount = sale.gstAmount;
      const discount = sale.discountAmount;
      const finalPrice = getFinalPrice(sale);

      return [
        dateStr,
        sale.customerName,
        sale.customerPhone || '',
        sale.itemName,
        sale.huid || '',
        basePrice.toFixed(2),
        gstAmount.toFixed(2),
        discount.toFixed(2),
        finalPrice.toFixed(2),
        sale.notes || ''
      ].join('\t');
    }).join('\n');

    const reportContent = `${header}\n${dataRows}`;

    // Copy to clipboard
    try {
      // Use a temporary textarea for reliable copying across environments
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = reportContent;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      document.execCommand('copy');
      document.body.removeChild(tempTextArea);

      setExportMessage(`Successfully copied ${filteredSales.length} records.`);
    } catch (err) {
      setExportMessage('Failed to copy. Please check console for details.');
      console.error('Copy command failed:', err);
    }
    
    setTimeout(() => setExportMessage(''), 3000);
  };
  
  // --- END Export Logic ---

  return (
    <div className="space-y-6">
      
      {/* Search & Export Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by customer name, phone, or HUID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div className="h-px bg-slate-100 my-4"></div>

        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Month</label>
            <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
            >
                {MONTHS.map((name, index) => (
                    <option key={index} value={index}>{name}</option>
                ))}
            </select>
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Year</label>
            <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
            >
                {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                ))}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="w-full sm:w-1/3 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <ClipboardCheck size={20} />
            Copy Filtered Report
          </button>
        </div>
        
        {exportMessage && (
            <p className={`mt-3 text-center text-sm font-medium ${exportMessage.startsWith('Successfully') ? 'text-green-600' : 'text-red-600'}`}>
                {exportMessage}
            </p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading history...</div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
          <Gem className="mx-auto mb-2 opacity-20" size={48} />
          <p>No sales records found for the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Item</th>
                  <th className="p-4 font-semibold text-right">Final Price</th>
                  <th className="p-4 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-amber-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">
                          {sale.timestamp.toLocaleDateString()}
                        </span>
                        <span className="text-xs text-slate-400">
                          {sale.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{sale.customerName}</div>
                      <div className="text-xs text-slate-500">{sale.customerPhone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-700">{sale.itemName}</div>
                      {sale.huid && (
                        <div className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 mt-1">
                          HUID: {sale.huid}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-slate-800">
                        ₹{getFinalPrice(sale).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => onSelect(sale)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-amber-600 transition-colors"
                        title="View Receipt"
                      >
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Component: Receipt Modal (Unchanged logic, simplified display logic) ---
function ReceiptModal({ sale, onClose }) {
  if (!sale) return null;
  
  // Since we only use the new manual sale structure now, we can simplify this.
  const isNewManualSale = typeof sale.itemBasePrice === 'number'; // Should always be true

  let finalPrice = sale.finalPrice || 0;
  let baseAmountDisplay = isNewManualSale ? `₹${sale.itemBasePrice.toLocaleString('en-IN')}` : 'N/A';
  let gstAmountDisplay = isNewManualSale ? `₹${sale.gstAmount.toLocaleString('en-IN')}` : 'N/A';
  let discountAmountDisplay = isNewManualSale ? `₹${sale.discountAmount.toLocaleString('en-IN')}` : 'N/A';
  let totalAmountBeforeDiscountDisplay = isNewManualSale ? `₹${sale.totalPriceBeforeDiscount.toLocaleString('en-IN')}` : 'N/A';


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-amber-500 p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-1 bg-black/10 hover:bg-black/20 text-slate-900 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
            <Gem size={24} className="text-slate-900" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Sale Receipt</h2>
          <p className="text-slate-800 opacity-75 text-sm">{sale.id.slice(0, 8).toUpperCase()}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          <div className="flex justify-between items-start text-sm border-b border-dashed border-slate-200 pb-4">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Customer</p>
              <p className="font-semibold text-slate-800">{sale.customerName}</p>
              <p className="text-slate-500">{sale.customerPhone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Date</p>
              <p className="font-medium text-slate-700">{sale.timestamp.toLocaleDateString()}</p>
              <p className="text-slate-500">{sale.timestamp.toLocaleTimeString()}</p>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Item Details</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 text-sm">
              <div className="flex justify-between font-medium text-slate-800 text-base">
                <span>{sale.itemName}</span>
                {sale.weight && <span className="text-slate-500">({sale.weight}g)</span>}
              </div>
              
              <div className="h-px bg-slate-200"></div>

              {isNewManualSale && (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>Base Price (Item Value)</span>
                    <span>{baseAmountDisplay}</span>
                  </div >
                  <div className="flex justify-between text-slate-500">
                    <span>GST Amount</span>
                    <span>{gstAmountDisplay}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Total Price (Inc. GST)</span>
                    <span>{totalAmountBeforeDiscountDisplay}</span>
                  </div>
                  <div className="flex justify-between text-red-500 font-medium">
                    <span>Discount Applied</span>
                    <span>- {discountAmountDisplay}</span>
                  </div>
                </>
              )}
              
              {sale.huid && (
                <div className="pt-2 flex items-center gap-2 text-xs text-amber-700 font-medium">
                  <Hash size={12} /> HUID: {sale.huid}
                </div>
              )}
            </div>
          </div>

          {sale.notes && (
            <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Sale Notes</p>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-600 italic whitespace-pre-wrap">
                    {sale.notes}
                </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-200 mt-6">
            <span className="text-slate-500 font-medium">Final Amount Paid</span>
            <span className="text-2xl font-bold text-amber-600">
              ₹{finalPrice.toLocaleString('en-IN')}
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <button 
            className="text-sm font-medium text-amber-600 hover:text-amber-700"
            onClick={() => {
              const text = `Receipt for ${sale.customerName}\nItem: ${sale.itemName}\nFinal Price: ₹${finalPrice.toLocaleString('en-IN')}`;
              // Use a temporary textarea for reliable copying across environments
              const tempTextArea = document.createElement('textarea');
              tempTextArea.value = text;
              document.body.appendChild(tempTextArea);
              tempTextArea.select();
              document.execCommand('copy');
              document.body.removeChild(tempTextArea);
              
              console.log('Receipt details copied to clipboard!');
            }}
          >
            Copy details to share
          </button>
        </div>

      </div>
    </div>
  );
}