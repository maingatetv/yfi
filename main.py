from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import httpx
import time
import os
import sqlite3
import secrets
import logging
import asyncio
from typing import Dict, Any, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from web3 import Web3

# Configure local logging to file
logger = logging.getLogger("yieldfi")
logger.setLevel(logging.INFO)
# Ensure handlers aren't duplicated on hot-reloading
if not logger.handlers:
    file_handler = logging.FileHandler("api_execute.log", encoding="utf-8")
    file_formatter = logging.Formatter("%(message)s")
    file_handler.setFormatter(file_formatter)
    logger.addHandler(file_handler)

DB_PATH = "keys.db"

def init_db():
    """Initializes the SQLite database and populates schema + default environment keys."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            api_key TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            rate_limit INTEGER DEFAULT 100
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS api_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            api_key TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            from_token TEXT,
            to_token TEXT,
            amount TEXT,
            status INTEGER NOT NULL
        )
    """)
    conn.commit()
    
    # Pre-populate YIELDFI_API_KEY if configured in environment
    env_key = os.getenv("YIELDFI_API_KEY")
    if env_key:
        cursor.execute("SELECT api_key FROM api_keys WHERE api_key = ?", (env_key,))
        if not cursor.fetchone():
            now_str = datetime.utcnow().isoformat() + "Z"
            cursor.execute(
                "INSERT INTO api_keys (api_key, user_id, created_at, rate_limit) VALUES (?, ?, ?, ?)",
                (env_key, "admin_env", now_str, 1000)
            )
            conn.commit()
    conn.close()

init_db()

app = FastAPI(title="YieldFi Router API", version="2.4.0")

# CORS Middleware config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory cache configuration for DefiLlama
CACHE_EXPIRATION_SECONDS = 300
cache_db: Dict[str, Dict[str, Any]] = {
    "tvl": {
        "data": None,
        "expires_at": 0.0,
        "last_updated": None
    },
    "yields": {
        "data": None,
        "expires_at": 0.0,
        "last_updated": None
    }
}

RWA_PROJECTS = {
    "ondo-finance", "ondo", "maple", "centrifuge", "goldfinch", "clearpool", 
    "backed", "openeden", "mountain-protocol", "hashnote", "superstate", 
    "backed-assets", "matrixport", "tangible", "realt", "plume", "atlendis", 
    "credix", "trufi", "clearpool-rwa", "backed-finance", "etherfuse", 
    "huma-finance", "polytrade", "stg-rwa", "fujida"
}

# Chain mapping for 1inch v6
CHAIN_MAP = {
    "ethereum": 1,
    "eth": 1,
    "1": 1,
    "bsc": 56,
    "56": 56,
    "polygon": 137,
    "matic": 137,
    "137": 137,
    "optimism": 10,
    "op": 10,
    "10": 10,
    "arbitrum": 42161,
    "arb": 42161,
    "42161": 42161,
    "base": 8453,
    "8453": 8453,
}

# Exception handlers to enforce standard JSON error formatting
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "code": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_msg = "; ".join([f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in errors])
    return JSONResponse(
        status_code=400,
        content={"error": f"Validation Error: {error_msg}", "code": 400}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": f"Internal Server Error: {str(exc)}", "code": 500}
    )

# Models
class GenerateKeyRequest(BaseModel):
    user_id: str = Field(..., description="Unique user identification tag")
    rate_limit: int = Field(100, description="Rate limit (requests per hour) to associate with this key")

class ExecuteRequest(BaseModel):
    fromToken: str = Field(..., description="Source token contract address")
    toToken: str = Field(..., description="Destination token contract address")
    amount: str = Field(..., description="Amount to swap in minimal token units")
    chain: str = Field(..., description="Chain name or ID")
    walletAddress: str = Field(..., description="User's wallet address")
    slippage: float = Field(1.0, description="Slippage tolerance percentage")

# Helper to log calls to both SQLite and file
def log_api_call(api_key: str, endpoint: str, from_token: str, to_token: str, amount: str, status: int):
    now_str = datetime.utcnow().isoformat() + "Z"
    # Log to SQLite
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO api_logs (timestamp, api_key, endpoint, from_token, to_token, amount, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (now_str, api_key, endpoint, from_token, to_token, amount, status))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to save log to SQLite: {e}")

    # Log to api_execute.log file
    try:
        log_line = f"timestamp={now_str}, key={api_key}, fromToken={from_token}, toToken={to_token}, amount={amount}, status={status}"
        logger.info(log_line)
    except Exception as e:
        print(f"Failed to log to file: {e}")

