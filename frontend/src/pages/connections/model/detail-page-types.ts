export interface Connection {
  id: number;
  database_name: string;
  description: string | null;
  host: string;
  port: number;
  username: string;
  name: string;
  database_type: string;
  environment: string;
  is_favorite: boolean;
  owner_id: number;
  owner_username: string;
  status: string;
  db_size_mb: number | null;
  created_at: string;
}

export interface Metric {
  metric: string;
  value: string;
}

export interface Extension {
  name: string;
  version: string;
}

export interface GroupUser {
  oid: number;
  name: string;
}

export interface ClusterReplicationInfo {
  replication_lag?: string | number | null;
}

export interface DatabaseMetrics {
  connection_id: number;
  connection_name: string;
  connection_description: string | null;
  database_name: string;
  host: string;
  port: number;
  username: string;
  environment: string;
  database_type: string;
  status: string;
  basic_metrics: Metric[];
  extensions: Extension[];
  cluster_replication: ClusterReplicationInfo[];
  segment_details: unknown[];
}

export type TabType =
  | 'metrics'
  | 'users'
  | 'groups'
  | 'schemas'
  | 'tables'
  | 'views'
  | 'indexes'
  | 'functions'
  | 'procedures'
  | 'sql_query'
  | 'active_sql';

export type TablesFilterType = 'regular' | 'temporary' | 'all';
export type ViewsFilterType = 'views' | 'materialized_views';

export interface EditingUser {
  oid: number;
  name: string;
  email: string | null;
  description: string | null;
}
