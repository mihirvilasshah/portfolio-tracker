# All-in-One Portfolio Tracker App Specification

**Last Updated:** November 2025  
**Version:** 1.0  
**Target User:** Indian investor tracking stocks, ETFs, mutual funds, crypto, unlisted shares, and invoice discounting across multiple platforms

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [App Architecture Overview](#app-architecture-overview)
3. [Data Sources & API Integration Strategy](#data-sources--api-integration-strategy)
4. [App Flow](#app-flow)
5. [Core Features](#core-features)
6. [Database Schema](#database-schema)
7. [API Integration Details](#api-integration-details)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Security & Compliance](#security--compliance)
10. [Alternative Approaches](#alternative-approaches)

---

## Executive Summary

This document outlines a comprehensive portfolio aggregation platform that consolidates investments across:

- **Indian Stocks & ETFs**: Zerodha (primary), fallback to CDSL/NSDL CAS
- **US Stocks & ETFs**: Vested, INDmoney (GIFT City access)
- **Mutual Funds**: MFCentral API (unified), MFapi.in (read-only data)
- **Cryptocurrency**: CoinDCX, Binance (spot trading)
- **Unlisted Shares**: Precize (manual entry or API if available)
- **Invoice Discounting**: Amplio (manual entry initially)

The app provides a unified dashboard showing:
- Consolidated portfolio value across all segments
- Asset allocation and sector exposure
- Performance metrics (returns, dividends, gains/losses)
- Cross-asset diversification analysis
- Automated data sync and refresh

---

## App Architecture Overview

### Tech Stack Recommendation

```
Frontend: React Native with TypeScript
          Expo (build & deployment)
          Expo Router (file-based routing)
          React Native Paper (UI components)

Backend/Database: Supabase
                  - PostgreSQL database (managed)
                  - Authentication (built-in)
                  - Real-time subscriptions
                  - Row-level security (RLS)
                  - Storage for documents
                  - Edge functions for serverless logic

Hosting: Supabase (fully managed)
         - Auto-scaling PostgreSQL
         - RESTful API auto-generated
         - GraphQL support
         - Built-in analytics
         - Automated backups

Security: Supabase Auth (JWT tokens)
          Row-level Security (RLS policies)
          Encrypted credentials storage
          API rate limiting
          Audit logging via pgaudit
```

### High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        PORTFOLIO TRACKER APP                      │
├──────────────────────────────────────────────────────────────────┤
│
│  ┌─────────────────────────────────────────────────────────────┐
│  │                    USER INTERFACE LAYER                      │
│  │  Dashboard | Portfolio | Holdings | Analytics | Settings    │
│  └─────────────────────────────────────────────────────────────┘
│                               │
│  ┌────────────────────────────┴────────────────────────────────┐
│  │                    API GATEWAY / AUTH                        │
│  │  JWT Token | Rate Limiting | Request Validation            │
│  └────────────────────────────┬────────────────────────────────┘
│                               │
│  ┌────────────────┬───────────┼──────────┬──────────┬──────────┐
│  │                │           │          │          │          │
│  ▼                ▼           ▼          ▼          ▼          ▼
│
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  │Portfolio │ │Sync Mgr  │ │Analytics │ │Auth Svc  │ │Webhook   │
│  │Service   │ │(Queued)  │ │Service   │ │          │ │Service   │
│  └─────┬────┘ └────┬─────┘ └──────┬───┘ └────┬─────┘ └────┬─────┘
│        │           │              │          │           │
│  ┌─────┴───────────┴──────────────┴──────────┴───────────┴─────┐
│  │              EXTERNAL API CONNECTORS LAYER                    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  │ Zerodha     │  │ MFCentral   │  │ CoinDCX     │  ...     │
│  │  │ Connector   │  │ Connector   │  │ Connector   │          │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │
│  └───────────────────────────────────────────────────────────────┘
│                               │
│  ┌────────────────────────────┼────────────────────────────────┐
│  │                  DATA LAYER                                  │
│  │  PostgreSQL │ Redis Cache │ MongoDB (Holdings Document)    │
│  └────────────────────────────────────────────────────────────┘
│
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Sources & API Integration Strategy

### 1. Indian Stocks & ETFs

#### Primary: Zerodha Kite Connect API ✅

**Status:** Fully Available  
**Authentication:** OAuth 2.0  
**Key Endpoints:**
- `GET /portfolio/holdings` - List all equity holdings
- `GET /portfolio/positions` - Intraday positions
- `GET /instruments` - Instrument master
- `GET /quote` - Real-time quotes
- `GET /trades` - Historical trades

**Rate Limits:** 200 requests/minute  
**Documentation:** https://kite.trade/docs/connect/v3/

**Advantages:**
- Complete stock & ETF data (NSE, BSE)
- Real-time price updates
- Order execution capability
- Built-in margin and leverage data

**Disadvantages:**
- Requires user Zerodha account + API key generation
- No mutual fund data (use Coin for that)

**Implementation:**
```javascript
// Pseudo-code
const zerodha = new KiteConnect({
  api_key: process.env.ZERODHA_API_KEY,
  access_token: userAccessToken // stored encrypted
});

const holdings = await zerodha.getHoldings();
// Returns: {
//   tradingsymbol: "INFY",
//   quantity: 10,
//   average_price: 1500,
//   last_price: 1650,
//   pnl: 1500
// }
```

#### Fallback 1: CDSL/NSDL CAS (Consolidated Account Statement) ⚠️

**Status:** Limited Direct API Access  
**Through:** CASParser (Third-party aggregator)
**URL:** https://docs.casparser.in

**Why Needed:**
- Demat holdings data from CDSL/NSDL depositories
- Useful for users who don't use Zerodha
- Official CAS documents provide authoritative holdings

**Implementation Challenge:**
- CDSL/NSDL don't expose direct REST APIs
- Need to use intermediate services (CASParser, MProfit, etc.)
- Requires user credentials or CAS file upload

**Recommendation:**
- Offer manual CAS file upload as fallback
- Parse XML/PDF CAS statements to extract holdings
- Use as supplementary data source for verification

#### Fallback 2: Stock Quote APIs

**Status:** Partially Available  
**Sources:**
- NSE India (https://www.nseindia.com) - No direct API
- TradingView API - Limited
- Free alternatives: Polygon.io (requires premium for Indian stocks)

**Recommendation:**
- Use Zerodha primarily
- Cache quotes from Zerodha API
- Fallback to free sources (e.g., Alpha Vantage, Finnhub) for non-trading views

---

### 2. US Stocks & ETFs

#### Primary Option 1: Vested App Integration ❌

**Status:** NO PUBLIC API  
**Why:**
- Vested is a consumer app with no developer API
- No official endpoint documentation
- Cannot programmatically extract holdings

**Workaround:**
```
1. Web Scraping (fragile, against ToS)
2. User manual export (CSV/screenshot)
3. Screen scraping via Selenium (unreliable)
```

#### Primary Option 2: INDmoney Global Access ⚠️

**Status:** NO PUBLIC API (as of Nov 2025)  
**Status:**
- INDmoney has US Stocks access via GIFT City (DriveWealth/Alpaca)
- No published API for third-party developers
- Account data not exposable

**Workaround:**
```
1. Browser automation (Playwright/Puppeteer)
2. Manual export option
3. Request INDmoney for API partnership
```

#### Recommended Fallback: Direct Integration with US Brokers

**Option A: Interactive Brokers API** ✅

**Status:** Fully Available  
**Website:** https://www.interactivebrokers.com

**Advantages:**
- Comprehensive holdings, positions, trades data
- Official Python/Java/C++ libraries
- Real-time market data
- Works across multiple investment platforms

**Disadvantage:**
- Users need IB account (not Vested/INDmoney)
- Complex authentication

**Endpoints:**
- Account summary and positions
- Holdings and portfolio value
- Transaction history

**Implementation:**
```python
# Using ibpy (Interactive Brokers Python API)
from ibapi.client import EClient
from ibapi.wrapper import EWrapper

class IBWrapper(EWrapper):
    def accountSummary(self, req_id, account, tag, value, currency):
        # Parse account holdings
        pass

client = EClient(IBWrapper())
client.connect("127.0.0.1", 7497, 1)  # TWS must be running
client.reqAccountSummary(req_id=1, group="All", tags="AccountType,NetLiquidation")
```

**Option B: Alpaca API** ✅

**Status:** Fully Available  
**Website:** https://alpaca.markets

**Why Alpaca:**
- Commission-free trading
- Open REST API with JSON responses
- Real-time WebSocket data
- Simple OAuth 2.0 authentication
- Broker used by INDmoney for US stocks

**Endpoints:**
```
GET /v2/accounts - Account info
GET /v2/positions - All open positions
GET /v2/assets - Available assets
GET /v2/activities - Transaction history
WebSocket /data/v1/quotes - Real-time quotes
```

**Implementation:**
```python
import requests

ALPACA_API_URL = "https://api.alpaca.markets"
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}"
}

# Get holdings
response = requests.get(f"{ALPACA_API_URL}/v2/positions", headers=headers)
positions = response.json()
# Returns: [
#   {"symbol": "AAPL", "qty": 5, "avg_fill_price": 150.0, "current_price": 155.0}
# ]
```

**Option C: User Manual Entry** ⚠️

**Interim Solution:**
- CSV/JSON import for US stock holdings
- User manually downloads statements and imports
- Semi-automated via browser extension (future)

**Recommendation for MVP:**
1. **Phase 1**: Manual CSV import for Vested/INDmoney users
2. **Phase 2**: Add Alpaca API integration (works for any US broker)
3. **Phase 3**: Explore partnership with Vested/INDmoney for direct integration

---

### 3. Mutual Funds

#### Primary: MFCentral API ✅

**Status:** Fully Available (B2B APIs)  
**Documentation:** https://www.mfcentral.com

**What is MFCentral:**
- Unified platform by CAMS + KFintech (India's two major RTAs)
- Provides consolidated holdings across ALL mutual fund houses
- SEBI-regulated

**Key Endpoints:**
```
1. CAS (Consolidated Account Statement) API
   - Get holdings by PAN
   - Historical transactions
   - NAV valuations

2. MF Transaction APIs
   - Place orders
   - SIP management
   - Redemptions

3. Capital Gains Reporting
   - Long-term/short-term capital gains
```

**Authentication:** API Key + Secret (B2B)

**Cost:** Charges per user sync (₹2-3 per PAN sync)

**Implementation:**
```python
import requests
import hmac
import hashlib

class MFCentralClient:
    def __init__(self, api_key, api_secret):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://api.mfcentral.com"
    
    def get_cas(self, pan):
        """Fetch CAS for given PAN"""
        payload = {"pan": pan}
        # Sign request
        signature = self._sign_request(payload)
        headers = {
            "X-API-KEY": self.api_key,
            "X-SIGNATURE": signature
        }
        response = requests.get(
            f"{self.base_url}/v1/cas",
            json=payload,
            headers=headers
        )
        return response.json()
    
    def _sign_request(self, payload):
        message = json.dumps(payload)
        return hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
```

**Response Structure:**
```json
{
  "pan": "XXXXXX",
  "folio_details": [
    {
      "fund_house": "ICICI Prudential",
      "scheme_name": "ICICI Prudential Bluechip Fund",
      "units": 150.5,
      "nav": 250.0,
      "value": 37625.0,
      "invested_amount": 36000.0
    }
  ],
  "total_portfolio_value": 125000.0,
  "last_updated": "2025-11-29"
}
```

#### Secondary: MFapi.in ✅

**Status:** Free, Read-Only API  
**Website:** https://www.mfapi.in

**Purpose:** Scheme information and historical NAV data (NOT holdings)

**Endpoints:**
```
GET /mf - List all schemes
GET /mf/[scheme_id] - Scheme details
GET /mf/[scheme_id]/latest - Latest NAV
GET /mf/[scheme_id]/history - NAV history
```

**Use Case:**
- Populate scheme master data (fund names, categories)
- Historical NAV for reporting
- No authentication needed
- Rate limiting: Generous (no strict limits documented)

**Implementation:**
```javascript
// Fetch scheme by code
const schemeCode = "101001"; // HDFC Top 100 Fund
const response = await fetch(`https://api.mfapi.in/mf/${schemeCode}`);
const scheme = await response.json();
// Returns: {
//   meta: { fund_house: "HDFC", scheme_type: "Open Ended", ... },
//   data: [{ date: "2025-11-29", nav: 250.0 }, ...]
// }
```

#### Tertiary: Groww MF Support ⚠️

**Status:** API Available, but MF limited  
**Website:** https://groww.in/trade-api

**Note:**
- Groww Trading API focuses on equity/F&O trading
- Mutual fund support via Coin (sub-app)
- Limited MF API documentation
- Recommendation: Use MFCentral instead

---

### 4. Cryptocurrency

#### Primary: CoinDCX API ✅

**Status:** Fully Available  
**Documentation:** https://docs.coindcx.com

**Authentication:** API Key + Secret (HMAC-SHA256)

**Key Endpoints:**
```
GET /exchange/v1/markets - Available trading pairs
GET /exchange/v1/ticker - Market data
GET /exchange/v1/users/balances - User balances
GET /exchange/v1/orders/active - Active orders
POST /exchange/v1/orders/create - Place order
GET /market_data/trade_history - Trade history
```

**Rate Limits:** 200 requests/minute

**Implementation:**
```python
import hmac
import hashlib
import json
import requests
import time

class CoinDCXClient:
    def __init__(self, api_key, api_secret):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://api.coindcx.com"
    
    def get_balances(self):
        """Fetch user balances"""
        payload = {
            "timestamp": int(time.time() * 1000)
        }
        message = json.dumps(payload)
        signature = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        headers = {
            "X-AUTH-APIKEY": self.api_key,
            "X-AUTH-SIGNATURE": signature
        }
        
        response = requests.post(
            f"{self.base_url}/exchange/v1/users/balances",
            json=payload,
            headers=headers
        )
        return response.json()
```

**Response:**
```json
{
  "status": "success",
  "data": [
    {"currency": "BTC", "balance": 0.5, "locked_balance": 0.1},
    {"currency": "ETH", "balance": 10.0, "locked_balance": 1.0},
    {"currency": "INR", "balance": 50000.0, "locked_balance": 0}
  ]
}
```

#### Secondary: Binance API ✅

**Status:** Fully Available  
**Website:** https://www.binance.com/en-IN/binance-api

**Why Include Binance:**
- Larger user base than CoinDCX in India
- Better liquidity for major pairs
- Official REST API + WebSocket support
- Python SDK available

**Key Endpoints:**
```
GET /api/v3/account - Account info and holdings
GET /api/v3/openOrders - Active orders
GET /api/v3/allOrders - Historical orders
GET /api/v3/ticker/24hr - Market data
WebSocket stream: User balance updates in real-time
```

**Implementation:**
```python
from binance.client import Client
from binance.exceptions import BinanceAPIException

client = Client(api_key=BINANCE_API_KEY, api_secret=BINANCE_API_SECRET)

# Get account balances
try:
    account = client.get_account()
    balances = account['balances']
    # Filter non-zero balances
    holdings = [b for b in balances if float(b['free']) + float(b['locked']) > 0]
except BinanceAPIException as e:
    print(f"Error: {e.status_code} - {e.message}")
```

**Response:**
```json
{
  "balances": [
    {"asset": "BTC", "free": "0.5", "locked": "0.1"},
    {"asset": "ETH", "free": "10.0", "locked": "1.0"}
  ],
  "makerCommission": 10
}
```

#### Real-Time Crypto Price Data

**Option 1: CoinGecko API** ✅ (Free)

```
GET https://api.coingecko.com/api/v3/simple/price
?ids=bitcoin,ethereum
&vs_currencies=inr
&include_market_cap=true
```

**Option 2: Binance WebSocket** ✅

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

ws.on('message', (data) => {
  const ticker = JSON.parse(data);
  console.log(`BTC: $${ticker.c}`); // current price
});
```

---

### 5. Unlisted Shares

#### Primary: Precize App ❌

**Status:** NO PUBLIC API  
**Why:**
- Precize is consumer app for unlisted shares marketplace
- No official API for third-party developers
- Data is proprietary to Precize

**Workaround Options:**

1. **Manual Entry** (Recommended for MVP)
   - User enters: Company name, shares quantity, cost per share
   - App tracks them separately with manual updates

2. **CSV Import**
   - User downloads holdings from Precize as CSV
   - Imports into portfolio app

3. **Future Partnership**
   - Contact Precize for B2B API access
   - Likely requires formal business agreement

**Implementation (Manual Entry):**
```typescript
interface UnlistedShare {
  id: string;
  company_name: string;
  quantity: number;
  cost_per_share: number;
  purchase_date: Date;
  notes: string;
  current_valuation?: number; // Manual update
}

// User enters via form
// Stored in custom_holdings table
```

---

### 6. Invoice Discounting

#### Primary: Amplio Invest ❌

**Status:** NO PUBLIC API (as of Nov 2025)

**Why:**
- Amplio is a fintech for alternate investments
- Holdings are in user's Amplio account
- No third-party API available yet

**Workaround Options:**

1. **Manual Tracking** (Recommended for MVP)
   - User tracks investment amount, expected return, maturity date
   - Stored in custom_investments table
   - Manual P&L calculation

2. **CSV Export**
   - User downloads statement from Amplio dashboard
   - Imports into app

3. **Browser Automation** (Advanced)
   - Playwright/Puppeteer to scrape Amplio dashboard
   - Fragile, requires maintenance

**Implementation (Manual Entry):**
```typescript
interface InvoiceDiscountingInvestment {
  id: string;
  platform: "amplio" | "other";
  investment_amount: number;
  expected_return_percentage: number;
  maturity_date: Date;
  invested_date: Date;
  status: "active" | "matured" | "redeemed";
  description?: string;
}

// User enters via form
// Stored in custom_investments table
```

---

## App Flow

### User Journey: First-Time Setup

```
┌─────────────────────────────────────────────────────────────┐
│  1. APP INSTALL & LOGIN                                     │
│     - User installs app                                      │
│     - Signs up with email/mobile + password                 │
│     - Email verification                                    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ONBOARDING: CONNECT ACCOUNTS                            │
│     ┌─────────────────┬──────────────┬──────────────────┐   │
│     ▼                 ▼              ▼                  ▼   │
│  Indian Stocks    Mutual Funds   Cryptocurrency    US Stocks│
│  - Zerodha        - MFCentral    - CoinDCX/Binance  - Manual│
│    (OAuth)        (PAN + OTP)    (API key)          (CSV)   │
│     │                 │              │                  │   │
│     └─────────────────┼──────────────┼──────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. OPTIONAL: ADD MANUAL HOLDINGS                           │
│     - Unlisted shares (Precize data)                        │
│     - Invoice discounting (Amplio)                          │
│     - CSV import for any asset class                        │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. PORTFOLIO DASHBOARD                                     │
│     ✓ All holdings aggregated                              │
│     ✓ Real-time prices                                     │
│     ✓ Performance metrics                                  │
│     ✓ Asset allocation chart                               │
└─────────────────────────────────────────────────────────────┘
```

### Automated Data Sync Flow

```
┌────────────────────────────────────────────────────────────┐
│  BACKGROUND JOB: Sync Holdings (Every 5-15 mins)           │
│  Triggered: On-demand or scheduled                         │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  1. RETRIEVE STORED CREDENTIALS                            │
│     - Decrypt stored API keys (KMS)                        │
│     - Check for expiry (OAuth tokens)                      │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  2. PARALLEL API CALLS (Optimized)                         │
│     ┌──────────┬──────────┬──────────┬──────────┐          │
│     ▼          ▼          ▼          ▼          ▼          │
│   Zerodha   MFCentral  CoinDCX   Binance   (Manual)        │
│   Holdings  PAN CAS    Balances  Balances  Records         │
│     │          │          │          │          │          │
│     └──────────┼──────────┼──────────┼──────────┘          │
│                ▼                                           │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  3. FETCH REAL-TIME PRICES                                 │
│     - Stock prices from Zerodha                            │
│     - NAV from MFapi.in                                    │
│     - Crypto prices from CoinGecko/Binance                 │
│     - Cache in Redis (5-min expiry)                        │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  4. TRANSFORM & NORMALIZE                                  │
│     - Convert all currencies to INR                        │
│     - Standardize holding format                           │
│     - Calculate valuations & P&L                           │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  5. STORE IN DATABASE                                      │
│     - Update holdings table                                │
│     - Store historical snapshots                           │
│     - Update aggregated portfolio value                    │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  6. CALCULATE ANALYTICS                                    │
│     - Asset allocation %                                   │
│     - Sector exposure                                      │
│     - Top movers (gains/losses)                            │
│     - Diversification score                                │
│     - Cache results                                        │
└──────────────┬─────────────────────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────┐
│  7. PUSH NOTIFICATIONS (Optional)                          │
│     - Large price movements                                │
│     - Dividend announcements                               │
│     - Sync completion status                               │
└────────────────────────────────────────────────────────────┘
```

---

## Core Features

### Feature 1: Dashboard & Portfolio Overview

**Components:**
- Total portfolio value (sum across all asset classes)
- Cash/liquidity position
- Invested capital vs. current value
- Gain/Loss (absolute and percentage)
- Asset allocation pie chart
- Day's performance (stocks/crypto)

**Data Refresh:** Real-time for crypto, 5-min for stocks, hourly for MFs

**Implementation:**
```typescript
interface PortfolioDashboard {
  total_portfolio_value: number; // INR
  invested_capital: number;
  unrealized_gains: number;
  unrealized_gain_percentage: number;
  realized_gains: number;
  cash_balance: number;
  
  asset_allocation: {
    indian_stocks: number; // INR
    etfs: number;
    mutual_funds: number;
    cryptocurrency: number;
    unlisted_shares: number;
    invoice_discounting: number;
  };
  
  top_gainers: Array<{
    asset_type: string;
    name: string;
    gain_percentage: number;
  }>;
  
  top_losers: Array<{...}>;
}
```

---

### Feature 2: Holdings by Category

**View Holdings For:**
1. **Indian Stocks**
   - ISIN/Symbol, company name
   - Quantity, avg cost, current price
   - P&L, returns %
   - Broker (Zerodha)

2. **Indian ETFs**
   - ETF name, fund house
   - Units, NAV, current value
   - P&L tracking

3. **Mutual Funds**
   - Fund house, scheme name
   - Folios, units, NAV
   - SIPs active
   - Invested amount, current value
   - Dividend/growth option tracking

4. **Cryptocurrency**
   - Coin name, symbol
   - Quantity, average buy price
   - Current value (INR & USD)
   - P&L, returns %
   - Exchange (CoinDCX/Binance)

5. **Unlisted Shares**
   - Company name
   - Quantity, cost price
   - Current valuation (manual)
   - Notes & documents

6. **Invoice Discounting**
   - Investment amount
   - Expected return, maturity date
   - Status, documents

---

### Feature 3: Performance Analytics

**Metrics Calculated:**

```typescript
interface PerformanceMetrics {
  // Time-based returns
  returns_1d: number;
  returns_1w: number;
  returns_1m: number;
  returns_3m: number;
  returns_6m: number;
  returns_1y: number;
  returns_ytd: number;
  
  // Volatility
  volatility_1m: number;
  volatility_3m: number;
  volatility_1y: number;
  
  // Risk metrics
  sharpe_ratio: number; // vs. risk-free rate (10Y G-Sec)
  beta: number; // vs. Nifty 50
  maximum_drawdown: number;
  
  // Concentration
  gini_coefficient: number; // Diversification measure
  herfindahl_index: number; // Concentration measure
  
  // Dividend tracking
  annual_dividend_yield: number;
  dividend_received_ytd: number;
  
  // Realized gains
  realized_gains_ytd: number;
  realized_losses_ytd: number;
}
```

**Charts & Visualizations:**
- Portfolio growth chart (cumulative value over time)
- Asset allocation (pie chart, treemap)
- Sector exposure (bar chart)
- Returns breakdown by asset class
- Monthly/quarterly returns heatmap

---

### Feature 4: Notifications & Alerts

**Alert Types:**

1. **Price Alerts**
   - Stock reaches target price
   - Crypto volatility spike (>5%)
   - Large intraday movements

2. **Portfolio Alerts**
   - Portfolio crosses investment threshold
   - Major P&L changes
   - Dividend announcement

3. **Rebalancing Alerts**
   - Asset allocation drifts from target
   - Suggestion to rebalance

4. **Action Items**
   - MF SIP upcoming
   - Invoice discounting maturity
   - Tax loss harvesting opportunity

**Notification Channels:**
- In-app notifications
- Push notifications (mobile)
- Email digest (weekly/monthly)

---

### Feature 5: Transaction History & Reporting

**Track:**
- Buy/sell orders (stocks, crypto)
- MF SIP transactions
- Dividend received
- Interest earned
- Invoice discounting payments

**Export Options:**
- PDF reports (for tax filing)
- CSV export
- Email summaries

---

### Feature 6: Cryptocurrency-Specific Features

**Gas Tracking (if applicable):**
- Blockchain transaction history
- Transaction fees
- Tax implications

**Staking/Lending:**
- Track staking rewards
- Lending platform integration (future)

---

### Feature 7: Settings & Account Management

**User Settings:**
- Theme (light/dark)
- Notification preferences
- Refresh frequency
- Currency preference (INR/USD)
- Risk profile for recommendations

**Connected Accounts Management:**
- List connected platforms
- Disconnect/reconnect
- Re-authenticate expired tokens
- Subscription/billing

**Security:**
- Change password
- 2FA setup
- Session management
- Activity log

---

## Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(15),
  full_name VARCHAR(255),
  password_hash VARCHAR(255),
  kra_id VARCHAR(50) UNIQUE,
  pan VARCHAR(10) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- User credentials (encrypted)
CREATE TABLE user_credentials (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50), -- 'zerodha', 'mfcentral', 'coindcx', etc.
  api_key VARCHAR(500) ENCRYPTED,
  api_secret VARCHAR(500) ENCRYPTED,
  access_token VARCHAR(500) ENCRYPTED,
  refresh_token VARCHAR(500) ENCRYPTED,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, platform)
);

-- Holdings table
CREATE TABLE holdings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type VARCHAR(50), -- 'stock', 'etf', 'mf', 'crypto', 'unlisted', 'invoice'
  source_platform VARCHAR(50), -- 'zerodha', 'mfcentral', 'coindcx', 'binance', 'manual'
  
  -- Asset identifiers
  isin_code VARCHAR(20),
  symbol VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  
  -- Quantity & Cost
  quantity DECIMAL(20,8) NOT NULL,
  average_cost_price DECIMAL(15,2),
  total_invested DECIMAL(15,2),
  
  -- Current value
  current_price DECIMAL(15,2),
  current_value DECIMAL(15,2),
  
  -- P&L
  unrealized_gain DECIMAL(15,2),
  unrealized_gain_percentage DECIMAL(8,2),
  realized_gain DECIMAL(15,2),
  
  -- Metadata
  sector VARCHAR(50),
  industry VARCHAR(50),
  acquisition_date DATE,
  currency VARCHAR(3) DEFAULT 'INR',
  
  -- Sync info
  last_synced_at TIMESTAMP,
  raw_data JSONB, -- Store original API response
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id, asset_type),
  INDEX (user_id, source_platform)
);

-- Portfolio snapshots (for history tracking)
CREATE TABLE portfolio_snapshots (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  total_value DECIMAL(15,2),
  invested_capital DECIMAL(15,2),
  unrealized_gains DECIMAL(15,2),
  
  asset_allocation JSONB, -- { 'stocks': 50, 'mf': 30, 'crypto': 20 }
  
  snapshot_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id, snapshot_date)
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  holding_id UUID REFERENCES holdings(id),
  
  transaction_type VARCHAR(50), -- 'buy', 'sell', 'dividend', 'interest', 'split'
  quantity DECIMAL(20,8),
  price DECIMAL(15,2),
  total_amount DECIMAL(15,2),
  currency VARCHAR(3),
  
  transaction_date DATE NOT NULL,
  settlement_date DATE,
  
  notes VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id, transaction_date)
);

-- Price history (cache)
CREATE TABLE price_history (
  id UUID PRIMARY KEY,
  asset_type VARCHAR(50),
  symbol VARCHAR(50),
  isin_code VARCHAR(20),
  
  date DATE NOT NULL,
  open DECIMAL(15,2),
  high DECIMAL(15,2),
  low DECIMAL(15,2),
  close DECIMAL(15,2),
  volume BIGINT,
  
  PRIMARY KEY (asset_type, symbol, date)
);

-- Unlisted shares (manual entries)
CREATE TABLE unlisted_shares (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  company_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(20,4) NOT NULL,
  cost_per_share DECIMAL(15,2),
  purchase_date DATE,
  
  current_valuation DECIMAL(15,2),
  valuation_date DATE,
  
  notes TEXT,
  documents_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id)
);

-- Invoice discounting investments
CREATE TABLE invoice_discounting (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  platform VARCHAR(50), -- 'amplio', etc.
  investment_amount DECIMAL(15,2) NOT NULL,
  expected_return_percentage DECIMAL(8,2),
  
  invested_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  
  status VARCHAR(50), -- 'active', 'matured', 'redeemed'
  actual_return DECIMAL(15,2),
  
  description TEXT,
  documents_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id, status)
);

-- Sync logs (for debugging)
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  platform VARCHAR(50),
  sync_status VARCHAR(50), -- 'pending', 'success', 'failed'
  
  records_fetched INT,
  records_updated INT,
  
  error_message TEXT,
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX (user_id, created_at DESC)
);
```

---

## API Integration Details

### Zerodha Integration

**Setup:**
```bash
1. Create account at zerodha.com
2. Generate API key: https://kite.trade/app/keys
3. Implement OAuth flow in app
```

**Token Management:**
```python
class ZerodhaTokenManager:
    def __init__(self):
        self.request_token_url = "https://kite.trade/connect/login"
        self.access_token_url = "https://api.kite.trade/session/token"
    
    def get_login_url(self):
        """Returns URL for user to login and generate request token"""
        return f"{self.request_token_url}?api_key={ZERODHA_API_KEY}&v=3"
    
    def exchange_token(self, request_token):
        """Exchange request token for access token"""
        data = {
            'api_key': ZERODHA_API_KEY,
            'request_token': request_token,
            'checksum': self.get_checksum(request_token)
        }
        response = requests.post(self.access_token_url, data=data)
        return response.json()['data']['access_token']
    
    def refresh_token(self, refresh_token):
        """Refresh expired access token"""
        # Similar to exchange_token
        pass
