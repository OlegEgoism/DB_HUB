# backend/api/v1/db_users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_user_service import DBUserService
from backend.schemas.db_user_schemas import DBUsersResponse

router = APIRouter(prefix="/db_users", tags=["DB USERS"])


@router.get("/connection/{connection_id}", response_model=DBUsersResponse)
async def get_users_by_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    try:
        service = DBUserService(db)
        result = await service.get_users_with_sync(connection_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при синхронизации или получении пользователей: {str(e)}")
