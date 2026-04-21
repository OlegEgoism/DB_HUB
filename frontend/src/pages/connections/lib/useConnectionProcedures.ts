import { usePaginatedConnectionResource } from './usePaginatedConnectionResource';

export interface DBProcedureInfo {
  schema_name: string;
  procedure_name: string;
  description: string | null;
  definition: string;
}

interface ProceduresResponse {
  total?: number;
  total_procedures?: number;
  total_filtered_procedures?: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  procedures: DBProcedureInfo[];
}

const selectProcedureItems = (response: ProceduresResponse) => response.procedures || [];
const selectProcedureTotal = (response: ProceduresResponse) =>
  response.total_filtered_procedures ?? response.total_procedures ?? response.total ?? 0;

export function useConnectionProcedures(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const { items: procedures, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    ProceduresResponse,
    DBProcedureInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint: 'procedures',
    selectItems: selectProcedureItems,
    selectTotal: selectProcedureTotal,
    errorMessage: 'Не удалось загрузить процедуры',
  });

  return { procedures, loading, error, total, pages, hasNext, hasPrev };
}
