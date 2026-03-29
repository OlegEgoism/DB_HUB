import clsx from 'clsx';
import styles from '../detail-page.module.scss';
import type { TabType } from '@pages/connections/model/detail-page-types';
import type { ConnectionTabsVisibility } from '@shared/config';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setUsersSearchQuery: (value: string) => void;
  setUsersSearchTerm: (value: string) => void;
  setUsersPage: (value: number) => void;
  setGroupsSearchQuery: (value: string) => void;
  setGroupsSearchTerm: (value: string) => void;
  setGroupsPage: (value: number) => void;
  setSchemasSearchQuery: (value: string) => void;
  setSchemasSearchTerm: (value: string) => void;
  setSchemasPage: (value: number) => void;
  setTablesSearchQuery: (value: string) => void;
  setTablesSearchTerm: (value: string) => void;
  setTablesPage: (value: number) => void;
  setViewsSearchQuery: (value: string) => void;
  setViewsSearchTerm: (value: string) => void;
  setViewsPage: (value: number) => void;
  setIndexesSearchQuery: (value: string) => void;
  setIndexesSearchTerm: (value: string) => void;
  setIndexesPage: (value: number) => void;
  setFunctionsSearchQuery: (value: string) => void;
  setFunctionsSearchTerm: (value: string) => void;
  setFunctionsPage: (value: number) => void;
  setProceduresSearchQuery: (value: string) => void;
  setProceduresSearchTerm: (value: string) => void;
  setProceduresPage: (value: number) => void;
  setActiveSqlPage: (value: number) => void;
  setSqlQueryError: (value: string | null) => void;
  visibleTabs: ConnectionTabsVisibility;
}

export function DetailTabNavigation(props: Props) {
  const {
    activeTab,
    setActiveTab,
    setUsersSearchQuery,
    setUsersSearchTerm,
    setUsersPage,
    setGroupsSearchQuery,
    setGroupsSearchTerm,
    setGroupsPage,
    setSchemasSearchQuery,
    setSchemasSearchTerm,
    setSchemasPage,
    setTablesSearchQuery,
    setTablesSearchTerm,
    setTablesPage,
    setViewsSearchQuery,
    setViewsSearchTerm,
    setViewsPage,
    setIndexesSearchQuery,
    setIndexesSearchTerm,
    setIndexesPage,
    setFunctionsSearchQuery,
    setFunctionsSearchTerm,
    setFunctionsPage,
    setProceduresSearchQuery,
    setProceduresSearchTerm,
    setProceduresPage,
    setActiveSqlPage,
    setSqlQueryError,
    visibleTabs,
  } = props;

  return (
    <div className={clsx(styles.tabsContainer)}>
      {visibleTabs.metrics && <button className={clsx(styles.tabButton, activeTab === 'metrics' && styles.tabButton_active)} onClick={() => setActiveTab('metrics')}>Информация</button>}
      {visibleTabs.users && <button className={clsx(styles.tabButton, activeTab === 'users' && styles.tabButton_active)} onClick={() => { setActiveTab('users'); setUsersSearchQuery(''); setUsersSearchTerm(''); setUsersPage(1); }}>Пользователи</button>}
      {visibleTabs.groups && <button className={clsx(styles.tabButton, activeTab === 'groups' && styles.tabButton_active)} onClick={() => { setActiveTab('groups'); setGroupsSearchQuery(''); setGroupsSearchTerm(''); setGroupsPage(1); }}>Группы</button>}
      {visibleTabs.schemas && <button className={clsx(styles.tabButton, activeTab === 'schemas' && styles.tabButton_active)} onClick={() => { setActiveTab('schemas'); setSchemasSearchQuery(''); setSchemasSearchTerm(''); setSchemasPage(1); }}>Схемы</button>}
      {visibleTabs.tables && <button className={clsx(styles.tabButton, activeTab === 'tables' && styles.tabButton_active)} onClick={() => { setActiveTab('tables'); setTablesSearchQuery(''); setTablesSearchTerm(''); setTablesPage(1); }}>Таблицы</button>}
      {visibleTabs.views && <button className={clsx(styles.tabButton, activeTab === 'views' && styles.tabButton_active)} onClick={() => { setActiveTab('views'); setViewsSearchQuery(''); setViewsSearchTerm(''); setViewsPage(1); }}>Представления</button>}
      {visibleTabs.indexes && <button className={clsx(styles.tabButton, activeTab === 'indexes' && styles.tabButton_active)} onClick={() => { setActiveTab('indexes'); setIndexesSearchQuery(''); setIndexesSearchTerm(''); setIndexesPage(1); }}>Индексы</button>}
      {visibleTabs.functions && <button className={clsx(styles.tabButton, activeTab === 'functions' && styles.tabButton_active)} onClick={() => { setActiveTab('functions'); setFunctionsSearchQuery(''); setFunctionsSearchTerm(''); setFunctionsPage(1); }}>Функции</button>}
      {visibleTabs.procedures && <button className={clsx(styles.tabButton, activeTab === 'procedures' && styles.tabButton_active)} onClick={() => { setActiveTab('procedures'); setProceduresSearchQuery(''); setProceduresSearchTerm(''); setProceduresPage(1); }}>Процедуры</button>}
      {visibleTabs.active_sql && <button className={clsx(styles.tabButton, activeTab === 'active_sql' && styles.tabButton_active)} onClick={() => { setActiveTab('active_sql'); setActiveSqlPage(1); }}>Транзакции</button>}
      {visibleTabs.sql_query && <button className={clsx(styles.tabButton, activeTab === 'sql_query' && styles.tabButton_active)} onClick={() => { setActiveTab('sql_query'); setSqlQueryError(null); }}>SQL</button>}
    </div>
  );
}
