import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  Edit3,
  Eye,
  FileText,
  Key,
  Package,
  Plus,
  RefreshCw,
  Server,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';

const PRESET_PARTS = [
  {
    id: 'preset-1',
    name: 'Samsung 65" QLED Power Supply Board',
    mpn: 'BN44-01055A',
    boardNumber: 'L65E7_KSM',
    serialNumber: 'CN07BN4401055ASK28R5491',
    barcode: '8806091245912',
    brand: 'Samsung',
    categoryPath: 'Consumer Electronics > TV Boards, Parts & Components > Power Supply Boards',
    fitsModels: ['QN65Q70RAFXZA', 'QN65Q70R', 'QN65Q80RAFXZA'],
    condition: 'Used - Fully Functional (Grade A)',
    visualNotes: 'Capacitors clean, connector pins intact, tested working.',
    rawOcr: 'MODEL: L65E7_KSM / SEC CODE: BN44-01055A / REV 1.2',
    cogs: 18.5,
    listPrice: 79.99,
    sampleImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    comps: {
      activeCount: 12,
      activeLowest: 68.0,
      activeHighest: 95.0,
      soldAvg: 74.5,
    },
  },
  {
    id: 'preset-2',
    name: 'LG OLED Main Control Board',
    mpn: 'EAX69083603',
    boardNumber: 'EBT66432801',
    serialNumber: 'KR2011LGEAX69083',
    barcode: '712703810234',
    brand: 'LG',
    categoryPath: 'Consumer Electronics > TV Parts > Main Boards',
    fitsModels: ['OLED55CXPUA', 'OLED65CXPUA'],
    condition: 'Used - Fully Functional (Grade A)',
    visualNotes: 'HDMI ports clean, thermal pad inspected.',
    rawOcr: 'LG MAIN BOARD / EAX69083603 (1.0) / EBT66432801',
    cogs: 35.0,
    listPrice: 139.0,
    sampleImage: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80',
    comps: {
      activeCount: 7,
      activeLowest: 125.0,
      activeHighest: 165.0,
      soldAvg: 134.0,
    },
  },
  {
    id: 'preset-3',
    name: 'Whirlpool Refrigerator Inverter Board',
    mpn: 'W10893917',
    boardNumber: 'W10893918-A',
    serialNumber: 'WP1089391720230501',
    barcode: '883049442105',
    brand: 'Whirlpool',
    categoryPath: 'Home & Garden > Appliance Parts > Refrigerator Parts',
    fitsModels: ['WRF555SDFZ09', 'WRF767SDHZ02'],
    condition: 'Used - Tested & Working',
    visualNotes: 'Terminals clean, relay and fuse intact.',
    rawOcr: 'WHIRLPOOL INVERTER CONTROL / W10893917 / W10893918-A',
    cogs: 12.0,
    listPrice: 64.99,
    sampleImage: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80',
    comps: {
      activeCount: 19,
      activeLowest: 54.0,
      activeHighest: 79.99,
      soldAvg: 59.99,
    },
  },
];

const INITIAL_INVENTORY = [
  {
    id: 'inv-101',
    sku: 'PART-BN44-01055A-01',
    title: 'Samsung BN44-01055A QN65Q70RAFXZA Power Supply Board Tested',
    mpn: 'BN44-01055A',
    price: 79.99,
    cogs: 18.5,
    quantity: 3,
    status: 'ACTIVE',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'inv-102',
    sku: 'PART-W10893917-03',
    title: 'Whirlpool Refrigerator Inverter Board W10893917 Working',
    mpn: 'W10893917',
    price: 64.99,
    cogs: 12.0,
    quantity: 4,
    status: 'ACTIVE',
    image: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80',
  },
];

