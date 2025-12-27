# backend/api/v1/db_users.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.services.db_user_service import DBUserService
from backend.schemas.db_user_schemas import DBUsersResponse, DBUserCreateRequest

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



@router.post("/connection/{connection_id}", response_model=dict)
async def create_db_user(
    connection_id: int,
    user_data: DBUserCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        service = DBUserService(db)
        result = await service.create_user_in_external_db(
            connection_id=connection_id,
            username=user_data.username,
            password=user_data.password,
            description=user_data.description,
            email=user_data.email,
            rolsuper=user_data.rolsuper,
            rolinherit=user_data.rolinherit,
            rolcreaterole=user_data.rolcreaterole,
            rolcreatedb=user_data.rolcreatedb,
            rolcanlogin=user_data.rolcanlogin,
            rolreplication=user_data.rolreplication,
            rolconnlimit=user_data.rolconnlimit,
            rolvaliduntil=user_data.rolvaliduntil
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при создании пользователя: {str(e)}"
        )