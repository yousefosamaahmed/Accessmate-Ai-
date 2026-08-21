from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.daily_need_action import DailyNeedAction
from app.schemas.daily_need_action import DailyNeedActionOut


router = APIRouter(prefix="/daily-need-actions", tags=["Daily Need Actions"])


@router.get("", response_model=list[DailyNeedActionOut])
def get_daily_need_actions(
    category: Optional[str] = Query(default=None),
    risk_level: Optional[str] = Query(default=None),
    active_only: bool = Query(default=True),
    db: Session = Depends(get_db),
):
    query = db.query(DailyNeedAction)

    if active_only:
        query = query.filter(DailyNeedAction.is_active.is_(True))

    if category:
        query = query.filter(DailyNeedAction.category == category)

    if risk_level:
        query = query.filter(DailyNeedAction.risk_level == risk_level)

    return query.order_by(
        DailyNeedAction.category.asc(),
        DailyNeedAction.risk_level.asc(),
        DailyNeedAction.name_en.asc(),
    ).all()


@router.get("/{code}", response_model=DailyNeedActionOut)
def get_daily_need_action_by_code(
    code: str,
    db: Session = Depends(get_db),
):
    action = (
        db.query(DailyNeedAction)
        .filter(DailyNeedAction.code == code)
        .filter(DailyNeedAction.is_active.is_(True))
        .first()
    )

    if not action:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Daily need action not found")

    return action