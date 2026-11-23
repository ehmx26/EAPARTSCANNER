import React, { useMemo, useRef, useState } from 'react';
import {
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
  AlertCircle,
  Bell,
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
    payment: 'Paid',
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
    payment: 'Paid',
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
        const targetW = Math.round(img.width * scale);
        const targetH = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);

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

  const [activeTab, setActiveTab] = useState('workflow'); // 'workflow' | 'orders' | 'setup'
  const [step, setStep] = useState(1); // 1: Upload & OCR, 2: Comps & Pricing, 3: Publish
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
      sku: 'PART-BN4400807A-01',
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

      showToast('Part sticker scanned via Cloudflare Workers AI');
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
      sku: `SKU-${skuPart}-${Math.floor(100 + Math.random() * 900)}`,
      title: listing.title || partForm.partName || 'Untitled Replacement Part',
      mpn: partForm.mpn || 'N/A',
      price: Number(listing.price) || 0,
      qty: Number(listing.quantity) || 1,
      status: asDraft ? 'Draft' : `Active (${environment})`,
    };
    setListings((prev) => [newItem, ...prev]);
    showToast(asDraft ? 'Saved listing as Draft' : `Published to eBay ${environment}`);
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
      payment: 'Paid',
      fulfillment: 'Awaiting Shipment',
    };
    setOrders((prev) => [newOrder, ...prev]);
    showToast(`New order ${newOrder.id} received ($${salePrice.toFixed(2)})`);
  };

  const totalRevenue = orders.reduce((acc, o) => acc + o.amount, 0);
  const totalNet = orders.reduce(
    (acc, o) => acc + (o.amount - o.ebayFee - o.shipping - o.cogs),
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold">
            <Tag className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">PartSnap eBay Reseller Suite</h1>
            <p className="text-xs text-slate-400">
              Cloudflare Workers AI Vision OCR • Pricing &amp; Comps • eBay Inventory &amp; Orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'workflow'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Listing Workflow
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'orders'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Orders &amp; Listings ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'setup'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            API &amp; Env Setup
          </button>
        </div>
      </header>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2">
          <Bell className="w-4 h-4"/>
          {toast}
        </div>
      )}

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {activeTab === 'workflow' && (
          <>
            <div className="flex items-center gap-2 text-sm">
              {[
                { id: 1, label: '1. Photo & Vision OCR' },
                { id: 2, label: '2. Comps & Pricing' },
                { id: 3, label: '3. Publish to eBay' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`px-4 py-2 rounded-lg font-medium border ${
                    step === s.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {step === 1 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Camera className="w-4 h-4 text-indigo-400"/>
                      Upload Part Sticker / Barcode Photo
                    </h2>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="@cf/google/gemma-4-26b-a4b-it">
                        @cf/google/gemma-4-26b-a4b-it
                      </option>
                      <option value="@cf/meta/llama-4-scout-17b-16e-instruct">
                        @cf/meta/llama-4-scout-17b-16e-instruct
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
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition"
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Uploaded part label"
                        className="max-h-64 mx-auto rounded-lg object-contain"
                      />
                    ) : (
                      <div className="py-8 space-y-2">
                        <Upload className="w-8 h-8 mx-auto text-slate-400"/>
                        <p className="text-sm font-medium text-slate-200">
                          Click to choose a sticker, barcode, or circuit board photo
                        </p>
                        <p className="text-xs text-slate-400">
                          Auto-resized to 1024px JPEG (~80% quality) before scanning
                        </p>
                      </div>
                    )}
                  </div>

                  {imagePayload && (
                    <div className="text-xs text-slate-400 flex justify-between">
                      <span>
                        Original: {(imagePayload.originalBytes / 1024).toFixed(0)} KB
                      </span>
                      <span>
                        Compressed: {(imagePayload.compressedBytes / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  )}

                  {scanError && (
                    <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5"/>
                      <span>{scanError}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={runWorkersAiScan}
                      disabled={scanning || !imagePayload}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    >
                      {scanning ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin"/>
                          Scanning via Cloudflare Workers AI...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4"/>
                          Extract Part Details (OCR)
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-sm font-medium"
                    >
                      Next →
                    </button>
                  </div>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h2 className="font-semibold">Editable Extracted Part Details</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Part Name</span>
                      <input
                        value={partForm.partName}
                        onChange={(e) => setPartForm({ ...partForm, partName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Brand</span>
                      <input
                        value={partForm.brand}
                        onChange={(e) => setPartForm({ ...partForm, brand: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">OEM Part Number (MPN)</span>
                      <input
                        value={partForm.mpn}
                        onChange={(e) => setPartForm({ ...partForm, mpn: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Board / Serial #</span>
                      <input
                        value={partForm.boardNumber || partForm.serialNumber}
                        onChange={(e) =>
                          setPartForm({ ...partForm, boardNumber: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                  </div>

                  <label className="block space-y-1 text-sm">
                    <span className="text-xs text-slate-400">Compatible Models</span>
                    <input
                      value={partForm.compatibleModelsText}
                      onChange={(e) =>
                        setPartForm({ ...partForm, compatibleModelsText: e.target.value })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                    />
                  </label>

                  <label className="block space-y-1 text-sm">
                    <span className="text-xs text-slate-400">Raw Sticker OCR Text</span>
                    <textarea
                      rows={3}
                      value={partForm.ocrRawText}
                      onChange={(e) => setPartForm({ ...partForm, ocrRawText: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </label>
                </section>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Search className="w-4 h-4 text-indigo-400"/>
                      Market Comps &amp; Pricing Strategy
                    </h2>
                    <div className="text-xs text-slate-400">
                      Sold Avg: <strong className="text-emerald-400">${compStats.soldAvg}</strong> •
                      Low Active: <strong className="text-amber-400">${compStats.lowestActive}</strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => applyStrategyPrice('undercut')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
                    >
                      Undercut Active (-$1.50)
                    </button>
                    <button
                      onClick={() => applyStrategyPrice('soldAvg')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
                    >
                      Sold Average (${compStats.soldAvg})
                    </button>
                    <button
                      onClick={() => applyStrategyPrice('fastFlip')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
                    >
                      Fast Flip (-10%)
                    </button>
                    <button
                      onClick={() => applyStrategyPrice('premium')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
                    >
                      Premium (+15%)
                    </button>
                  </div>

                  <div className="space-y-2">
                    {MOCK_COMPS.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs"
                      >
                        <div>
                          <p className="font-medium text-slate-200">{c.title}</p>
                          <span className="text-slate-400">{c.status}</span>
                        </div>
                        <span className="font-semibold text-emerald-400">${c.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <h2 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400"/>
                    eBay Listing &amp; Net Profit Calculator
                  </h2>

                  <label className="block space-y-1 text-sm">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>eBay Listing Title</span>
                      <span>{listing.title.length}/80 chars</span>
                    </div>
                    <input
                      maxLength={80}
                      value={listing.title}
                      onChange={(e) => setListing({ ...listing, title: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                    />
                  </label>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Sale Price ($)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={listing.price}
                        onChange={(e) => setListing({ ...listing, price: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Part Cost ($)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={listing.cogs}
                        onChange={(e) => setListing({ ...listing, cogs: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-slate-400">Shipping ($)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={listing.shippingCost}
                        onChange={(e) =>
                          setListing({ ...listing, shippingCost: e.target.value })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                      />
                    </label>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Est. eBay Fee</p>
                      <p className="text-base font-semibold text-rose-400">
                        -${profitCalc.ebayFee.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Net Profit</p>
                      <p
                        className={`text-base font-bold ${
                          profitCalc.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        ${profitCalc.netProfit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Net Margin</p>
                      <p className="text-base font-semibold text-indigo-300">
                        {profitCalc.marginPct}%
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep(3)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
                    >
                      Continue to Publish →
                    </button>
                  </div>
                </section>
              </div>
            )}

            {step === 3 && (
              <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-lg">Publish to eBay Store</h2>
                    <p className="text-xs text-slate-400">
                      Review business policies and publish as a draft or live listing.
                    </p>
                  </div>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="Sandbox">eBay Sandbox</option>
                    <option value="Production">eBay Production</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
                    <p className="text-xs text-slate-400">Fulfillment Policy</p>
                    <p className="font-medium mt-1">{listing.fulfillmentPolicy}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
                    <p className="text-xs text-slate-400">Return Policy</p>
                    <p className="font-medium mt-1">{listing.returnPolicy}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
                    <p className="text-xs text-slate-400">Payment Policy</p>
                    <p className="font-medium mt-1">{listing.paymentPolicy}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => publishListing(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium"
                  >
                    Save as Draft
                  </button>
                  <button
                    onClick={() => publishListing(false)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4"/>
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400">Gross Order Revenue</p>
                <p className="text-2xl font-bold text-white mt-1">${totalRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <p className="text-xs text-slate-400">Estimated Net Profit</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">${totalNet.toFixed(2)}</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Active / Draft SKUs</p>
                  <p className="text-2xl font-bold text-indigo-300 mt-1">{listings.length}</p>
                </div>
                <button
                  onClick={simulateOrder}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <ShoppingBag className="w-4 h-4"/>
                  Simulate Sale
                </button>
              </div>
            </div>

            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400"/>
                Recent Orders
              </h2>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 pr-4">Order ID</th>
                    <th className="py-2 pr-4">Item</th>
                    <th className="py-2 pr-4">Buyer</th>
                    <th className="py-2 pr-4">Total</th>
                    <th className="py-2">Fulfillment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 pr-4 font-mono text-xs">{o.id}</td>
                      <td className="py-2.5 pr-4">{o.item}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{o.buyer}</td>
                      <td className="py-2.5 pr-4 text-emerald-400 font-medium">
                        ${o.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-xs">{o.fulfillment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {activeTab === 'setup' && (
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Vercel Environment Variables</h2>
            <p className="text-sm text-slate-400">
              Add these variables in your Vercel project under{' '}
              <strong className="text-slate-200">Settings → Environment Variables</strong>:
            </p>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-indigo-200 overflow-x-auto">
{`CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_new_cloudflare_workers_ai_token

# Optional for live eBay REST API integration:
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
