# backend/api/v1/db_users.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.session import get_db
from backend.models import DB_User, DB_Connection
from backend.services.db_user_service import DBUserService
from backend.schemas.db_user_schemas import DBUsersResponse, DBUserCreateRequest, DBUserUpdateRequest

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
async def create_db_user(connection_id: int, user_data: DBUserCreateRequest, db: AsyncSession = Depends(get_db)):
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при создании пользователя: {str(e)}")


@router.get("/connection/{connection_id}/search", response_model=DBUsersResponse)
async def search_db_users(connection_id: int, q: str = Query(..., min_length=1, description="Строка поиска по username, description или email"), db: AsyncSession = Depends(get_db)):
    """Поиск пользователей с автоматической синхронизацией по username, description, email"""
    try:
        service = DBUserService(db)
        await service.smart_sync_users_for_connection(connection_id)
        q_clean = q.strip().lower()
        query = (
            select(DB_User)
            .where(DB_User.connection_id == connection_id)
            .where(
                or_(
                    func.lower(DB_User.username).contains(q_clean),
                    func.lower(DB_User.description).contains(q_clean) if DB_User.description is not None else False,
                    func.lower(DB_User.email).contains(q_clean) if DB_User.email is not None else False
                )
            )
            .order_by(DB_User.username)
        )
        result = await db.execute(query)
        filtered_users = result.scalars().all()
        if not filtered_users:
            return {
                "connection_id": connection_id,
                "total_users": 0,
                "users": []
            }
        connection_result = await db.execute(select(DB_Connection).where(DB_Connection.id == connection_id))
        connection = connection_result.scalar_one_or_none()
        if not connection:
            raise ValueError("Подключение не найдено")
        external_users = await service._fetch_users_from_external_db(connection)
        external_by_oid = {u["oid"]: u for u in external_users}
        user_list = []
        for u in filtered_users:
            ext = external_by_oid.get(u.oid)
            user_list.append({
                "id": u.id,
                "oid": u.oid,
                "username": u.username,
                "description": u.description,
                "email": u.email,
                "created_at": u.created_at,
                "updated_at": u.updated_at,
                "rolsuper": ext["rolsuper"] if ext else False
            })
        return {
            "connection_id": connection_id,
            "total_users": len(user_list),
            "users": user_list
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при поиске пользователей: {str(e)}")


@router.patch("/{user_id}", response_model=dict)
async def update_db_user(user_id: int, user_data: DBUserUpdateRequest, db: AsyncSession = Depends(get_db)):
    """Обновление роли во внешней БД"""
    try:
        service = DBUserService(db)
        result = await service.update_user_in_external_db(
            user_id=user_id,
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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ошибка при обновлении роли: {str(e)}")
