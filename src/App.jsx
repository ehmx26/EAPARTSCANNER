import React, { useState, useEffect } from 'react';
import {
  Upload, Sparkles, Search, Package, ShoppingBag, Settings,
  CheckCircle2, ArrowRight, RefreshCw, Copy,
  Trash2, Edit3, FileText, BarChart3, Zap, Plus,
  ChevronRight, Eye, X, Bell, Code, Key, Server, Cpu
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
    categoryPath: 'Consumer Electronics > TV, Video & Home Audio > TV Boards, Parts & Components > Power Supply Boards',
    categoryId: '175673',
    fitsModels: ['QN65Q70RAFXZA', 'QN65Q70R', 'QN65Q80RAFXZA', 'QN65Q75R'],
    condition: 'Used - Fully Functional (Grade A)',
    visualNotes: 'All electrolytic capacitors inspected & test within normal ESR. Connector pins clean and undamaged. Minor mounting trace wear.',
    rawOcr: 'SAMSUNG ELECTRO-MECHANICS CO. LTD. / MODEL: L65E7_KSM / SEC CODE: BN44-01055A / S/N: CN07BN4401055ASK28R5491 / REV 1.2 / MADE IN VIETNAM',
    cogs: 18.50,
    listPrice: 79.99,
    sampleImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
    comps: {
      activeCount: 12,
      activeLowest: 68.00,
      activeMedian: 79.95,
      activeHighest: 95.00,
      soldAvg: 74.50,
      soldCount: 28,
      recentSolds: [
        { title: 'Samsung BN44-01055A Power Supply QN65Q70RAFXZA Tested', price: 74.99, date: '2 days ago', condition: 'Used' },
        { title: 'OEM Samsung QN65Q70R Power Board BN44-01055A L65E7_KSM', price: 78.50, date: '4 days ago', condition: 'Used' },
        { title: 'BN44-01055A Samsung 65" QLED Power Supply Board - Working', price: 69.95, date: '1 week ago', condition: 'Used' },
      ]
    }
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
    categoryId: '175673',
    fitsModels: ['OLED55CXPUA', 'OLED65CXPUA', 'OLED55CX6LA'],
    condition: 'Used - Fully Functional (Grade A)',
    visualNotes: 'HDMI ports checked for physical damage. BGA processor thermal pad replaced. Board clean without corrosion.',
    rawOcr: 'LG ELECTRONICS / MAIN BOARD / EAX69083603 (1.0) / EBT66432801 / CHASSIS: LA01B / DATE: 2020.08.14',
    cogs: 35.00,
    listPrice: 139.00,
    sampleImage: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80',
    comps: {
      activeCount: 7,
      activeLowest: 125.00,
      activeMedian: 139.99,
      activeHighest: 165.00,
      soldAvg: 134.00,
      soldCount: 15,
      recentSolds: [
        { title: 'LG OLED55CXPUA Main Board EAX69083603 EBT66432801 Tested', price: 139.00, date: 'Yesterday', condition: 'Used' },
        { title: 'LG Main Board EAX69083603 for OLED65CXPUA', price: 129.99, date: '3 days ago', condition: 'Used' },
      ]
    }
  },
  {
    id: 'preset-3',
    name: 'Whirlpool Refrigerator Inverter Board',
    mpn: 'W10893917',
    boardNumber: 'W10893918-A',
    serialNumber: 'WP1089391720230501',
    barcode: '883049442105',
    brand: 'Whirlpool',
    categoryPath: 'Home & Garden > Major Appliances > Appliance Parts > Refrigerator Parts',
    categoryId: '20713',
    fitsModels: ['WRF555SDFZ09', 'WRF767SDHZ02', 'KRFF507HPS01', 'WRF555SDFZ10'],
    condition: 'Used - Tested & Working',
    visualNotes: 'Sub-assembly relay operational. Fuse intact. Terminals free of carbon deposits.',
    rawOcr: 'WHIRLPOOL CORP. / EMBRACO INVERTER CONTROL / W10893917 / W10893918-A / 120V 50/60Hz / MADE IN MEXICO',
    cogs: 12.00,
    listPrice: 64.99,
    sampleImage: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80',
    comps: {
      activeCount: 19,
      activeLowest: 54.00,
      activeMedian: 64.95,
      activeHighest: 79.99,
      soldAvg: 59.99,
      soldCount: 42,
      recentSolds: [
        { title: 'OEM Whirlpool Refrigerator Inverter Board W10893917 Tested', price: 59.99, date: 'Today', condition: 'Used' },
        { title: 'Whirlpool WRF555SDFZ09 Inverter Board W10893917', price: 62.50, date: '2 days ago', condition: 'Used' },
      ]
    }
  }
];

