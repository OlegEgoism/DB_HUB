import { usePaginatedConnectionResource } from './usePaginatedConnectionResource';

export interface DBFunctionInfo {
  schema_name: string;
  function_name: string;
  description: string | null;
  definition: string;
}

interface FunctionsResponse {
  total?: number;
  total_functions?: number;
  total_filtered_functions?: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  functions: DBFunctionInfo[];
}

const selectFunctionItems = (response: FunctionsResponse) => response.functions || [];
const selectFunctionTotal = (response: FunctionsResponse) =>
  response.total_filtered_functions ?? response.total_functions ?? response.total ?? 0;

export function useConnectionFunctions(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const { items: functions, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    FunctionsResponse,
    DBFunctionInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint: 'functions',
    selectItems: selectFunctionItems,
    selectTotal: selectFunctionTotal,
    errorMessage: 'Не удалось загрузить функции',
  });

  return { functions, loading, error, total, pages, hasNext, hasPrev };
}