```

**Scheduled Sync:**
```python
# Every 10 minutes during market hours
@scheduler.scheduled_job('cron', hour='9-16', minute='*/10', day_of_week='mon-fri')
def sync_zerodha_holdings():
    active_users = User.query.filter_by(zerodha_connected=True).all()
    
    for user in active_users:
        try:
            creds = get_credentials(user.id, 'zerodha')
            holdings = zerodha_client.get_holdings(creds.access_token)
            
            update_holdings(user.id, holdings, 'zerodha')
            log_sync(user.id, 'zerodha', 'success', len(holdings))
        except Exception as e:
            log_sync(user.id, 'zerodha', 'failed', error=str(e))
```

---

### MFCentral Integration

**Setup:**
```bash
1. Register as RIA/Distributor on MFCentral
2. Get API key and secret
3. Generate API keys for integration
```

**CAS Fetching:**
```python
class MFCentralClient:
    def __init__(self, api_key, api_secret):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = "https://api.mfcentral.com"
    
    def fetch_cas_by_pan(self, pan, otp):
        """Fetch CAS for PAN with OTP verification"""
        payload = {
            "pan": pan,
            "otp": otp,
            "timestamp": int(time.time() * 1000)
        }
        
        signature = self.sign_request(payload)
        headers = {
            "X-API-KEY": self.api_key,
            "X-SIGNATURE": signature,
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            f"{self.base_url}/v1/cas",
            json=payload,
            headers=headers
        )
        
        # Handle response
        if response.status_code == 200:
            return response.json()['data']
        else:
            raise MFCentralException(response.json())
    
    def sign_request(self, payload):
        """HMAC-SHA256 signature"""
        message = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature
