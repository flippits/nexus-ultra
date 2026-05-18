import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import docker_manager as dm

router = APIRouter()

class ExecRequest(BaseModel):
    command: str
    timeout: int = 300

class BuildRequest(BaseModel):
    force: bool = False


@router.get("/status")
async def docker_status():
    available = await dm.is_docker_available()
    if not available:
        return {
            "docker_available": False,
            "container": {"status": "unavailable", "running": False},
            "stats": {}
        }
    container = await dm.get_container_status()
    stats = {}
    if container.get("running"):
        stats = await dm.get_container_stats()
    return {
        "docker_available": True,
        "container": container,
        "stats": stats
    }


@router.post("/start")
async def start_container():
    available = await dm.is_docker_available()
    if not available:
        raise HTTPException(status_code=503, detail="Docker not available")
    result = await dm.start_container()
    return result


@router.post("/stop")
async def stop_container():
    result = await dm.stop_container()
    return result


@router.post("/build")
async def build_image():
    available = await dm.is_docker_available()
    if not available:
        raise HTTPException(status_code=503, detail="Docker not available")

    lines = []
    async def collect(line):
        lines.append(line)

    result = await dm.build_image(progress_callback=collect)
    result["lines"] = len(lines)
    return result


@router.get("/build/stream")
async def build_image_stream():
    """Stream build output in real-time."""
    available = await dm.is_docker_available()
    if not available:
        raise HTTPException(status_code=503, detail="Docker not available")

    import os
    docker_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'docker')
    docker_bin = dm._docker()

    async def generate():
        proc = await asyncio.create_subprocess_exec(
            docker_bin, "build", "-t", "nexus-kali:latest", docker_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        async for line in proc.stdout:
            yield line.decode(errors="replace")
        await proc.wait()
        yield f"\n[NEXUS] Build completed with exit code {proc.returncode}\n"

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/exec")
async def exec_command(req: ExecRequest):
    output = await dm.exec_in_container(req.command, timeout=req.timeout)
    return {"output": output, "command": req.command}


@router.get("/exec/stream")
async def exec_stream(command: str):
    """Stream command output from container."""
    async def generate():
        async for line in dm.exec_streaming(command):
            yield line
    return StreamingResponse(generate(), media_type="text/plain")


@router.get("/tools")
async def list_tools():
    status = await dm.get_container_status()
    if not status.get("running"):
        raise HTTPException(status_code=503, detail="Container not running")
    tools = await dm.list_installed_tools()
    return {"tools": tools, "count": len(tools)}


@router.get("/image/exists")
async def image_exists():
    available = await dm.is_docker_available()
    if not available:
        return {"exists": False, "docker_available": False}
    code, out = await dm._run([dm._docker(), "image", "inspect", "nexus-kali:latest"])
    return {"exists": code == 0, "docker_available": True}