const INITIAL_INVENTORY = [
  {
    id: 'inv-101',
    sku: 'PART-BN44-01055A-01',
    title: 'Samsung BN44-01055A QN65Q70RAFXZA Power Supply Board L65E7_KSM Tested',
    mpn: 'BN44-01055A',
    boardNumber: 'L65E7_KSM',
    brand: 'Samsung',
    price: 79.99,
    cogs: 18.50,
    quantity: 3,
    status: 'ACTIVE',
    category: 'TV Power Supply Boards',
    ebayListingId: '285491029412',
    views: 142,
    watchers: 8,
    dateAdded: '2026-11-10',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'inv-102',
    sku: 'PART-EAX69083603-02',
    title: 'LG OLED55CXPUA Main Board EAX69083603 EBT66432801 Tested Guarantee',
    mpn: 'EAX69083603',
    boardNumber: 'EBT66432801',
    brand: 'LG',
    price: 139.00,
    cogs: 35.00,
    quantity: 1,
    status: 'ACTIVE',
    ebayListingId: '285491038102',
    views: 89,
    watchers: 5,
    dateAdded: '2026-11-14',
    image: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'inv-103',
    sku: 'PART-W10893917-03',
    title: 'Whirlpool Refrigerator Inverter Board W10893917 WRF555SDFZ09 Working',
    mpn: 'W10893917',
    boardNumber: 'W10893918-A',
    brand: 'Whirlpool',
    price: 64.99,
    cogs: 12.00,
    quantity: 4,
    status: 'ACTIVE',
    ebayListingId: '285491049120',
    views: 215,
    watchers: 14,
    dateAdded: '2026-11-02',
    image: 'https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'inv-104',
    sku: 'PART-LJ92-01954A-DRAFT',
    title: 'Samsung T-Con Board LJ92-01954A LJ41-09479A UN55D6000SF Draft',
    mpn: 'LJ92-01954A',
    boardNumber: 'LJ41-09479A',
    brand: 'Samsung',
    price: 29.99,
    cogs: 6.00,
    quantity: 2,
    status: 'DRAFT',
    ebayListingId: null,
    views: 0,
    watchers: 0,
    dateAdded: '2026-11-20',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
  }
];

const INITIAL_ORDERS = [
  {
    id: 'ORD-98214',
    ebayOrderId: '14-09821-48912',
    buyer: 'tech_fixer_ny (Mike R.)',
    address: '142 Industrial Pkwy, Suite 4, Rochester, NY 14624',
    sku: 'PART-BN44-01055A-01',
    itemTitle: 'Samsung BN44-01055A QN65Q70RAFXZA Power Supply Board L65E7_KSM Tested',
    mpn: 'BN44-01055A',
    salePrice: 79.99,
    shippingPaid: 0.00,
    ebayFees: 10.90,
    cogs: 18.50,
    netProfit: 50.59,
    status: 'AWAITING_SHIPMENT',
    trackingNumber: null,
    carrier: 'USPS',
    orderDate: '2026-11-23 18:42'
  },
  {
    id: 'ORD-98190',
    ebayOrderId: '14-09819-01294',
    buyer: 'appliance_pro_tx (Carlos M.)',
    address: '802 Oakridge Ave, Austin, TX 78704',
    sku: 'PART-W10893917-03',
    itemTitle: 'Whirlpool Refrigerator Inverter Board W10893917 WRF555SDFZ09 Working',
    mpn: 'W10893917',
    salePrice: 64.99,
    shippingPaid: 0.00,
    ebayFees: 8.91,
    cogs: 12.00,
    netProfit: 44.08,
    status: 'SHIPPED',
    trackingNumber: '9400111202555910249120',
    carrier: 'USPS Ground Advantage',
    orderDate: '2026-11-22 11:15'
  },
  {
    id: 'ORD-98104',
    ebayOrderId: '14-09810-44910',
    buyer: 'repair_depot_ca (Elena V.)',
    address: '405 Market St, San Jose, CA 95110',
    sku: 'PART-EAX69083603-02',
    itemTitle: 'LG OLED55CXPUA Main Board EAX6
