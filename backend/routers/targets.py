from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db, Target
from datetime import datetime, timezone

router = APIRouter()

class TargetCreate(BaseModel):
    name: str
    ip: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    type: str = "host"

class TargetUpdate(BaseModel):
    name: Optional[str] = None
    ip: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None

def serialize(t: Target):
    return {
        "id": t.id,
        "name": t.name,
        "ip": t.ip,
        "domain": t.domain,
        "description": t.description,
        "type": t.type,
        "status": t.status,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }

@router.get("")
async def list_targets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Target).order_by(Target.created_at.desc()))
    return [serialize(t) for t in result.scalars().all()]

@router.get("/{target_id}")
async def get_target(target_id: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(Target, target_id)
    if not t:
        raise HTTPException(status_code=404, detail="Target not found")
    return serialize(t)

@router.post("")
async def create_target(data: TargetCreate, db: AsyncSession = Depends(get_db)):
    t = Target(**data.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return serialize(t)

@router.put("/{target_id}")
async def update_target(target_id: int, data: TargetUpdate, db: AsyncSession = Depends(get_db)):
    t = await db.get(Target, target_id)
    if not t:
        raise HTTPException(status_code=404, detail="Target not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    t.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(t)
    return serialize(t)

@router.delete("/{target_id}")
async def delete_target(target_id: int, db: AsyncSession = Depends(get_db)):
    t = await db.get(Target, target_id)
    if not t:
        raise HTTPException(status_code=404, detail="Target not found")
    await db.delete(t)
    await db.commit()
    return {"ok": True}
