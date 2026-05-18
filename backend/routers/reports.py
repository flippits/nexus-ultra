import json
import asyncio
import ollama
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, SessionLocal, Target, Finding, Scan, Report

router = APIRouter()

REPORT_PROMPT = """You are an elite penetration testing report writer. Write a comprehensive, professional penetration testing report based on the provided target information and findings.

Structure the report as follows:
1. **Executive Summary** - High-level overview for management
2. **Scope & Methodology** - What was tested and how
3. **Risk Summary** - Table of findings by severity
4. **Findings** - Detailed analysis of each vulnerability (with CVSS score, description, evidence, remediation)
5. **Attack Chain** - How findings connect (if applicable)
6. **Remediation Roadmap** - Prioritized fix list
7. **Appendix** - Technical details, raw output

Be technical, specific, and professional. Include CVSS scores where applicable."""


async def _build_report_context(target_id: int, db: AsyncSession) -> tuple[str, str]:
    t = await db.get(Target, target_id)
    if not t:
        raise HTTPException(status_code=404, detail="Target not found")

    findings_res = await db.execute(
        select(Finding).where(Finding.target_id == target_id).order_by(Finding.created_at)
    )
    findings = findings_res.scalars().all()

    scans_res = await db.execute(
        select(Scan).where(Scan.target_id == target_id).order_by(Scan.created_at)
    )
    scans = scans_res.scalars().all()

    context = f"""TARGET INFORMATION:
- Name: {t.name}
- IP: {t.ip or 'N/A'}
- Domain: {t.domain or 'N/A'}
- Type: {t.type}
- Description: {t.description or 'N/A'}

FINDINGS ({len(findings)} total):
"""
    sev_order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    for f in sorted(findings, key=lambda f: sev_order.get(f.severity, 5)):
        context += f"\n### [{f.severity.upper()}] {f.title}\n"
        if f.cve:
            context += f"CVE: {f.cve}\n"
        if f.description:
            context += f"Description: {f.description}\n"
        if f.evidence:
            context += f"Evidence:\n```\n{f.evidence[:500]}\n```\n"

    context += f"\nSCANS PERFORMED ({len(scans)} total):\n"
    for s in scans[:10]:
        context += f"- {s.tool}: {s.command} [{s.status}]\n"

    return context, t.name


@router.post("/generate/{target_id}/stream")
async def generate_report_stream(target_id: int, db: AsyncSession = Depends(get_db)):
    context, target_name = await _build_report_context(target_id, db)

    # Detect fastest quality model
    from routers.ai import get_fastest_model
    model = await get_fastest_model()

    messages = [
        {"role": "system", "content": REPORT_PROMPT},
        {"role": "user", "content": f"Write a pentest report for:\n\n{context}"}
    ]

    async def generate():
        full_content = []
        try:
            client = ollama.AsyncClient()
            stream = await client.chat(model=model, messages=messages, stream=True)
            async for chunk in stream:
                token = chunk.message.content
                if token:
                    full_content.append(token)
                    yield f"data: {json.dumps({'token': token})}\n\n"

            # Save to DB with a fresh session
            content = "".join(full_content)
            async with SessionLocal() as save_db:
                existing = await save_db.execute(select(Report).where(Report.target_id == target_id))
                rep = existing.scalar_one_or_none()
                if rep:
                    rep.content = content
                else:
                    rep = Report(target_id=target_id, content=content)
                    save_db.add(rep)
                await save_db.commit()

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.post("/generate/{target_id}")
async def generate_report(target_id: int, db: AsyncSession = Depends(get_db)):
    context, target_name = await _build_report_context(target_id, db)

    from routers.ai import get_fastest_model
    model = await get_fastest_model()

    try:
        client = ollama.AsyncClient()
        response = await client.chat(
            model=model,
            messages=[
                {"role": "system", "content": REPORT_PROMPT},
                {"role": "user", "content": f"Write a pentest report for:\n\n{context}"}
            ]
        )
        content = response.message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI report generation failed: {e}")

    existing = await db.execute(select(Report).where(Report.target_id == target_id))
    rep = existing.scalar_one_or_none()
    if rep:
        rep.content = content
    else:
        rep = Report(target_id=target_id, content=content)
        db.add(rep)
    await db.commit()

    return {"content": content, "target": target_name}


@router.get("/{target_id}")
async def get_report(target_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.target_id == target_id))
    rep = result.scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=404, detail="No report found for this target")
    return {"content": rep.content, "created_at": rep.created_at.isoformat()}


@router.delete("/{target_id}")
async def delete_report(target_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.target_id == target_id))
    rep = result.scalar_one_or_none()
    if not rep:
        raise HTTPException(status_code=404, detail="No report found")
    await db.delete(rep)
    await db.commit()
    return {"ok": True}
