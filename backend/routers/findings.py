from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional
from database import get_db, Finding, Target

router = APIRouter()

class FindingCreate(BaseModel):
    title: str
    severity: str = "medium"
    description: Optional[str] = None
    evidence: Optional[str] = None
    cve: Optional[str] = None
    target_id: Optional[int] = None

class FindingUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    evidence: Optional[str] = None
    cve: Optional[str] = None

def serialize(f: Finding, target_name=None):
    return {
        "id": f.id,
        "target_id": f.target_id,
        "target_name": target_name or (f.target.name if f.target else None),
        "title": f.title,
        "severity": f.severity,
        "description": f.description,
        "evidence": f.evidence,
        "cve": f.cve,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }

@router.get("")
async def list_findings(target_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    q = select(Finding).options(selectinload(Finding.target)).order_by(Finding.created_at.desc())
    if target_id:
        q = q.where(Finding.target_id == target_id)
    result = await db.execute(q)
    findings = result.scalars().all()
    return [serialize(f) for f in findings]

@router.get("/{target_id}")
async def get_findings_for_target(target_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Finding).options(selectinload(Finding.target))
        .where(Finding.target_id == target_id)
        .order_by(Finding.created_at.desc())
    )
    return [serialize(f) for f in result.scalars().all()]

@router.post("")
async def create_finding(data: FindingCreate, db: AsyncSession = Depends(get_db)):
    f = Finding(**data.model_dump())
    db.add(f)
    await db.commit()
    await db.refresh(f)
    target_name = None
    if f.target_id:
        t = await db.get(Target, f.target_id)
        target_name = t.name if t else None
    return serialize(f, target_name)

@router.put("/{finding_id}")
async def update_finding(finding_id: int, data: FindingUpdate, db: AsyncSession = Depends(get_db)):
    f = await db.get(Finding, finding_id)
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(f, k, v)
    await db.commit()
    await db.refresh(f)
    return serialize(f, target_name=None)

@router.delete("/{finding_id}")
async def delete_finding(finding_id: int, db: AsyncSession = Depends(get_db)):
    f = await db.get(Finding, finding_id)
    if not f:
        raise HTTPException(status_code=404, detail="Finding not found")
    await db.delete(f)
    await db.commit()
    return {"ok": True}
