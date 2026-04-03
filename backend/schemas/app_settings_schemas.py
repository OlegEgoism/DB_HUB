from pydantic import BaseModel


class ConnectionTabsVisibility(BaseModel):
    metrics: bool = True
    users: bool = True
    groups: bool = True
    schemas: bool = True
    tables: bool = True
    views: bool = True
    indexes: bool = True
    functions: bool = True
    procedures: bool = True
    active_sql: bool = True
    sql_query: bool = True
    monitoring: bool = True
    sessions: bool = True


class ConnectionTabSettingsResponse(BaseModel):
    tabs_visibility: ConnectionTabsVisibility


class ConnectionTabSettingsUpdate(BaseModel):
    tabs_visibility: ConnectionTabsVisibility