# Rate Limiter and Key Validation Middleware
@app.middleware("http")
async def api_key_and_rate_limit_middleware(request: Request, call_next):
    # Only protect POST endpoints except the auth generation path
    if request.method == "POST" and request.url.path != "/api/auth/generate-key":
        x_api_key = request.headers.get("x-api-key")
        if not x_api_key:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized: Missing x-api-key header", "code": 401}
            )
        
        # Check database for API key validity
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT rate_limit FROM api_keys WHERE api_key = ?", (x_api_key,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized: Invalid x-api-key", "code": 401}
            )
        
        rate_limit = row[0]
        
        # Check rate limits (requests in past hour)
        one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat() + "Z"
        cursor.execute("""
            SELECT COUNT(*) FROM api_logs 
            WHERE api_key = ? AND timestamp >= ? AND endpoint != '/api/auth/generate-key'
        """, (x_api_key, one_hour_ago))
        count = cursor.fetchone()[0]
        conn.close()
        
        if count >= rate_limit:
            return JSONResponse(
                status_code=429,
                content={"error": "Rate limit exceeded. Maximum 100 requests per hour.", "code": 429}
            )
            
    response = await call_next(request)
    return response

# Retry Helper Function
async def fetch_with_retries(client: httpx.AsyncClient, method: str, url: str, **kwargs) -> httpx.Response:
    retries = 3
    delay = 1.0
    for attempt in range(retries):
        try:
            if method.upper() == "GET":
                response = await client.get(url, **kwargs)
            elif method.upper() == "POST":
                response = await client.post(url, **kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Successful response
            if response.status_code == 200:
                return response
            
            # Retry on rate limiting or standard server/network failures
            if response.status_code in [429, 500, 502, 503, 504]:
                if attempt < retries - 1:
                    await asyncio.sleep(delay * (2 ** attempt))
                    continue
            return response
        except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
            if attempt < retries - 1:
                await asyncio.sleep(delay * (2 ** attempt))
                continue
            raise e
    raise httpx.RequestError("Max retries exceeded")

def sum_chain_tvls(protocol: Dict[str, Any]) -> float:
    chain_tvls = protocol.get("chainTvls")
    if isinstance(chain_tvls, dict) and chain_tvls:
        total = 0.0
        for k, v in chain_tvls.items():
            if isinstance(v, (int, float)):
                total += float(v)
        return total
    return float(protocol.get("tvl") or 0.0)

# Endpoints
@app.post("/api/auth/generate-key")
async def generate_key(payload: GenerateKeyRequest):
    new_key = "yf_" + secrets.token_hex(24)
    now_str = datetime.utcnow().isoformat() + "Z"
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO api_keys (api_key, user_id, created_at, rate_limit) VALUES (?, ?, ?, ?)",
        (new_key, payload.user_id, now_str, payload.rate_limit)
    )
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "api_key": new_key,
        "user_id": payload.user_id,
        "rate_limit": payload.rate_limit,
        "created_at": now_str
    }

@app.get("/api/tvl")
async def get_tvl():
    now = time.time()
    cached = cache_db["tvl"]
    
    if cached["data"] is not None and now < cached["expires_at"]:
        return cached["data"]
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await fetch_with_retries(client, "GET", "https://api.llama.fi/protocols")
            if response.status_code != 200:
                raise Exception(f"HTTP Error {response.status_code}")
                
            data = response.json()
            if not isinstance(data, list):
                raise Exception("Unexpected API response format")
                
            target_names = {"ondo finance", "maple", "centrifuge", "goldfinch", "clearpool"}
            protocols_list = []
            total_tvl_usd = 0.0
            
            for proto in data:
                if not isinstance(proto, dict):
                    continue
                category = proto.get("category") or ""
                name = proto.get("name") or ""
                
                is_rwa = False
                if str(category).strip().lower() == "rwa":
                    is_rwa = True
                elif str(name).strip().lower() in target_names:
                    is_rwa = True
                    
                if is_rwa:
                    tvl = sum_chain_tvls(proto)
                    chain = proto.get("chain") or "Multi-Chain"
                    protocols_list.append({
                        "name": name,
                        "chain": chain,
                        "tvl": tvl,
                        "category": category
                    })
                    total_tvl_usd += tvl
            
            result = {
                "total_tvl_usd": total_tvl_usd,
                "protocols": protocols_list
            }
            
            timestamp = datetime.utcnow().isoformat() + "Z"
            cache_db["tvl"] = {
                "data": result,
                "expires_at": now + CACHE_EXPIRATION_SECONDS,
                "last_updated": timestamp
            }
            return result
            
    except Exception as e:
        last_updated = cached["last_updated"] or (datetime.utcnow().isoformat() + "Z")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Data source down",
                "lastUpdated": last_updated
            }
        )

