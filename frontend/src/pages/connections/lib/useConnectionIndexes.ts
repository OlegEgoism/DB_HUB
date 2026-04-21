import { usePaginatedConnectionResource } from './usePaginatedConnectionResource';

export interface DBIndexInfo {
  schema_name: string;
  table_name: string;
  index_name: string;
  owner: string;
  index_type: string;
  description?: string | null;
  definition: string;
}

interface IndexesResponse {
  total?: number;
  total_indexes?: number;
  total_filtered_indexes?: number;
  pages?: number;
  has_next?: boolean;
  has_prev?: boolean;
  indexes: DBIndexInfo[];
}

const selectIndexItems = (response: IndexesResponse) => response.indexes || [];
const selectIndexTotal = (response: IndexesResponse) => response.total_filtered_indexes ?? response.total_indexes ?? response.total ?? 0;

export function useConnectionIndexes(
  connectionId: number,
  page: number = 1,
  size: number = 20,
  search: string | null = null,
  reloadTrigger: number = 0,
) {
  const { items: indexes, loading, error, total, pages, hasNext, hasPrev } = usePaginatedConnectionResource<
    IndexesResponse,
    DBIndexInfo
  >({
    connectionId,
    page,
    size,
    search,
    reloadTrigger,
    endpoint: 'indexes',
    selectItems: selectIndexItems,
    selectTotal: selectIndexTotal,
    errorMessage: 'Не удалось загрузить индексы',
  });

  return { indexes, loading, error, total, pages, hasNext, hasPrev };
}