```

**Sync Frequency:**
- Once daily (market close)
- Cost: ₹2-3 per PAN sync
- Batch optimize: Sync multiple PANs in single request

---

### CoinDCX & Binance Integration

**Separate Integration:**
```python
class CryptoPortfolioSync:
    def __init__(self):
        self.coindcx = CoinDCXClient()
        self.binance = BinanceClient()
    
    def sync_all_crypto(self, user_id):
        """Sync holdings from both exchanges"""
        user_creds = get_credentials(user_id)
        
        # Fetch from CoinDCX
        if 'coindcx' in user_creds:
            coindcx_balances = self.coindcx.get_balances(
                user_creds['coindcx'].api_key,
                user_creds['coindcx'].api_secret
            )
            self.store_crypto_holdings(user_id, coindcx_balances, 'coindcx')
        
        # Fetch from Binance
        if 'binance' in user_creds:
            binance_balances = self.binance.get_account(
                user_creds['binance'].api_key,
                user_creds['binance'].api_secret
            )
            self.store_crypto_holdings(user_id, binance_balances, 'binance')
        
        # Fetch current prices (non-authenticated)
        prices = self.get_current_prices()
        
        # Calculate values in INR
        self.calculate_holdings_value(user_id, prices)
```

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-8)

**Scope:**
- Auth + user management
- Zerodha integration (stocks/ETFs)
- MFCentral integration (mutual funds)
- Basic dashboard
- Holdings view

**Deliverables:**
- Web app (React)
- Backend API (Node.js/Express)
- Database (PostgreSQL)
- Docker setup

**Testing:**
- Unit tests (>80% coverage)
- Integration tests with APIs

---

### Phase 2: Crypto & US Stocks (Weeks 9-12)

**Additions:**
- CoinDCX + Binance integration
- Crypto portfolio tracking
- US stocks manual import (CSV)
- Real-time crypto price updates

**Features:**
- Crypto-specific analytics
- Price alert system

---

### Phase 3: Analytics & Mobile (Weeks 13-16)

**Additions:**
- React Native mobile app
- Advanced portfolio analytics
- Historical performance tracking
- Notifications

---

### Phase 4: Premium Features (Weeks 17-20)

**Additions:**
- Tax reporting
- Rebalancing recommendations
- Portfolio optimization
- Unlisted shares tracking
- Invoice discounting

---

## Security & Compliance

### Authentication & Authorization

**OAuth 2.0 with JWT:**
```javascript
// User login
POST /auth/login
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "access_token": "eyJhbGc...", // Valid for 1 hour
  "refresh_token": "eyJhbGc...", // Valid for 30 days
  "expires_in": 3600
}