@app.get("/api/yields")
async def get_yields():
    now = time.time()
    cached = cache_db["yields"]
    
    if cached["data"] is not None and now < cached["expires_at"]:
        return cached["data"]
        
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await fetch_with_retries(client, "GET", "https://yields.llama.fi/pools")
            if response.status_code != 200:
                raise Exception(f"HTTP Error {response.status_code}")
                
            data = response.json()
            if not isinstance(data, dict) or "data" not in data:
                raise Exception("Unexpected Pools API format")
                
            pools_data = data["data"]
            rwa_pools = []
            
            for pool in pools_data:
                if not isinstance(pool, dict):
                    continue
                project = pool.get("project") or ""
                category = pool.get("category") or ""
                
                is_rwa = False
                if str(category).strip().lower() == "rwa":
                    is_rwa = True
                elif str(project).strip().lower() in RWA_PROJECTS:
                    is_rwa = True
                    
                if is_rwa:
                    rwa_pools.append({
                        "pool": pool.get("pool"),
                        "project": pool.get("project"),
                        "chain": pool.get("chain"),
                        "tvlUsd": pool.get("tvlUsd"),
                        "apy": pool.get("apy"),
                        "symbol": pool.get("symbol")
                    })
            
            rwa_pools.sort(key=lambda x: x.get("tvlUsd") or 0.0, reverse=True)
            top_20 = rwa_pools[:20]
            
            timestamp = datetime.utcnow().isoformat() + "Z"
            cache_db["yields"] = {
                "data": top_20,
                "expires_at": now + CACHE_EXPIRATION_SECONDS,
                "last_updated": timestamp
            }
            return top_20
            
    except Exception as e:
        last_updated = cached["last_updated"] or (datetime.utcnow().isoformat() + "Z")
        return JSONResponse(
            status_code=503,
            content={
                "error": "Data source down",
                "lastUpdated": last_updated
            }
        )

def get_alchemy_rpc_url(chain_id: int) -> str:
    env_name = f"ALCHEMY_RPC_URL_{chain_id}"
    url = os.getenv(env_name)
    if url:
        return url
    
    name_map = {
        1: "ETH",
        137: "POLYGON",
        42161: "ARBITRUM",
        8453: "BASE",
        56: "BSC",
        10: "OPTIMISM"
    }
    if chain_id in name_map:
        url = os.getenv(f"ALCHEMY_RPC_URL_{name_map[chain_id]}")
        if url:
            return url
            
    generic_url = os.getenv("ALCHEMY_RPC_URL")
    if generic_url:
        return generic_url
        
    defaults = {
        1: "https://eth.llamarpc.com",
        56: "https://binance.llamarpc.com",
        137: "https://polygon.llamarpc.com",
        10: "https://optimism.llamarpc.com",
        42161: "https://arbitrum.llamarpc.com",
        8453: "https://base.llamarpc.com"
    }
    return defaults.get(chain_id, "https://eth.llamarpc.com")

