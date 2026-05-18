"""
NEXUS ULTRA — Docker/Kali execution engine.
Routes tool commands into the nexus-kali container when Docker mode is active.
"""
import asyncio
import os
import json
from pathlib import Path

CONTAINER = "nexus-kali"
DOCKER_BIN = os.path.expanduser("~/.orbstack/bin/docker")  # OrbStack path
COMPOSE_FILE = os.path.join(os.path.dirname(__file__), '..', 'docker', 'docker-compose.yml')


def _docker() -> str:
    """Return path to docker binary."""
    candidates = [
        DOCKER_BIN,
        "/usr/local/bin/docker",
        "/usr/bin/docker",
        "/opt/homebrew/bin/docker",
    ]
    for c in candidates:
        if os.path.isfile(c):
            return c
    return "docker"


async def _run(cmd: list[str], timeout: int = 30) -> tuple[int, str]:
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            env={**os.environ, "PATH": os.environ.get("PATH", "") + ":" + os.path.expanduser("~/.orbstack/bin")}
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        return proc.returncode, stdout.decode(errors="replace")
    except asyncio.TimeoutError:
        try:
            proc.kill()
            await proc.wait()
        except Exception:
            pass
        return 1, "Timeout"
    except Exception as e:
        return 1, str(e)


async def _ensure_orbstack() -> None:
    """Launch OrbStack if it's installed but not running."""
    orbstack_app = "/Applications/OrbStack.app"
    sock = os.path.expanduser("~/.orbstack/run/docker.sock")
    if not os.path.exists(orbstack_app) or os.path.exists(sock):
        return
    try:
        await asyncio.create_subprocess_exec(
            "open", "-a", "OrbStack",
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        # Wait up to 15 s for the socket to appear
        for _ in range(30):
            await asyncio.sleep(0.5)
            if os.path.exists(sock):
                await asyncio.sleep(1)  # let daemon fully init
                return
    except Exception:
        pass


async def is_docker_available() -> bool:
    await _ensure_orbstack()
    code, _ = await _run([_docker(), "info"])
    return code == 0


async def get_container_status() -> dict:
    code, out = await _run([_docker(), "inspect", CONTAINER, "--format",
                            "{{.State.Status}}|{{.State.StartedAt}}|{{.Id}}"])
    if code != 0:
        return {"status": "not_found", "running": False}
    parts = out.strip().split("|")
    status = parts[0] if parts else "unknown"
    return {
        "status": status,
        "running": status == "running",
        "started_at": parts[1] if len(parts) > 1 else None,
        "id": parts[2][:12] if len(parts) > 2 else None,
    }


async def start_container() -> dict:
    """Build image if needed, then start container."""
    # Check if image exists
    code, _ = await _run([_docker(), "image", "inspect", "nexus-kali:latest"])
    if code != 0:
        # Need to build
        return {"status": "needs_build", "message": "Image not built yet. Use /docker/build first."}

    # Start with docker compose
    code, out = await _run(
        [_docker(), "compose", "-f", COMPOSE_FILE, "up", "-d"],
        timeout=60
    )
    if code != 0:
        # Try plain docker start
        code2, out2 = await _run([_docker(), "start", CONTAINER])
        if code2 != 0:
            return {"status": "error", "message": out + out2}

    status = await get_container_status()
    return {"status": "started", **status}


async def stop_container() -> dict:
    code, out = await _run([_docker(), "stop", CONTAINER])
    return {"status": "stopped" if code == 0 else "error", "message": out.strip()}


async def build_image(progress_callback=None) -> dict:
    """Build the Kali Docker image."""
    docker_dir = os.path.join(os.path.dirname(__file__), '..', 'docker')
    cmd = [_docker(), "build", "-t", "nexus-kali:latest", docker_dir]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        output_lines = []
        async for line in proc.stdout:
            decoded = line.decode(errors="replace").strip()
            output_lines.append(decoded)
            if progress_callback:
                await progress_callback(decoded)

        await proc.wait()
        success = proc.returncode == 0
        return {
            "status": "success" if success else "error",
            "output": "\n".join(output_lines[-20:]),
            "return_code": proc.returncode
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


async def exec_in_container(command: str, timeout: int = 300) -> str:
    """Run a shell command inside the Kali container."""
    status = await get_container_status()
    if not status["running"]:
        return f"[NEXUS] Container is not running. Start it from the Docker panel first."

    cmd = [_docker(), "exec", "-i", CONTAINER, "bash", "-c", command]
    code, output = await _run(cmd, timeout=timeout)
    return output


async def exec_streaming(command: str):
    """Generator that yields output lines from a command in the container."""
    status = await get_container_status()
    if not status["running"]:
        yield "[NEXUS] Container not running.\n"
        return

    cmd = [_docker(), "exec", "-i", CONTAINER, "bash", "-c", command]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        async for line in proc.stdout:
            yield line.decode(errors="replace")
        await proc.wait()
    except Exception as e:
        yield f"[ERROR] {e}\n"


async def get_container_stats() -> dict:
    """Get CPU/memory stats for the container."""
    code, out = await _run([
        _docker(), "stats", CONTAINER,
        "--no-stream", "--format",
        "{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}|{{.NetIO}}"
    ])
    if code != 0:
        return {}
    parts = out.strip().split("|")
    return {
        "cpu": parts[0] if len(parts) > 0 else "0%",
        "mem_usage": parts[1] if len(parts) > 1 else "0B",
        "mem_perc": parts[2] if len(parts) > 2 else "0%",
        "net_io": parts[3] if len(parts) > 3 else "0B",
    }


async def list_installed_tools() -> list[str]:
    """Get list of installed security tools in the container."""
    tools = [
        "nmap", "msfconsole", "gobuster", "ffuf", "sqlmap",
        "hydra", "hashcat", "john", "nikto", "aircrack-ng",
        "metasploit-framework", "searchsploit", "subfinder",
        "theHarvester", "enum4linux", "smbmap", "crackmapexec",
        "radare2", "gdb", "binwalk", "foremost", "steghide",
        "tcpdump", "socat", "chisel", "evil-winrm",
        "nuclei", "httpx", "proxychains4"
    ]
    available = []
    for tool in tools:
        code, _ = await _run([
            _docker(), "exec", CONTAINER, "which", tool
        ])
        if code == 0:
            available.append(tool)
    return available