// Use access token for API calls
Authorization: Bearer eyJhbGc...
```

### API Key & Secret Encryption

**KMS Encryption:**
```python
import boto3

kms = boto3.client('kms')

# Encrypt API keys
def encrypt_credentials(api_key, api_secret):
    response = kms.encrypt(
        KeyId='arn:aws:kms:region:account:key/id',
        Plaintext=json.dumps({
            'api_key': api_key,
            'api_secret': api_secret
        })
    )
    return response['CiphertextBlob']

# Decrypt when needed
def decrypt_credentials(encrypted_blob):
    response = kms.decrypt(CiphertextBlob=encrypted_blob)
    return json.loads(response['Plaintext'].decode())
```

### Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/portfolio')
@limiter.limit("10 per minute")
def get_portfolio():
    return portfolio_data
```

### Data Privacy

- PCI-DSS compliance (if handling payments)
- GDPR-compliant data deletion
- Audit logs for credential access
- Session timeout (15 minutes)

### Compliance

- **KYC:** Validate PAN/KRA ID on signup
- **Tax:** Track cost basis for gains reporting
- **SEBI:** Follow regulations for investment platforms
- **RBI:** Comply with LRS for US investments

---

## Alternative Approaches

### Approach 1: Aggregator Service (Current Plan)

**Pros:**
- Unified user interface
- Multi-platform holdings
- No need to use individual apps

