import json
from mcp.server.fastmcp import FastMCP
from database import SessionLocal, Target, Finding, Scan, Report
from sqlalchemy import select

mcp = FastMCP(
    "NEXUS ULTRA",
    instructions=(
        "You are connected to NEXUS ULTRA, an AI-powered cybersecurity platform running locally. "
        "You can read and write engagement targets, vulnerability findings, scan history, and reports. "
        "All data is stored locally — never sent to external services."
    ),
)


def _target_dict(t: Target) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "ip": t.ip,
        "domain": t.domain,
        "type": t.type,
        "status": t.status,
        "description": t.description,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@mcp.tool()
async def list_targets() -> str:
    """List all engagement targets tracked in NEXUS ULTRA."""
    async with SessionLocal() as db:
        result = await db.execute(select(Target).order_by(Target.created_at.desc()))
        targets = result.scalars().all()
        return json.dumps([_target_dict(t) for t in targets], indent=2)


@mcp.tool()
async def get_target(target_id: int) -> str:
    """Get full details for a specific target by its ID."""
    async with SessionLocal() as db:
        t = await db.get(Target, target_id)
        if not t:
            return json.dumps({"error": f"Target {target_id} not found"})
        return json.dumps(_target_dict(t), indent=2)


@mcp.tool()
async def list_findings(target_id: int | None = None, severity: str | None = None) -> str:
    """List vulnerability findings. Optionally filter by target_id and/or severity (critical/high/medium/low/info)."""
    async with SessionLocal() as db:
        q = select(Finding)
        if target_id is not None:
            q = q.where(Finding.target_id == target_id)
        if severity:
            q = q.where(Finding.severity == severity.lower())
        q = q.order_by(Finding.created_at.desc())
        result = await db.execute(q)
        findings = result.scalars().all()
        return json.dumps([{
            "id": f.id,
            "target_id": f.target_id,
            "title": f.title,
            "severity": f.severity,
            "description": f.description,
            "evidence": f.evidence,
            "cve": f.cve,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        } for f in findings], indent=2)


@mcp.tool()
async def add_finding(
    target_id: int,
    title: str,
    severity: str,
    description: str = "",
    evidence: str = "",
    cve: str = "",
) -> str:
    """Add a vulnerability finding to a target. severity must be: critical, high, medium, low, or info."""
    valid = {"critical", "high", "medium", "low", "info"}
    if severity.lower() not in valid:
        return json.dumps({"error": f"severity must be one of {sorted(valid)}"})
    async with SessionLocal() as db:
        f = Finding(
            target_id=target_id,
            title=title,
            severity=severity.lower(),
            description=description or None,
            evidence=evidence or None,
            cve=cve or None,
        )
        db.add(f)
        await db.commit()
        await db.refresh(f)
        return json.dumps({"ok": True, "id": f.id, "message": f"Finding '{title}' added with severity '{severity}'"})


@mcp.tool()
async def list_scans(target_id: int) -> str:
    """List all scans performed against a target, including tool output previews."""
    async with SessionLocal() as db:
        result = await db.execute(
            select(Scan).where(Scan.target_id == target_id).order_by(Scan.created_at.desc())
        )
        scans = result.scalars().all()
        return json.dumps([{
            "id": s.id,
            "tool": s.tool,
            "command": s.command,
            "status": s.status,
            "output_preview": (s.output or "")[:500],
            "created_at": s.created_at.isoformat() if s.created_at else None,
        } for s in scans], indent=2)


@mcp.tool()
async def get_report(target_id: int) -> str:
    """Get the AI-generated penetration testing report for a target."""
    async with SessionLocal() as db:
        result = await db.execute(select(Report).where(Report.target_id == target_id))
        rep = result.scalar_one_or_none()
        if not rep:
            return json.dumps({"error": "No report found. Generate one in the NEXUS ULTRA Reports page first."})
        return json.dumps({
            "target_id": rep.target_id,
            "content": rep.content,
            "created_at": rep.created_at.isoformat() if rep.created_at else None,
        }, indent=2)
