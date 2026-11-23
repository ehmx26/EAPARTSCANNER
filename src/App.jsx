import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Camera,
  CheckCircle2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  TrendingUp,
  Upload,
} from 'lucide-react';

const MOCK_COMPS = [
  { title: 'OEM Power Supply Board Tested - Fast Ship', price: 42.0, status: 'Sold' },
  { title: 'Replacement Control Board Pulled from Working Unit', price: 38.5, status: 'Sold' },
  { title: 'Genuine Board Assembly - Verified Working', price: 46.0, status: 'Active' },
  { title: 'OEM Part Module - Clean Connectors', price: 35.99, status: 'Active' },
];

const INITIAL_ORDERS = [
  {
    id: 'EB-90481',
    item: 'Samsung BN44-00807A Power Supply Board',
    buyer: 'm_garcia_tx',
    amount: 41.99,
    shipping: 8.5,
    ebayFee: 5.86,
    cogs: 12.0,
    fulfillment: 'Label Printed',
  },
  {
    id: 'EB-90482',
    item: 'LG EAX68253605 OLED Main Board',
    buyer: 'karen_h_oh',
    amount: 64.5,
    shipping: 9.0,
    ebayFee: 8.85,
    cogs: 20.0,
    fulfillment: 'Awaiting Shipment',
  },
];