**Cons:**
- API maintenance overhead
- Rate limit management
- Credential security responsibility

---

### Approach 2: Browser Extension

**Concept:**
- Chrome/Firefox extension
- Injected into individual brokers (Zerodha, Groww, etc.)
- Extract holdings via DOM parsing

**Pros:**
- No API dependency
- Works even without public APIs

**Cons:**
- Fragile (UI changes break it)
- Browser-dependent
- Security concerns with DOM access

---

### Approach 3: Third-Party Aggregator APIs

**Services:**
- **Cashcow**: Aggregates portfolio
- **Zefo**: Portfolio management
- **Kuvera**: Multi-asset tracking

**Pros:**
- Already integrated with platforms
- Less development effort

**Cons:**
- Subscription costs
- Limited customization
- Data privacy (third party holds credentials)

---

### Approach 4: Hybrid (Recommended for Scale)

**Strategy:**
1. Start with direct API integrations (Zerodha, MFCentral)
2. Use third-party APIs for smaller platforms (unlisted, invoice)
3. Add browser extension for legacy platforms
4. Eventually achieve 90%+ coverage

**Implementation Timeline:**
- Q1 2026: Zerodha + MFCentral + CoinDCX
- Q2 2026: Vested/INDmoney partnership or manual import
- Q3 2026: Browser extension for other brokers
- Q4 2026: Enterprise APIs for Precize/Amplio

---

## Conclusion & Next Steps

### Immediate Actions

1. **Secure API Keys**
   - Zerodha: Generate API key from dashboard
   - MFCentral: Apply for B2B partnership
   - CoinDCX/Binance: Generate user API keys

2. **Environment Setup**
   - Node.js backend with Express
   - React frontend
   - PostgreSQL + Redis
   - Docker containers

3. **Skeleton Code**
   ```bash
   npm init -y
   npm install express axios dotenv
   npm install @kite connect --save
   ```

4. **Database Migrations**
   - Create schema (use provided SQL)
   - Set up backups

5. **API Wrapper Libraries**
   - Zerodha: Use official KiteConnect SDK
   - MFCentral: Custom HTTP client
   - CoinDCX: Custom HTTP client
   - Binance: Use official SDK

### Success Metrics

- **User Growth**: 1K users in 6 months
- **Platform Coverage**: 90%+ of user assets synced
- **API Reliability**: 99.9% uptime
- **Sync Speed**: <5 seconds for full portfolio update
- **User Retention**: 60% DAU

---

**Document End**

For questions or updates, refer to individual platform documentation links provided throughout this spec.
