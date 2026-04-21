import { usePaginatedConnectionResource } from './usePaginatedConnectionResource';

export interface SchemaRolePrivilege {
  role: string;
  usage: boolean;
  create: boolean;
}

export interface SchemaPrivilegeInfo {
  schema_name: string;
  owner: string;
  role_privileges: SchemaRolePrivilege[];
}

interface SchemasResponse {
  total_schemas?: number;
  total_filtered_schemas?: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  schema_privileges: SchemaPrivilegeInfo[];
}

const selectSchemaItems = (response: SchemasResponse) => response.schema_privileges || [];
const selectSchemaTotal = (response: SchemasResponse) => response.total_filtered_schemas ?? response.total_schemas ?? 0;

export function useConnectionSchemas(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const { items: schemas, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    SchemasResponse,
    SchemaPrivilegeInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint: 'schemas/privileges_groups',
    selectItems: selectSchemaItems,
    selectTotal: selectSchemaTotal,
    errorMessage: 'Не удалось загрузить схемы',
  });

  return { schemas, loading, error, total, pages, hasNext, hasPrev };
}