@app.post("/api/execute")
async def execute(
    payload: ExecuteRequest,
    x_api_key: str = Header(None, alias="x-api-key")
):
    # Resolve and validate chain support
    chain_input = str(payload.chain).strip().lower()
    if chain_input not in CHAIN_MAP:
        error_msg = f"Chain '{payload.chain}' not supported. Supported: {', '.join(sorted(set(CHAIN_MAP.keys())))}"
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 400)
        raise HTTPException(status_code=400, detail=error_msg)
        
    chain_id = CHAIN_MAP[chain_input]

    # Initialize web3 for address validation
    rpc_url = get_alchemy_rpc_url(chain_id)
    w3 = Web3(Web3.HTTPProvider(rpc_url))

    # Validate addresses using Web3.py
    try:
        from_checksum = Web3.to_checksum_address(payload.fromToken)
    except ValueError:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 400)
        raise HTTPException(status_code=400, detail=f"Invalid fromToken address: '{payload.fromToken}'")

    try:
        to_checksum = Web3.to_checksum_address(payload.toToken)
    except ValueError:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 400)
        raise HTTPException(status_code=400, detail=f"Invalid toToken address: '{payload.toToken}'")

    try:
        wallet_checksum = Web3.to_checksum_address(payload.walletAddress)
    except ValueError:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 400)
        raise HTTPException(status_code=400, detail=f"Invalid walletAddress: '{payload.walletAddress}'")

    # Prepare 1inch v6 swap API request
    oneinch_key = os.getenv("ONEINCH_API_KEY")
    if not oneinch_key:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 500)
        raise HTTPException(
            status_code=500, 
            detail="ONEINCH_API_KEY is not configured in environment variables."
        )

    url = f"https://api.1inch.dev/swap/v6.0/{chain_id}/swap"
    params = {
        "src": from_checksum,
        "dst": to_checksum,
        "amount": payload.amount,
        "from": wallet_checksum,
        "slippage": payload.slippage,
        "disableEstimate": "true",
        "includeTokensInfo": "true"
    }

    headers = {
        "Authorization": f"Bearer {oneinch_key}",
        "Accept": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await fetch_with_retries(client, "GET", url, params=params, headers=headers)
            
            if response.status_code != 200:
                err_data = {}
                try:
                    err_data = response.json()
                except Exception:
                    pass
                
                error_desc = err_data.get("description") or err_data.get("message") or f"HTTP status {response.status_code}"
                
                # Check for insufficient liquidity
                if "insufficient liquidity" in error_desc.lower() or "liquidity" in error_desc.lower():
                    log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 400)
                    raise HTTPException(
                        status_code=400,
                        detail=f"Insufficient liquidity for this swap path on 1inch: {error_desc}"
                    )
                
                log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, response.status_code)
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"1inch swap routing failed: {error_desc}"
                )

            swap_data = response.json()
            
            log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 200)
            
            return {
                "success": True,
                "chain_id": chain_id,
                "rpc_url": rpc_url,
                "from_token": swap_data.get("fromToken", {}).get("symbol") or payload.fromToken,
                "to_token": swap_data.get("toToken", {}).get("symbol") or payload.toToken,
                "from_amount": payload.amount,
                "to_amount": swap_data.get("toAmount"),
                "transaction_data": {
                    "from": swap_data.get("tx", {}).get("from"),
                    "to": swap_data.get("tx", {}).get("to"),
                    "data": swap_data.get("tx", {}).get("data"),
                    "value": swap_data.get("tx", {}).get("value"),
                    "gas": swap_data.get("tx", {}).get("gas"),
                    "gasPrice": swap_data.get("tx", {}).get("gasPrice")
                }
            }

    except httpx.ConnectError:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 503)
        raise HTTPException(status_code=503, detail="Failed to connect to 1inch API service.")
    except httpx.TimeoutException:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 504)
        raise HTTPException(status_code=504, detail="1inch API request timed out.")
    except HTTPException:
        raise
    except Exception as e:
        log_api_call(x_api_key or "anonymous", "/api/execute", payload.fromToken, payload.toToken, payload.amount, 500)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/health")
async def health():
    defillama_status = "up"
    oneinch_status = "up"
    
    # Check DefiLlama Protocols
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await fetch_with_retries(client, "GET", "https://api.llama.fi/protocols")
            if resp.status_code != 200:
                defillama_status = "down"
    except Exception:
        defillama_status = "down"
        
    # Check 1inch swap liquidity-sources probe
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            oneinch_key = os.getenv("ONEINCH_API_KEY")
            headers = {}
            if oneinch_key:
                headers["Authorization"] = f"Bearer {oneinch_key}"
            
            resp = await fetch_with_retries(client, "GET", "https://api.1inch.dev/swap/v6.0/1/liquidity-sources", headers=headers)
            if resp.status_code not in [200, 401, 403]:
                oneinch_status = "down"
    except Exception:
        oneinch_status = "down"
        
    return {
        "status": "ok",
        "defillama": defillama_status,
        "1inch": oneinch_status
    }
