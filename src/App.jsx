import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  History,
  Gem,
  User,
  Phone,
  IndianRupee,
  Save,
  Search,
  X,
  Menu,
  Calculator,
  Calendar,
  Hash,
  MessageSquare,
  ClipboardCheck,
  LogOut,
  LogIn,
  Download,
  Share2,
  FileText,
  Trash2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { utils, write } from 'xlsx';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  query
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization (FIXED FOR LOCAL PC) ---
// =========================================================================================
// !!! IMPORTANT: You must replace this MOCK_FIREBASE_CONFIG with your actual Firebase config 
//               from a project setup on console.firebase.google.com.
// =========================================================================================
const MOCK_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAqFM3NL_6QmIuX-iwneymuX7HV2iCyQuc",
  authDomain: "soni-17936.firebaseapp.com",
  projectId: "soni-17936",
  storageBucket: "soni-17936.firebasestorage.app",
  messagingSenderId: "523566643440",
  appId: "1:523566643440:web:974cd064f686c86a622a35",
  measurementId: "G-TFHEFRHZPJ"
};

// Check for the environment variable, otherwise use the mock config.
const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : MOCK_FIREBASE_CONFIG;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use the environment ID or a fixed local ID
const appId = typeof __app_id !== 'undefined' ? __app_id : 'local-jewelry-manager-app';