const INITIAL_ORDERS = [
  {
    id: 'ORD-98214',
    buyer: 'tech_fixer_ny',
    itemTitle: 'Samsung BN44-01055A Power Supply Board Tested',
    mpn: 'BN44-01055A',
    salePrice: 79.99,
    ebayFees: 10.9,
    cogs: 18.5,
    netProfit: 50.59,
    status: 'AWAITING_SHIPMENT',
    trackingNumber: null,
  },
  {
    id: 'ORD-98190',
    buyer: 'appliance_pro_tx',
    itemTitle: 'Whirlpool Refrigerator Inverter Board W10893917',
    mpn: 'W10893917',
    salePrice: 64.99,
    ebayFees: 8.91,
    cogs: 12.0,
    netProfit: 44.08,
    status: 'SHIPPED',
    trackingNumber: '9400111202555910249120',
  },
];

async function compressFileToBase64(file, maxWidth = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          dataUrl,
          base64: dataUrl.split(',')[1],
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function playSaleChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio errors when blocked by browser autoplay policy
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('workflow');
  const [ebayEnv, setEbayEnv] = useState('SANDBOX');
  const [workflowStep, setWorkflowStep] = useState(1);

  const [inventory, setInventory] = useState(() => {
    try {
      const saved = localStorage.getItem('ebay_parts_inventory');
      return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    } catch {
      return INITIAL_INVENTORY;
    }
  });

  const [orders, setOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('ebay_parts_orders');
      return saved ? JSON.parse(saved) : INITIAL_ORDERS;
    } catch {
      return INITIAL_ORDERS;
    }
  });

  const [uploadedImages, setUploadedImages] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanError, setScanError] = useState('');
  const [toast, setToast] = useState('');

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishLogs, setPublishLogs] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  const [shippingModalOrder, setShippingModalOrder] = useState(null);
  const [trackingInput, setTrackingInput] = useState('');

  const [partForm, setPartForm] = useState({
    mpn: '',
    boardNumber: '',
    serialNumber: '',
    barcode: '',
    partName: '',
    brand: '',
    categoryPath: '',
    fitsModelsText: '',
    condition: 'Used - Fully Functional (Grade A)',
    visualNotes: '',
    rawOcr: '',
    cogs: 15.0,
    listPrice: 69.99,
    sku: '',
    comps: {
      activeCount: 12,
      activeLowest: 68.0,
      activeHighest: 95.0,
      soldAvg: 74.5,
    },
  });

  useEffect(() => {
    try {
      localStorage.setItem('ebay_parts_inventory', JSON.stringify(inventory));
    } catch {
      // Ignore storage quota errors
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem('ebay_parts_orders', JSON.stringify(orders));
    } catch {
      // Ignore storage quota errors
    }
  }, [orders]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSelectPreset = (preset) => {
    setScanError('');
    setUploadedImages([preset.sampleImage]);
    setPartForm({
      mpn: preset.mpn,
      boardNumber: preset.boardNumber,
      serialNumber: preset.serialNumber,
      barcode: preset.barcode,
      partName: preset.name,
      brand: preset.brand,
      categoryPath: preset.categoryPath,
      fitsModelsText: preset.fitsModels.join(', '),
      condition: preset.condition,
      visualNotes: preset.visualNotes,
      rawOcr: preset.rawOcr,
      cogs: preset.cogs,
      listPrice: preset.listPrice,
      sku: `PART-${preset.mpn}-${Math.floor(100 + Math.random() * 900)}`,
      comps: preset.comps,
    });
    showToast(`Loaded preset ${preset.mpn}`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzing(true);
    setScanError('');

    try {
      const { dataUrl, base64 } = await compressFileToBase64(file, 1024, 0.8);
      setUploadedImages((prev) => [dataUrl, ...prev]);

      const res = await fetch('/api/scan-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: 'image/jpeg',
          model: '@cf/google/gemma-4-26b-a4b-it',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Scan failed (${res.status})`);
      }

      const mpnVal = data.mpn || '';
      const brandVal = data.brand || '';
      const nameVal = data.partName || '';
      const modelsVal = Array.isArray(data.compatibleModels)
        ? data.compatibleModels.join(', ')
        : '';

      setPartForm((prev) => ({
        ...prev,
        mpn: mpnVal,
        boardNumber: data.boardNumber || '',
        serialNumber: data.serialNumber || '',
        barcode: data.barcode || '',
        partName: nameVal,
        brand: brandVal,
        categoryPath: data.category || '',
        fitsModelsText: modelsVal,
        condition: data.condition || 'Used - Fully Functional (Grade A)',
        visualNotes: data.notes || '',
        rawOcr: data.ocrRawText || '',
        sku: `PART-${(mpnVal || 'ITEM').replace(/[^A-Za-z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      }));
      showToast('Sticker OCR completed');
    } catch (err) {
      setScanError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyQuickPrice = (mode) => {
    let nextPrice = Number(partForm.listPrice) || 50;
    const avg = Number(partForm.comps.soldAvg) || 74.5;
    const low = Number(partForm.comps.activeLowest) || 68.0;

    if (mode === 'MATCH_LOWEST') nextPrice = Math.max(9.99, low - 1.0);
    if (mode === 'SOLD_AVG') nextPrice = avg;
    if (mode === 'FAST_FLIP') nextPrice = avg * 0.9;
    if (mode === 'PREMIUM') nextPrice = avg * 1.15;

    setPartForm((prev) => ({ ...prev, listPrice: Number(nextPrice.toFixed(2)) }));
    showToast(`Price updated to $${nextPrice.toFixed(2)}`);
  };

  const executeEbayPublishing = (isDraft) => {
    setIsPublishing(true);
    setShowPublishModal(true);
    setPublishLogs([]);

    const sku =
      partForm.sku ||
      `PART-${(partForm.mpn || 'ITEM').replace(/[^A-Za-z0-9]/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const steps = [
      `Connecting to eBay ${ebayEnv} OAuth session...`,
      `Preparing inventory item ${sku}...`,
      isDraft ? 'Saving listing in Drafts...' : 'Publishing listing to store...',
    ];

    steps.forEach((msg, idx) => {
      setTimeout(() => {
        setPublishLogs((prev) => [...prev, msg]);
        if (idx === steps.length - 1) {
          setIsPublishing(false);
          setInventory((prev) => [
            {
              id: `inv-${Date.now()}`,
              sku,
              title: partForm.partName || `${partForm.brand} ${partForm.mpn} Part`,
              mpn: partForm.mpn || 'N/A',
              price: Number(partForm.listPrice) || 0,
              cogs: Number(partForm.cogs) || 0,
              quantity: 1,
              status: isDraft ? 'DRAFT' : 'ACTIVE',
              image:
                uploadedImages[0] ||
                'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
            },
            ...prev,
          ]);
        }
      }, (idx + 1) * 550);
    });
  };

  const handleSimulateSale = () => {
    const activeItems = inventory.filter((i) => i.status === 'ACTIVE' && i.quantity > 0);
    if (!activeItems.length) {
      showToast('No active stock available to simulate a sale.');
      return;
    }
    const picked = activeItems[Math.floor(Math.random() * activeItems.length)];
    const fee = Number((picked.price * 0.1325 + 0.3).toFixed(2));
    const net = Number((picked.price - picked.cogs - fee - 8.5).toFixed(2));

    const newOrder = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      buyer: `buyer_${Math.floor(100 + Math.random() * 900)}`,
      itemTitle: picked.title,
      mpn: picked.mpn,
      salePrice: picked.price,
      ebayFees: fee,
      cogs: picked.cogs,
      netProfit: net,
      status: 'AWAITING_SHIPMENT',
      trackingNumber: null,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setInventory((prev) =>
      prev.map((item) =>
        item.id === picked.id ? { ...item, quantity: Math.max(0, item.quantity - 1) } : item
      )
    );
    playSaleChime();
    showToast(`New sale ${newOrder.id} ($${picked.price.toFixed(2)})`);
  };

  const handleSaveTracking = (e) => {
    e.preventDefault();
    if (!shippingModalOrder || !trackingInput.trim()) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === shippingModalOrder.id
          ? { ...o, status: 'SHIPPED', trackingNumber: trackingInput.trim() }
          : o
      )
    );
    showToast(`Tracking saved for ${shippingModalOrder.id}`);
    setShippingModalOrder(null);
    setTrackingInput('');
  };

  const activeCount = inventory.filter((i) => i.status === 'ACTIVE').length;
  const awaitingCount = orders.filter((o) => o.status === 'AWAITING_SHIPMENT').length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.salePrice, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);
  const inventoryValue = inventory.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const feeEstimate = Number(((Number(partForm.listPrice) || 0) * 0.1325 + 0.3).toFixed(2));
  const netEstimate = Number(
    ((Number(partForm.listPrice) || 0) - (Number(partForm.cogs) || 0) - feeEstimate - 8.5).toFixed(2)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
            <Cpu className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-white">PartPulse AI</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800/60 font-semibold">
                Reseller Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Vision OCR, Market Comps &amp; eBay Listing Suite
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={() => setEbayEnv('SANDBOX')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                ebayEnv === 'SANDBOX' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
              }`}
            >
              SANDBOX
            </button>
            <button
              onClick={() => setEbayEnv('PRODUCTION')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                ebayEnv === 'PRODUCTION' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}
            >
              PRODUCTION
            </button>
          </div>

          <button
            onClick={handleSimulateSale}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold"
          >
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            <span>Simulate Sale</span>
          </button>

          {awaitingCount > 0 && (
            <button
              onClick={() => setActiveTab('orders')}
              className="relative p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800 border border-slate-700"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {awaitingCount}
              </span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50 p-4 flex-col justify-between hidden md:flex shrink-0">
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === 'workflow'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span>New Listing Workflow</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === 'inventory'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Package className="h-4 w-4 text-indigo-400" />
                <span>Listings &amp; Drafts</span>
              </div>
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full font-mono">{activeCount}</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === 'orders'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-4 w-4 text-emerald-400" />
                <span>Sales &amp; Orders</span>
              </div>
              {awaitingCount > 0 && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {awaitingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === 'api'
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>API &amp; Env Setup</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Inventory Value</span>
              <span className="font-mono text-slate-200 font-semibold">${inventoryValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Net Profit</span>
              <span className="font-mono text-emerald-400 font-bold">${totalProfit.toFixed(2)}</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {activeTab === 'workflow' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">New Part Intake &amp; Listing</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Photo &amp; OCR -&gt; Comps &amp; Price -&gt; Publish
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {[
                    { id: 1, label: '1. Vision & OCR' },
                    { id: 2, label: '2. Comps & Price' },
                    { id: 3, label: '3. Publish' },
                  ].map((s, idx) => (
                    <React.Fragment key={s.id}>
                      <button
                        onClick={() => setWorkflowStep(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          workflowStep === s.id
                            ? 'bg-violet-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                      {idx < 2 && <ChevronRight className="h-4 w-4 text-slate-600" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {workflowStep === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                      <p className="text-xs font-bold text-slate-300 uppercase">1-Click Test Presets</p>
                      {PRESET_PARTS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className="w-full text-left p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700 flex items-center space-x-3"
                        >
                          <img
                            src={preset.sampleImage}
                            alt={preset.mpn}
                            className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-100 truncate">{preset.name}</p>
                            <p className="text-[11px] font-mono text-amber-400">MPN: {preset.mpn}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="bg-slate-900 border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-2xl p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="part-photo-input"
                      />
                      <label htmlFor="part-photo-input" className="cursor-pointer block space-y-2">
                        <Upload className="h-7 w-7 mx-auto text-violet-400" />
                        <p className="text-sm font-semibold text-slate-200">Upload Sticker or Part Photo</p>
                        <p className="text-xs text-slate-400">Scans via /api/scan-part</p>
                      </label>
                    </div>

                    {scanError && (
                      <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
                        {scanError}
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 relative">
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-950/80 rounded-2xl z-20 flex flex-col items-center justify-center space-y-2">
                        <RefreshCw className="h-7 w-7 text-violet-400 animate-spin" />
                        <p className="text-sm font-bold text-slate-200">Scanning sticker...</p>
                      </div>
                    )}

                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span>Extracted Part Details (Editable)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">OEM Part Number (MPN)</label>
                        <input
                          type="text"
                          value={partForm.mpn}
                          onChange={(e) => setPartForm({ ...partForm, mpn: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-amber-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Board Number</label>
                        <input
                          type="text"
                          value={partForm.boardNumber}
                          onChange={(e) => setPartForm({ ...partForm, boardNumber: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Serial Number</label>
                        <input
                          type="text"
                          value={partForm.serialNumber}
                          onChange={(e) => setPartForm({ ...partForm, serialNumber: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-300"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Brand</label>
                        <input
                          type="text"
                          value={partForm.brand}
                          onChange={(e) => setPartForm({ ...partForm, brand: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-400 mb-1">Listing Title / Part Name</label>
                        <input
                          type="text"
                          value={partForm.partName}
                          onChange={(e) => setPartForm({ ...partForm, partName: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-semibold text-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-400 mb-1">Compatible Models</label>
                        <input
                          type="text"
                          value={partForm.fitsModelsText}
                          onChange={(e) => setPartForm({ ...partForm, fitsModelsText: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-indigo-300"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => setWorkflowStep(2)}
                        className="flex items-center space-x-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl"
                      >
                        <span>Next: Comps &amp; Price</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {workflowStep === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-indigo-400" />
                      <span>Market Comps</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <p className="text-slate-400">Sold Avg</p>
                        <p className="text-lg font-bold text-emerald-400 font-mono">${partForm.comps.soldAvg}</p>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <p className="text-slate-400">Lowest Active</p>
                        <p className="text-lg font-bold text-slate-200 font-mono">${partForm.comps.activeLowest}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button onClick={() => applyQuickPrice('MATCH_LOWEST')} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left">
                        <span className="block font-bold text-amber-400">Undercut (-$1)</span>
                      </button>
                      <button onClick={() => applyQuickPrice('SOLD_AVG')} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left">
                        <span className="block font-bold text-emerald-400">Sold Avg</span>
                      </button>
                      <button onClick={() => applyQuickPrice('FAST_FLIP')} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left">
                        <span className="block font-bold text-indigo-400">Fast Flip (-10%)</span>
                      </button>
                      <button onClick={() => applyQuickPrice('PREMIUM')} className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-left">
                        <span className="block font-bold text-violet-400">Premium (+15%)</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <Edit3 className="h-4 w-4 text-violet-400" />
                      <span>Pricing &amp; Profit Estimator</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Price ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={partForm.listPrice}
                          onChange={(e) => setPartForm({ ...partForm, listPrice: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Part Cost ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={partForm.cogs}
                          onChange={(e) => setPartForm({ ...partForm, cogs: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200"
                        />
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <p className="text-slate-400">Est. Net (after fee + $8.50 ship)</p>
                        <p className={`text-base font-bold font-mono ${netEstimate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${netEstimate.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between pt-2">
                      <button onClick={() => setWorkflowStep(1)} className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold">
                        Back
                      </button>
                      <button onClick={() => setWorkflowStep(3)} className="flex items-center space-x-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl">
                        <span>Next: Publish</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {workflowStep === 3 && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center space-x-2 text-sm font-bold text-slate-200">
                    <Eye className="h-4 w-4 text-indigo-400" />
                    <span>Listing Preview ({ebayEnv})</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center gap-4">
                    <img
                      src={
                        uploadedImages[0] ||
                        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
                      }
                      alt="Preview"
                      className="w-24 h-24 rounded-lg object-cover border border-slate-800"
                    />
                    <div>
                      <p className="font-bold text-white">{partForm.partName || 'Replacement Part'}</p>
                      <p className="text-xl font-extrabold text-emerald-400 font-mono">
                        ${Number(partForm.listPrice || 0).toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">MPN: {partForm.mpn || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => executeEbayPublishing(true)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm flex items-center justify-center space-x-2"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Save as Draft</span>
                    </button>
                    <button
                      onClick={() => executeEbayPublishing(false)}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center justify-center space-x-2"
                    >
                      <Zap className="h-4 w-4 text-amber-300" />
                      <span>Publish ({ebayEnv})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Listings &amp; Drafts</h2>
                <button
                  onClick={() => setActiveTab('workflow')}
                  className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Part</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Item</th>
                      <th className="p-4">MPN</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Qty</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {inventory.map((item) => (
                      <tr key={item.id}>
                        <td className="p-4 font-semibold text-white">{item.title}</td>
                        <td className="p-4 font-mono text-amber-400">{item.mpn}</td>
                        <td className="p-4 font-mono text-emerald-400">${item.price.toFixed(2)}</td>
                        <td className="p-4 font-mono">{item.quantity}</td>
                        <td className="p-4">{item.status}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setInventory((prev) => prev.filter((i) => i.id !== item.id))}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="h-4 w-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-xs text-slate-400">Gross Revenue</p>
                  <p className="text-2xl font-bold text-white font-mono">${totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <p className="text-xs text-slate-400">Net Profit</p>
                  <p className="text-2xl font-bold text-emerald-400 font-mono">${totalProfit.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="p-3">Order</th>
                      <th className="p-3">Buyer</th>
                      <th className="p-3">Item</th>
                      <th className="p-3">Sale</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Tracking</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="p-3 font-mono font-bold">{ord.id}</td>
                        <td className="p-3 text-indigo-300">{ord.buyer}</td>
                        <td className="p-3">{ord.itemTitle}</td>
                        <td className="p-3 font-mono text-emerald-400">${ord.salePrice.toFixed(2)}</td>
                        <td className="p-3">{ord.status}</td>
                        <td className="p-3 text-right">
                          {ord.status === 'AWAITING_SHIPMENT' ? (
                            <button
                              onClick={() => {
                                setShippingModalOrder(ord);
                                setTrackingInput('9400111202555910249999');
                              }}
                              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold"
                            >
                              Add Tracking
                            </button>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400">
                              {ord.trackingNumber || 'Done'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Key className="h-5 w-5 text-amber-400" />
                  <span>Vercel Environment Variables</span>
                </h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      'CLOUDFLARE_ACCOUNT_ID=7ff4e406f6ba209022259bed28ea8fd9\nCLOUDFLARE_API_TOKEN=YOUR_TOKEN\nEBAY_APP_ID=\nEBAY_CERT_ID=\nEBAY_RUNAME='
                    );
                    showToast('Copied .env template');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto">
{`CLOUDFLARE_ACCOUNT_ID=7ff4e406f6ba209022259bed28ea8fd9
CLOUDFLARE_API_TOKEN=YOUR_TOKEN
EBAY_APP_ID=
EBAY_CERT_ID=
EBAY_RUNAME=`}
              </pre>
            </div>
          )}
        </main>
      </div>

      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Server className="h-5 w-5 text-emerald-400" />
              <span>Listing Status</span>
            </h3>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
              {publishLogs.map((line, i) => (
                <div key={i} className="text-emerald-400">&gt; {line}</div>
              ))}
              {isPublishing && <div className="text-violet-400">Working...</div>}
            </div>
            {!isPublishing && (
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowPublishModal(false);
                    setActiveTab('inventory');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs"
                >
                  View Listings
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {shippingModalOrder && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Add Tracking ({shippingModalOrder.id})</h3>
              <button onClick={() => setShippingModalOrder(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveTracking} className="space-y-3 text-xs">
              <input
                type="text"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 font-mono text-amber-300"
              />
              <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl">
                Save Tracking
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
