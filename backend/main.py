import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from database import init_db, engine
from sqlalchemy import text
from routers import targets, graph, findings, tools, ai, osint, reports
from routers import docker_router, flipper, network
from routers.mcp_router import mcp

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="NEXUS ULTRA", version="1.0.0", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "app://.", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(targets.router, prefix="/targets", tags=["targets"])
app.include_router(graph.router, prefix="/graph", tags=["graph"])
app.include_router(findings.router, prefix="/findings", tags=["findings"])
app.include_router(tools.router, prefix="/tools", tags=["tools"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(osint.router, prefix="/osint", tags=["osint"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
app.include_router(docker_router.router, prefix="/docker", tags=["docker"])
app.include_router(flipper.router, prefix="/flipper", tags=["flipper"])
app.include_router(network.router, prefix="/network", tags=["network"])

# MCP server — Claude Code connects to http://localhost:8765/mcp
app.mount("/mcp", mcp.streamable_http_app())

@app.get("/health")
async def health():
    db_ok = False
    ollama_ok = False
    installed_models = []

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        import ollama as _ollama
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(None, _ollama.list)
        installed_models = [m.model for m in result.models]
        ollama_ok = True
    except Exception:
        pass

    return {
        "status": "online" if db_ok else "degraded",
        "version": "1.0.0",
        "name": "NEXUS ULTRA",
        "db": db_ok,
        "ollama": ollama_ok,
        "models": installed_models,
    }