// --- Helper Data ---
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// --- Main Application Component ---
export default function JewelryManager() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('new-sale');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  // --- Authentication ---
  useEffect(() => {
    // 1. Check for Redirect Result (Mobile Login Flow)
    getRedirectResult(auth).then((result) => {
      if (result) {
        // User successfully signed in via redirect
        setUser(result.user);
      }
    }).catch((error) => {
      console.error("Redirect Auth Error:", error);
      alert("Login Failed: " + error.message);
    });

    // 2. Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (forcePopup = false) => {
    try {
      const provider = new GoogleAuthProvider();
      // Detect Mobile Device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (isMobile && !forcePopup) {
        // Use Redirect on Mobile (More reliable than popup)
        await signInWithRedirect(auth, provider);
      } else {
        // Use Popup on Desktop (Better UX)
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Login Failed:", error);
      if (error.code === 'auth/operation-not-allowed') {
        alert("Configuration Error: Google Sign-In is not enabled in Firebase Console.");
      } else {
        alert(`Login failed: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSales([]); // Clear local data on logout
    } catch (error) {
      console.error("Logout Failed:", error);
    }
  };

  // --- Data Sync ---
  useEffect(() => {
    if (!user) return;

    // Path: /artifacts/{appId}/users/{userId}/sales
    const salesCollection = collection(db, 'artifacts', appId, 'users', user.uid, 'sales');
    const q = query(salesCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Handle timestamp conversion safely
        timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date()
      }));

      // Sort in memory (Newest first)
      salesData.sort((a, b) => b.timestamp - a.timestamp);

      setSales(salesData);
      setLoading(false);
    }, (error) => {
      console.error("Data Fetch Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Navigation Helper ---
  const handleNav = (target) => {
    setView(target);
    setSidebarOpen(false);
    setSelectedSale(null);
  };

  // --- Delete Sale ---
  const handleDeleteSale = async (sale) => {
    if (!window.confirm(`Are you sure you want to delete the sale for ${sale.customerName}?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'sales', sale.id));
      alert("Sale deleted successfully.");
      // State updates via onSnapshot automatically
    } catch (error) {
      console.error("Error deleting sale:", error);
      alert("Failed to delete sale.");
    }
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
            <p className="text-xs text-slate-400">Jewelry Shop POS</p>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => handleNav('new-sale')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'new-sale'
              ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20'
              : 'hover:bg-slate-800 text-slate-300'
              }`}
          >
            <Plus size={20} />
            New Sale
          </button>

          <button
            onClick={() => handleNav('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'history'
              ? 'bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-500/20'
              : 'hover:bg-slate-800 text-slate-300'
              }`}
          >
            <History size={20} />
            Sales History
          </button>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                {user?.displayName ? user.displayName[0] : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="font-medium text-white truncate">{user?.displayName || 'User'}</p>
                <p className="truncate text-[10px]">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
            >
              <LogOut size={14} /> Sign Out
            </button>
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
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {!user ? (
            <LoginPage onLogin={handleLogin} loading={loading} />
          ) : view === 'new-sale' ? (
            <NewSaleForm user={user} appId={appId} onSuccess={() => handleNav('history')} />
          ) : (
            <SalesHistory
              sales={sales}
              loading={loading}
              onSelect={(sale) => setSelectedSale(sale)}
              onDelete={handleDeleteSale}
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

// --- Component: Login Page ---
function LoginPage({ onLogin, loading }) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Gem size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
        <p className="text-slate-500 mb-8">Sign in to access your synchronized jewelry ledger across all your devices.</p>

        <div className="space-y-3">
          <button
            onClick={() => onLogin(false)}
            className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>

          <button
            onClick={() => onLogin(true)}
            className="w-full py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Having trouble? Try Popup Mode
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-6">
          Secure authentication powered by Firebase
        </p>
      </div>
    </div>
  );
}

// --- Component: New Sale Form (Manual Entry) ---
function NewSaleForm({ user, appId, onSuccess }) {
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
    if (!user) return;

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
    try {
      // Build payload explicitly so we can log and verify what will be sent to Firestore
      const payload = {
        ...formData,
        itemName: finalItemName, // Save the resolved name
        // Save numerical values and calculated totals for the ledger
        itemBasePrice: base,
        gstAmount: gst,
        discountAmount: discount,
        totalPriceBeforeDiscount: totalPriceBeforeDiscount,
        finalPrice: finalPrice,
        // Save the user id in the document for easier querying/ownership checks
        userId: user.uid,
        timestamp: serverTimestamp()
      };

      // Debug: log the payload (useful while debugging write failures)
      console.log('Saving sale payload for user:', user.uid, payload);

      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'sales'), payload);
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
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error adding document: ", error);
      console.error("Failed to save transaction. Please try again.");
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
            className={`w-full mt-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${isSubmitting
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
            The final price is saved to your ledger.
          </p>
        </div>
      </div>

    </div>
  );
}

// --- Component: Sales History (UPDATED for Export) ---
function SalesHistory({ sales, loading, onSelect, onDelete }) {
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

  // --- PDF Invoice Generation ---
  const handleGenerateInvoice = (sale) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Gold Ledger Invoice", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${sale.timestamp.toLocaleDateString('en-GB')}`, 105, 30, null, null, "center");

    // Customer Details
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Customer Details:", 14, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${sale.customerName}`, 14, 52);
    doc.text(`Phone: ${sale.customerPhone}`, 14, 57);

    // Calculation Data
    const isManual = typeof sale.itemBasePrice === 'number';
    const basePrice = isManual ? sale.itemBasePrice : (sale.weight * sale.goldRate);
    const gst = isManual ? sale.gstAmount : 'N/A';
    const discount = isManual ? sale.discountAmount : 'N/A';
    const finalPrice = getFinalPrice(sale);

    // Table
    autoTable(doc, {
      startY: 65,
      head: [['Item', 'HUID', 'Details', 'Price (INR)']],
      body: [
        [sale.itemName, sale.huid || '-', 'Base Price', basePrice.toLocaleString('en-IN')],
        ['', '', 'GST Amount', typeof gst === 'number' ? `+ ${gst.toFixed(2)}` : gst],
        ['', '', 'Discount', typeof discount === 'number' ? `- ${discount.toFixed(2)}` : discount],
        ['', '', 'Final Total', { content: finalPrice.toLocaleString('en-IN'), styles: { fontStyle: 'bold', textColor: [0, 0, 0] } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }, // Amber 500
      footStyles: { fillColor: [245, 158, 11] }
    });

    // Footer
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 105, finalY + 20, null, null, "center");

    doc.save(`Invoice_${sale.customerName.replace(/\s+/g, '_')}_${sale.timestamp.getTime()}.pdf`);
  };

  // --- WhatsApp Sharing ---
  // --- WhatsApp Sharing ---
  const handleShareWhatsApp = (sale) => {
    // 1. Trigger the PDF download automatically
    handleGenerateInvoice(sale);

    // 2. Prepare WhatsApp Message
    const finalPrice = getFinalPrice(sale);
    const message = `Hello ${sale.customerName}, here is your invoice for ${sale.itemName}. Total Amount: ₹${finalPrice.toLocaleString('en-IN')}. Please find the PDF attached below.`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/91${sale.customerPhone}?text=${encodedMessage}`;

    // 3. Open WhatsApp and instruct user
    setTimeout(() => {
      window.open(url, '_blank');
      alert("⬇️ PDF Downloaded!\n\nWhatsApp does not allow automatic file attaching.\n\nPlease drag and drop the downloaded invoice into the WhatsApp chat.");
    }, 500);
  };

  // --- Filter Logic ---

  const filteredSales = useMemo(() => {
    if (!searchTerm) return sales;
    const lower = searchTerm.toLowerCase();
    return sales.filter(s =>
      s.customerName.toLowerCase().includes(lower) ||
      s.customerPhone.includes(lower) ||
      (s.huid && s.huid.toLowerCase().includes(lower))
    );
  }, [sales, searchTerm]);

  // Function to determine the final price for display in the table
  const getFinalPrice = (sale) => {
    // New format check (Manual Price)
    if (typeof sale.finalPrice === 'number') {
      return sale.finalPrice;
    }
    // Old format check (Calculated Price)
    if (typeof sale.totalPrice === 'number') {
      return sale.totalPrice;
    }
    return 0;
  }

  // --- Export Logic ---
  // --- Export Logic (Excel) ---
  const handleExport = () => {
    const monthlySales = sales.filter(sale =>
      sale.timestamp.getMonth() === selectedMonth &&
      sale.timestamp.getFullYear() === selectedYear
    );

    if (monthlySales.length === 0) {
      setExportMessage(`No sales found for ${MONTHS[selectedMonth]}, ${selectedYear}.`);
      setTimeout(() => setExportMessage(''), 3000);
      return;
    }

    // Format Data for Excel
    const dataForExcel = monthlySales.map(sale => {
      const isNewManualSale = typeof sale.itemBasePrice === 'number';
      const basePrice = isNewManualSale ? sale.itemBasePrice : ((sale.weight || 0) * (sale.goldRate || 0));
      const gstAmount = isNewManualSale ? sale.gstAmount : 'N/A';
      const discount = isNewManualSale ? sale.discountAmount : 'N/A';
      const finalPrice = getFinalPrice(sale);

      return {
        "Date": sale.timestamp.toLocaleDateString(),
        "Customer Name": sale.customerName,
        "Phone": sale.customerPhone || '',
        "Item Name": sale.itemName,
        "Description/HUID": sale.huid || '',
        "Base Price (₹)": basePrice,
        "GST (₹)": gstAmount,
        "Discount (₹)": discount,
        "Final Price (₹)": finalPrice,
        "Notes": sale.notes || ''
      };
    });

    // Create Worksheet
    const ws = utils.json_to_sheet(dataForExcel);

    // Auto-width columns (simple heuristic)
    const wscols = [
      { wch: 12 }, // Date
      { wch: 20 }, // Name
      { wch: 12 }, // Phone
      { wch: 15 }, // Item
      { wch: 15 }, // HUID
      { wch: 12 }, // Base
      { wch: 10 }, // GST
      { wch: 10 }, // Disc
      { wch: 12 }, // Final
      { wch: 30 }  // Notes
    ];
    ws['!cols'] = wscols;

    // Create Workbook
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Sales Report");

    // Generate File (Explicit Blob Method)
    try {
      const wbout = write(wb, { bookType: 'xlsx', type: 'array' });
      // CORRECT MIME TYPE for .xlsx + Cast to Uint8Array for safety
      const blob = new Blob([new Uint8Array(wbout)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const fileName = `GoldLedger_Report_${MONTHS[selectedMonth]}_${selectedYear}.xlsx`;

      // Manual Download Trigger
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportMessage(`Downloaded Excel: ${monthlySales.length} records.`);
    } catch (error) {
      console.error("Export Error:", error);
      alert("Excel Export Failed: " + error.message);
      setExportMessage("Error generating Excel file.");
    }

    setTimeout(() => setExportMessage(''), 3000);
  };

  // --- CSV Export Fallback ---
  const handleExportCSV = () => {
    try {
      const monthlySales = sales.filter(sale =>
        sale.timestamp.getMonth() === selectedMonth &&
        sale.timestamp.getFullYear() === selectedYear
      );

      if (monthlySales.length === 0) {
        alert(`No sales data found for ${MONTHS[selectedMonth]} ${selectedYear}`);
        return;
      }

      // ... (headers definition)
      // Define Headers
      const headers = [
        "Date", "Customer Name", "Phone", "Item Name", "HUID",
        "Base Price", "GST Amount", "Discount", "Final Price", "Notes"
      ];

      // Format Rows
      const rows = monthlySales.map(sale => {
        // ... (rest of mapping logic same)
        const isNewManualSale = typeof sale.itemBasePrice === 'number';
        const basePrice = isNewManualSale ? sale.itemBasePrice : ((sale.weight || 0) * (sale.goldRate || 0));
        const gstAmount = isNewManualSale ? sale.gstAmount : 'N/A';
        const discount = isNewManualSale ? sale.discountAmount : 'N/A';
        const finalPrice = getFinalPrice(sale);

        // Escape commas and quotes for CSV
        const escape = (val) => {
          const str = String(val || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        return [
          sale.timestamp.toLocaleDateString(),
          sale.customerName,
          sale.customerPhone,
          sale.itemName,
          sale.huid,
          basePrice,
          gstAmount,
          discount,
          finalPrice,
          sale.notes
        ].map(escape);
      });

      // Combine
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

      // Download with BOM for Excel UTF-8 compatibility
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `GoldLedger_Report_${MONTHS[selectedMonth]}_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportMessage(`Downloaded CSV: ${monthlySales.length} records.`);
    } catch (error) {
      console.error("CSV Export Error:", error);
      alert("CSV Export Failed: " + error.message);
      setExportMessage("Error generating CSV file.");
    }
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

          <div className="w-full sm:w-1/3 flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
            >
              <Download size={18} /> Excel
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-800 text-white hover:bg-slate-700 transition-colors text-sm"
            >
              <FileText size={18} /> CSV
            </button>
          </div>
        </div>

        {exportMessage && (
          <p className={`mt-3 text-center text-sm font-medium ${exportMessage.startsWith('Downloaded') ? 'text-green-600' : 'text-red-600'}`}>
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
          <p>No sales records found.</p>
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
                          {sale.timestamp.toLocaleDateString('en-GB')}
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
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onSelect(sale)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-amber-600 transition-colors"
                          title="View Receipt"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => handleGenerateInvoice(sale)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-blue-600 transition-colors"
                          title="Download PDF Invoice"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleShareWhatsApp(sale)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-green-600 transition-colors"
                          title="Share on WhatsApp"
                        >
                          <Share2 size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(sale)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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

// --- Component: Receipt Modal (Unchanged) ---
function ReceiptModal({ sale, onClose }) {
  if (!sale) return null;

  // Check if it's a new manual sale structure
  const isNewManualSale = typeof sale.itemBasePrice === 'number';

  let finalPrice = 0;
  let baseAmountDisplay = '';
  let gstAmountDisplay = '';
  let discountAmountDisplay = '';
  let totalAmountBeforeDiscountDisplay = '';

  if (isNewManualSale) {
    // New Manual Sale Logic
    finalPrice = sale.finalPrice;
    baseAmountDisplay = `₹${sale.itemBasePrice.toLocaleString('en-IN')}`;
    gstAmountDisplay = `₹${sale.gstAmount.toLocaleString('en-IN')}`;
    discountAmountDisplay = `₹${sale.discountAmount.toLocaleString('en-IN')}`;
    totalAmountBeforeDiscountDisplay = `₹${sale.totalPriceBeforeDiscount.toLocaleString('en-IN')}`;

  } else {
    // Old Calculated Sale Logic (Kept for historical data compatibility)
    finalPrice = sale.totalPrice;
    const basePrice = (sale.weight || 0) * (sale.goldRate || 0);

    // Note: The old structure did not track GST/Discount explicitly.
    baseAmountDisplay = `₹${basePrice.toLocaleString('en-IN')}`;
    gstAmountDisplay = 'N/A (Included in Total)';
    discountAmountDisplay = 'N/A (Not Recorded)';
    totalAmountBeforeDiscountDisplay = `₹${sale.totalPrice.toLocaleString('en-IN')}`;
  }


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

              {/* Display based on structure */}
              {isNewManualSale ? (
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
              ) : (
                <>
                  <div className="flex justify-between text-slate-500">
                    <span>{sale.itemName && sale.itemName.includes('Silver') ? 'Silver' : 'Gold'} Rate / Gram</span>
                    <span>₹{sale.goldRate}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Making Charges</span>
                    <span>₹{sale.makingCharges.toLocaleString('en-IN')}</span>
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