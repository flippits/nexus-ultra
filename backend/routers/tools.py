import asyncio
import subprocess
import shutil
import shlex
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Dict
from database import get_db, Scan
import docker_manager as dm

router = APIRouter()

# Wordlist paths relative to the repo root (two levels up from this file)
WL_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'wordlists')
ROCKYOU = os.path.join(WL_BASE, "rockyou.txt")
COMMON = os.path.join(WL_BASE, "common.txt")
DIRS = os.path.join(WL_BASE, "directories.txt")
USERS = os.path.join(WL_BASE, "usernames.txt")
SUBDOMAINS = os.path.join(WL_BASE, "subdomains.txt")

class ToolRun(BaseModel):
    tool: str
    params: Dict[str, str] = {}
    target_id: Optional[int] = None
    scan_id: Optional[str] = None
    use_docker: bool = False   # when True, run inside Kali container

def build_command(tool: str, params: dict) -> list[str]:
    t = params.get
    commands = {
        "nmap": ["nmap"] + (t("flags") or "-sV -sC -T4").split() + [t("target") or ""],
        "masscan": ["masscan", t("target") or "", "-p", t("ports") or "0-65535", "--rate", t("rate") or "1000"],
        "nikto": ["nikto", "-h", t("target") or t("url") or ""],
        "gobuster": ["gobuster", "dir", "-u", t("url") or "", "-w", t("wordlist") or DIRS, "-t", t("threads") or "50"],
        "ffuf": ["ffuf", "-u", t("url") or "", "-w", t("wordlist") or COMMON],
        "hydra": ["hydra", "-l", t("userlist") or "admin", "-P", t("passlist") or ROCKYOU, t("target") or "", t("service") or "ssh"],
        "theharvester": ["theHarvester", "-d", t("domain") or "", "-b", t("source") or "google,bing"],
        "sherlock": ["sherlock", t("username") or ""],
        "whatweb": ["whatweb", t("url") or ""],
        "searchsploit": ["searchsploit", "--json", t("query") or ""],
        "hashcat": ["hashcat", "-m", t("mode") or "0", t("hash") or "", t("wordlist") or "/usr/share/wordlists/rockyou.txt"],
        "john": ["john", "--wordlist=" + (t("wordlist") or "/usr/share/wordlists/rockyou.txt"), t("hashfile") or ""],
        "metasploit": ["msfconsole", "-q", "-x", t("command") or ""],
    }
    return commands.get(tool, [tool])

def tool_available(name: str) -> bool:
    aliases = {"theharvester": "theHarvester"}
    return shutil.which(aliases.get(name, name)) is not None

@router.post("/run")
async def run_tool(data: ToolRun, db: AsyncSession = Depends(get_db)):
    cmd = build_command(data.tool, data.params)
    if not cmd or not cmd[0]:
        raise HTTPException(status_code=400, detail="Invalid tool or missing parameters")

    scan = Scan(
        target_id=data.target_id,
        tool=data.tool,
        command=" ".join(cmd),
        output="",
        status="running",
        scan_id=data.scan_id,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # ── Docker mode: run inside Kali container ──────────────────────────────
    if data.use_docker:
        container_status = await dm.get_container_status()
        if not container_status.get("running"):
            output = "[NEXUS-DOCKER] Kali container is not running.\n[NEXUS-DOCKER] Start it from the Docker panel first."
            scan.output = output
            scan.status = "error"
            await db.commit()
            return {"output": output, "status": "error", "scan_id": data.scan_id, "mode": "docker"}

        # Remap host paths to container paths, then quote each arg to prevent injection
        _home = os.path.expanduser("~")
        def _remap(arg: str) -> str:
            return arg.replace(str(WL_BASE), "/nexus/data/wordlists").replace(_home, "/root")
        shell_cmd = " ".join(shlex.quote(_remap(str(c))) for c in cmd)
        output = await dm.exec_in_container(shell_cmd, timeout=300)
        scan.output = output
        scan.status = "completed"
        await db.commit()
        return {"output": output, "status": "completed", "scan_id": data.scan_id, "mode": "docker"}

    # ── Native mode: run on host ────────────────────────────────────────────
    if not tool_available(data.tool):
        output = (
            f"[NEXUS] '{data.tool}' not found on macOS.\n"
            f"[NEXUS] 💡 Switch to Docker mode to run this in Kali Linux.\n"
            f"[NEXUS] Command: {' '.join(cmd)}"
        )
        scan.output = output
        scan.status = "error"
        await db.commit()
        return {"output": output, "status": "error", "scan_id": data.scan_id, "mode": "native"}

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=300)
        output = stdout.decode(errors="replace")
        if len(output) > 102400:
            output = output[:102400] + "\n\n[... truncated — output exceeded 100 KB ...]"
        scan.output = output
        scan.status = "completed"
    except asyncio.TimeoutError:
        try:
            proc.kill()
            await proc.wait()
        except Exception:
            pass
        output = "[NEXUS] Tool timed out after 5 minutes"
        scan.output = output
        scan.status = "timeout"
    except Exception as e:
        output = f"[NEXUS] Error running tool: {e}"
        scan.output = output
        scan.status = "error"

    await db.commit()
    return {"output": output, "status": scan.status, "scan_id": data.scan_id, "mode": "native"}

@router.get("/count")
async def get_scan_count(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    result = await db.execute(select(func.count(Scan.id)))
    return {"count": result.scalar() or 0}

@router.get("/scans/{target_id}")
async def get_scans(target_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Scan).where(Scan.target_id == target_id).order_by(Scan.created_at.desc()).limit(50)
    )
    scans = result.scalars().all()
    return [{"id": s.id, "tool": s.tool, "command": s.command, "status": s.status, "scan_id": s.scan_id, "created_at": s.created_at.isoformat()} for s in scans]

@router.get("/scan/{scan_id}")
async def get_scan_output(scan_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Scan).where(Scan.scan_id == scan_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"output": s.output, "status": s.status}