async function compressImageToBase64(file, maxWidth = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read uploaded image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve({
          base64,
          dataUrl,
          compressedBytes: Math.round((base64.length * 3) / 4),
          originalBytes: file.size,
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('workflow');
  const [step, setStep] = useState(1);
  const [model, setModel] = useState('@cf/google/gemma-4-26b-a4b-it');
  const [environment, setEnvironment] = useState('Sandbox');

  const [previewUrl, setPreviewUrl] = useState('');
  const [imagePayload, setImagePayload] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [toast, setToast] = useState('');

  const [partForm, setPartForm] = useState({
    partName: '',
    brand: '',
    mpn: '',
    boardNumber: '',
    serialNumber: '',
    category: 'Electronics & Appliance Parts',
    compatibleModelsText: '',
    condition: 'Used',
    ocrRawText: '',
    notes: '',
  });

  const [listing, setListing] = useState({
    title: '',
    price: 39.99,
    cogs: 12.0,
    shippingCost: 8.5,
    quantity: 1,
    description: '',
    fulfillmentPolicy: 'USPS Ground Advantage (3-5 Days)',
    returnPolicy: '30 Days Buyer Pays Return',
    paymentPolicy: 'eBay Managed Payments Immediate',
  });

  const [listings, setListings] = useState([
    {
      sku: 'EA-BN4400807A-01',
      title: 'Samsung BN44-00807A OEM Power Supply Board Tested',
      mpn: 'BN44-00807A',
      price: 41.99,
      qty: 2,
      status: 'Active',
    },
  ]);
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError('');
    try {
      const compressed = await compressImageToBase64(file, 1024, 0.8);
      setImagePayload(compressed);
      setPreviewUrl(compressed.dataUrl);
    } catch (err) {
      setScanError(err.message);
    }
  };

  const runWorkersAiScan = async () => {
    if (!imagePayload?.base64) {
      setScanError('Please upload a part or sticker photo first.');
      return;
    }
    setScanning(true);
    setScanError('');

    try {
      const res = await fetch('/api/scan-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imagePayload.base64,
          mimeType: 'image/jpeg',
          model,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Scan failed with HTTP ${res.status}`);
      }

      const modelsList = Array.isArray(data.compatibleModels)
        ? data.compatibleModels.join(', ')
        : '';

      const updatedForm = {
        partName: data.partName || '',
        brand: data.brand || '',
        mpn: data.mpn || '',
        boardNumber: data.boardNumber || '',
        serialNumber: data.serialNumber || '',
        category: data.category || 'Electronics & Appliance Parts',
        compatibleModelsText: modelsList,
        condition: data.condition || 'Used',
        ocrRawText: data.ocrRawText || '',
        notes: data.notes || '',
      };

      setPartForm(updatedForm);

      const generatedTitle = `${updatedForm.brand} ${updatedForm.mpn} ${updatedForm.partName} ${updatedForm.condition}`
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);

      setListing((prev) => ({
        ...prev,
        title: generatedTitle,
        description: [
          `Part: ${updatedForm.partName || 'Replacement Part'}`,
          `Brand: ${updatedForm.brand || 'OEM'}`,
          `MPN / Part #: ${updatedForm.mpn || 'See sticker photo'}`,
          updatedForm.boardNumber ? `Board #: ${updatedForm.boardNumber}` : '',
          modelsList ? `Compatible Models: ${modelsList}` : '',
          `Condition: ${updatedForm.condition}`,
          updatedForm.notes ? `Inspection Notes: ${updatedForm.notes}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      }));

      showToast('Scanned sticker via Cloudflare Workers AI');
    } catch (err) {
      setScanError(err.message);
    } finally {
      setScanning(false);
    }
  };

  const compStats = useMemo(() => {
    const sold = MOCK_COMPS.filter((c) => c.status === 'Sold').map((c) => c.price);
    const active = MOCK_COMPS.filter((c) => c.status === 'Active').map((c) => c.price);
    const soldAvg = sold.reduce((a, b) => a + b, 0) / Math.max(1, sold.length);
    const lowestActive = Math.min(...active);
    return {
      soldAvg: Number(soldAvg.toFixed(2)),
      lowestActive: Number(lowestActive.toFixed(2)),
    };
  }, []);

  const profitCalc = useMemo(() => {
    const price = Number(listing.price) || 0;
    const cogs = Number(listing.cogs) || 0;
    const shipping = Number(listing.shippingCost) || 0;
    const ebayFee = price * 0.1325 + 0.3;
    const netProfit = price - ebayFee - cogs - shipping;
    const marginPct = price > 0 ? (netProfit / price) * 100 : 0;
    return {
      ebayFee: Number(ebayFee.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      marginPct: Number(marginPct.toFixed(1)),
    };
  }, [listing.price, listing.cogs, listing.shippingCost]);

  const applyStrategyPrice = (mode) => {
    let nextPrice = Number(listing.price) || 35;
    if (mode === 'undercut') nextPrice = Math.max(5, Number((compStats.lowestActive - 1.5).toFixed(2)));
    if (mode === 'soldAvg') nextPrice = compStats.soldAvg;
    if (mode === 'fastFlip') nextPrice = Number((compStats.soldAvg * 0.9).toFixed(2));
    if (mode === 'premium') nextPrice = Number((compStats.soldAvg * 1.15).toFixed(2));
    setListing((prev) => ({ ...prev, price: nextPrice }));
  };

  const publishListing = (asDraft = false) => {
    const skuPart = (partForm.mpn || partForm.partName || 'ITEM')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 12);
    const newItem = {
      sku: `EA-${skuPart}-${Math.floor(100 + Math.random() * 900)}`,
      title: listing.title || partForm.partName || 'Untitled Replacement Part',
      mpn: partForm.mpn || 'N/A',
      price: Number(listing.price) || 0,
      qty: Number(listing.quantity) || 1,
      status: asDraft ? 'Draft' : `Active (${environment})`,
    };
    setListings((prev) => [newItem, ...prev]);
    showToast(asDraft ? 'Saved as Draft' : `Published to eBay ${environment}`);
    setActiveTab('orders');
  };

  const simulateOrder = () => {
    const firstActive = listings.find((l) => l.status.startsWith('Active')) || listings[0];
    const salePrice = firstActive ? firstActive.price : 44.99;
    const fee = Number((salePrice * 0.1325 + 0.3).toFixed(2));
    const newOrder = {
      id: `EB-${Math.floor(90500 + Math.random() * 499)}`,
      item: firstActive ? firstActive.title : 'Replacement Control Board',
      buyer: 'buyer_verified_88',
      amount: salePrice,
      shipping: 8.5,
      ebayFee: fee,
      cogs: Number(listing.cogs) || 12.0,
      fulfillment: 'Awaiting Shipment',
    };
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`New order ${newOrder.id} ($${salePrice.toFixed(2)})`);
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.amount, 0);
  const totalNet = orders.reduce(
    (acc, o) => acc + (o.amount - o.ebayFee - o.shipping - o.cogs),
    0
  );

  return (
    <div className="min-h-screen bg-[#09070E] text-purple-50">
      <header className="sticky top-0 z-30 border-b border-purple-900/40 bg-[#110D1B]/95 backdrop-blur px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 border border-amber-400/40 flex items-center justify-center shadow-lg shadow-purple-950">
              <Tag className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">EA Scanner Parts</h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  {environment}
                </span>
              </div>
              <p className="text-xs text-purple-300/75">
                Vision Sticker OCR • eBay Comps &amp; Margins • Inventory &amp; Orders
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            {[
              { id: 'workflow', label: 'Scanner & Lister' },
              { id: 'orders', label: `Orders & Listings (${orders.length})` },
              { id: 'setup', label: 'API & Env' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-950 border border-amber-400/30'
                    : 'bg-[#191427] text-purple-200/80 hover:bg-[#221B35] border border-purple-900/30'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1B142C] border border-amber-400/50 text-amber-200 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-7 space-y-6">
        {activeTab === 'workflow' && (
          <>
            <div className="flex flex-wrap items-center gap-2.5">
              {[
                { id: 1, label: '01 • Photo & Vision OCR' },
                { id: 2, label: '02 • Comps & Pricing' },
                { id: 3, label: '03 • Publish to eBay' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition border ${
                    step === s.id
                      ? 'bg-purple-600/25 border-amber-400/60 text-amber-200'
                      : 'bg-[#120E1D] border-purple-900/40 text-purple-300/70 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-5 bg-[#120E1D] border border-purple-900/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                      <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                      Part Sticker / Barcode Photo
                    </h2>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="bg-[#1B152B] border border-purple-800/50 rounded-lg px-2.5 py-1.5 text-xs text-purple-100 focus:outline-none focus:border-amber-400"
                    >
                      <option value="@cf/google/gemma-4-26b-a4b-it">gemma-4-26b-a4b-it</option>
                      <option value="@cf/meta/llama-4-scout-17b-16e-instruct">
                        llama-4-scout-17b
                      </option>
                    </select>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-purple-700/50 hover:border-amber-400/70 bg-[#0D0A15] rounded-2xl p-6 text-center cursor-pointer transition"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Uploaded part label"
                        className="max-h-60 mx-auto rounded-xl object-contain bg-white p-2"
                      />
                    ) : (
                      <div className="py-8 space-y-2.5">
                        <Upload className="w-7 h-7 mx-auto text-amber-300" />
                        <p className="text-sm font-medium text-white">
                          Click to upload sticker, barcode, or board photo
                        </p>
                        <p className="text-xs text-purple-300/70">
                          Auto-compressed to 1024px JPEG (~80% quality)
                        </p>
                      </div>
                    )}
                  </div>

                  {imagePayload && (
                    <div className="text-xs text-purple-300/80 flex justify-between px-1">
                      <span>Original: {(imagePayload.originalBytes / 1024).toFixed(0)} KB</span>
                      <span className="text-amber-300">
                        Ready: {(imagePayload.compressedBytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  )}

                  {scanError && (
                    <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700/60 text-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{scanError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 pt-1">
                    <button
                      onClick={runWorkersAiScan}
                      disabled={scanning || !imagePayload}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-purple-950"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                          Scanning Sticker...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                          Scan Part Details
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="bg-[#1B152B] hover:bg-[#251D3B] border border-purple-800/50 text-purple-100 py-2.5 px-4 rounded-xl text-sm font-medium transition"
                    >
                      Next →
                    </button>
                  </div>
                </section>

                <section className="lg:col-span-7 bg-[#120E1D] border border-purple-900/40 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-white text-sm">
                      Extracted Part Details (Editable)
                    </h2>
                    <span className="text-xs text-amber-300/90">Verify MPN &amp; Fitment</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-purple-200/80">Part Name</label>
                      <input
                        value={partForm.partName}
                        onChange={(e) => setPartForm({ ...partForm, partName: e.target.value })}
                        placeholder="e.g., Power Supply Board"
                        className="w-full bg-[#191427] border border-purple-800/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-purple-200/80">Brand</label>
                      <input
                        value={partForm.brand}
                        onChange={(e) => setPartForm({ ...partForm, brand: e.target.value })}
                        placeholder="e.g., Samsung / LG"
                        className="w-full bg-[#191427] border border-purple-800/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-amber-300">
                        OEM Part Number (MPN)
                      </label>
                      <input
                        value={partForm.mpn}
                        onChange={(e) => setPartForm({ ...partForm, mpn: e.target.value })}
                        placeholder="e.g., BN44-00807A"
                        className="w-full bg-[#191427] border border-purple-800/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-purple-200/80">
                        Board / Serial #
                      </label>
                      <input
                        value={partForm.boardNumber || partForm.serialNumber}
                        onChange={(e) =>
                          setPartForm({ ...partForm, boardNumber: e.target.value })
                        }
                        placeholder="PCB or serial code"
                        className="w-full bg-[#191427] border border-purple-800/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-purple-200/80">
                      Compatible Models
                    </label>
                    <input
                      value={partForm.compatibleModelsText}
                      onChange={(e) =>
                        setPartForm({ ...partForm, compatibleModelsText: e.target.value })
                      }
                      placeholder="Comma-separated model numbers"
                      className="w-full bg-[#191427] border border-purple-800/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-purple-200/80">
                      Raw Sticker OCR Text
                    </label>
                    <textarea
                      rows={3}
                      value={partForm.ocrRawText}
                      onChange={(e) => setPartForm({ ...partForm, ocrRawText: e.target.value })}
                      placeholder="Raw text read from sticker..."
                      className="w-full bg-[#0D0A15] border border-purple-900/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs font-mono text-purple-100 focus:outline-none"
                    />
                  </div>
                </section>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                      <Search className="w-4 h-4 text-amber-400 shrink-0" />
                      Market Comps &amp; Pricing Presets
                    </h2>
                    <div className="text-xs text-purple-300/80">
                      Sold Avg: <strong className="text-amber-300">${compStats.soldAvg}</strong> •
                      Low Active: <strong className="text-purple-200">${compStats.lowestActive}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => applyStrategyPrice('undercut')}
                      className="px-3 py-1.5 rounded-xl bg-[#1C162E] hover:bg-purple-700/40 border border-purple-800/50 text-xs font-medium text-purple-100"
                    >
                      Undercut Active (-$1.50)
                    </button>
                    <button
                      onClick={() => applyStrategyPrice('soldAvg')}
                      className="px-3 py-1.5 rounded-xl bg-[#1C162E] hover:bg-purple-700/40 border border-purple-800/50 text-xs font-medium text-purple-100"
                    >
                      Sold Avg (${compStats.soldAvg})
                    </button>
                    <button
                      onClick={() => applyStrategyPrice('fastFlip')}
                      className="px-3 py-1.5 rounded-xl bg-[#1C162E] hover:bg-purple-700/40 border border-purple-800/50 text-xs font-medium text-purple-100"
                    >
                      Fast Flip (-10%)
                    </button>
                    <button
                      onClick={() => applyStrategyPrice('premium')}
                      className="px-3 py-1.5 rounded-xl bg-[#1C162E] hover:bg-purple-700/40 border border-purple-800/50 text-xs font-medium text-amber-300"
                    >
                      Premium (+15%)
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {MOCK_COMPS.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#181226] border border-purple-900/40 text-xs"
                      >
                        <div>
                          <p className="font-medium text-white">{c.title}</p>
                          <span className="text-purple-300/70">{c.status}</span>
                        </div>
                        <span className="font-bold text-amber-300">${c.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-5 space-y-4">
                  <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                    Listing Title &amp; Net Profit Calculator
                  </h2>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-purple-300/80">
                      <span>eBay Title</span>
                      <span className="text-amber-300">{listing.title.length}/80</span>
                    </div>
                    <input
                      maxLength={80}
                      value={listing.title}
                      onChange={(e) => setListing({ ...listing, title: e.target.value })}
                      className="w-full bg-[#191427] border border-purple-800/50 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-purple-300/80">Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={listing.price}
                        onChange={(e) => setListing({ ...listing, price: e.target.value })}
                        className="w-full bg-[#191427] border border-purple-800/50 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-purple-300/80">Part Cost ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={listing.cogs}
                        onChange={(e) => setListing({ ...listing, cogs: e.target.value })}
                        className="w-full bg-[#191427] border border-purple-800/50 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-purple-300/80">Shipping ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={listing.shippingCost}
                        onChange={(e) =>
                          setListing({ ...listing, shippingCost: e.target.value })
                        }
                        className="w-full bg-[#191427] border border-purple-800/50 rounded-xl px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0D0A15] border border-purple-900/50 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-purple-300/70">eBay Fee (~13.25%)</p>
                      <p className="text-base font-semibold text-rose-400">
                        -${profitCalc.ebayFee.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300/70">Net Profit</p>
                      <p
                        className={`text-base font-bold ${
                          profitCalc.netProfit >= 0 ? 'text-amber-300' : 'text-rose-400'
                        }`}
                      >
                        ${profitCalc.netProfit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-purple-300/70">Margin</p>
                      <p className="text-base font-semibold text-purple-200">
                        {profitCalc.marginPct}%
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep(3)}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
                    >
                      Continue to Publish →
                    </button>
                  </div>
                </section>
              </div>
            )}

            {step === 3 && (
              <section className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-white text-base">Publish to eBay Store</h2>
                    <p className="text-xs text-purple-300/75">
                      Confirm policies and publish as a draft or live listing.
                    </p>
                  </div>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="bg-[#191427] border border-purple-800/50 rounded-xl px-3 py-2 text-sm text-white"
                  >
                    <option value="Sandbox">eBay Sandbox</option>
                    <option value="Production">eBay Production</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#181226] border border-purple-900/40">
                    <p className="text-purple-300/70">Fulfillment Policy</p>
                    <p className="font-semibold text-white mt-1">{listing.fulfillmentPolicy}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#181226] border border-purple-900/40">
                    <p className="text-purple-300/70">Return Policy</p>
                    <p className="font-semibold text-white mt-1">{listing.returnPolicy}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#181226] border border-purple-900/40">
                    <p className="text-purple-300/70">Payment Policy</p>
                    <p className="font-semibold text-white mt-1">{listing.paymentPolicy}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => publishListing(true)}
                    className="bg-[#1C162E] hover:bg-[#261E3F] border border-purple-800/50 text-purple-100 px-4 py-2.5 rounded-xl text-sm font-medium"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => publishListing(false)}
                    className="bg-purple-600 hover:bg-purple-500 border border-amber-400/40 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0" />
                    Publish to eBay ({environment})
                  </button>
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-4">
                <p className="text-xs text-purple-300/75">Gross Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">${totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-4">
                <p className="text-xs text-purple-300/75">Net Profit</p>
                <p className="text-2xl font-bold text-amber-300 mt-1">${totalNet.toFixed(2)}</p>
              </div>
              <div className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-300/75">Active / Draft SKUs</p>
                  <p className="text-2xl font-bold text-purple-200 mt-1">{listings.length}</p>
                </div>
                <button
                  onClick={simulateOrder}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-300 shrink-0" />
                  Simulate Sale
                </button>
              </div>
            </div>

            <section className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-5 overflow-x-auto">
              <h2 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400 shrink-0" />
                Recent Orders
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-purple-300/70 border-b border-purple-900/40">
                  <tr>
                    <th className="py-2 pr-4">Order ID</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Buyer</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-900/30">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs text-amber-300">{o.id}</td>
                      <td className="py-2.5 pr-4 text-white">{o.item}</td>
                      <td className="py-2.5 pr-4 text-purple-300/75">{o.buyer}</td>
                      <td className="py-2.5 pr-4 text-amber-300 font-semibold">
                        ${o.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-xs text-purple-200">{o.fulfillment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {activeTab === 'setup' && (
          <section className="bg-[#120E1D] border border-purple-900/40 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-white text-base">Vercel Environment Variables</h2>
            <p className="text-xs text-purple-300/80">
              Set these in <strong className="text-amber-300">Vercel → Settings → Environment Variables</strong>:
            </p>
            <pre className="bg-[#09070E] border border-purple-900/50 rounded-xl p-4 text-xs text-purple-100 overflow-x-auto">
{`CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_new_cloudflare_workers_ai_token

EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_RUNAME=`}
            </pre>
          </section>
        )}
      </main>
    </div>
  );
}
