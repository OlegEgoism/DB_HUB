// frontend/src/pages/connections/ui/detail-page.tsx
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useParams, useNavigate, useSearchParams} from 'react-router';
import clsx from 'clsx';
import styles from './detail-page.module.scss';
import groupModalStyles from './edit-group-modal.module.scss';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faDatabase,
    faSpinner,
    faExclamationCircle,
    faTrashAlt,
    faInfoCircle,
    faCogs,
    faTable,
    faUserGroup,
    faNetworkWired,
    faUsers,
    faSearch,
    faTimes,
    faChevronLeft,
    faChevronRight,
    faChevronCircleLeft,
    faChevronCircleRight,
    faPencilAlt,
    faUserPlus,
    faLayerGroup,
    faSitemap,
    faTableList,
    faEye,
    faArrowsRotate,
    faChartLine,
} from '@fortawesome/free-solid-svg-icons';
import {EditConnectionModal} from './EditConnectionModal';
import {EditUserModal} from './EditUserModal';
import {useConnectionUsers} from '../lib/useConnectionUsers';
import {useConnectionGroups} from '../lib/useConnectionGroups';
import {useConnectionSchemas} from '../lib/useConnectionSchemas';
import type {SchemaPrivilegeInfo, SchemaRolePrivilege} from '../lib/useConnectionSchemas';
import {useConnectionTables} from '../lib/useConnectionTables';
import type {TablePrivilegeInfo, TableGroupPrivilege} from '../lib/useConnectionTables';
import {
    useConnectionMaterializedViews,
    useConnectionMaterializedViewsPrivileges,
    useConnectionViews,
    useConnectionViewsPrivileges,
} from '../lib/useConnectionViews';
import type {ViewGroupPrivilege, ViewPrivilegeInfo} from '../lib/useConnectionViews';
import {useConnectionIndexes} from '../lib/useConnectionIndexes';
import {useConnectionFunctions} from '../lib/useConnectionFunctions';
import {useConnectionProcedures} from '../lib/useConnectionProcedures';
import {useConnectionActiveQueries} from '../lib/useConnectionActiveQueries';
import { useConnectionActivitySnapshot } from '../lib/useConnectionActivitySnapshot';
import {CreateUserModal} from "@pages/connections/ui/CreateUserModal.tsx";
import { PAGE_SIZES } from '@pages/connections/model/detail-page-constants';
import type { Connection, EditingUser, GroupUser, TabType, TablesFilterType, ViewsFilterType } from '@pages/connections/model/detail-page-types';
import { formatDateTime, formatStartTime, formatUptime } from '@pages/connections/lib/detail-page/formatters';
import { useConnectionDetailCore } from '@pages/connections/lib/detail-page/useConnectionDetailCore';
import { DetailTabNavigation } from '@pages/connections/ui/detail-page/tab-navigation';
import { connectionTabsSettingsModel, DEFAULT_CONNECTION_TABS_VISIBILITY } from '@entities/settings/model';
import { useI18n } from '@shared/i18n';

const DEFAULT_API_BASE_URL =
    typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : 'http://localhost:8000';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

const TAB_TYPE_VALUES: TabType[] = ['metrics', 'users', 'groups', 'schemas', 'tables', 'views', 'indexes', 'functions', 'procedures', 'active_sql', 'sql_query', 'monitoring'];

const isTabType = (value: string | null): value is TabType => value !== null && TAB_TYPE_VALUES.includes(value as TabType);

type ActivityChartPoint = {
    timestamp: string;
    total: number;
    select: number;
    insert: number;
    update: number;
    delete: number;
    other: number;
};

type SessionActivityChartPoint = {
    timestamp: string;
    totalSessions: number;
    activeSessions: number;
    activeTransactions: number;
};


const detectQueryOperation = (query: string | null | undefined): keyof Omit<ActivityChartPoint, 'timestamp' | 'total'> => {
    const normalized = (query || '').trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'select';
    if (normalized.startsWith('INSERT')) return 'insert';
    if (normalized.startsWith('UPDATE')) return 'update';
    if (normalized.startsWith('DELETE')) return 'delete';
    return 'other';
};

const SQL_LINE_BREAK_KEYWORDS = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP BY',
    'HAVING',
    'ORDER BY',
    'LIMIT',
    'OFFSET',
    'VALUES',
    'SET',
    'RETURNING',
    'JOIN',
    'LEFT JOIN',
    'RIGHT JOIN',
    'INNER JOIN',
    'FULL JOIN',
    'ON',
    'UNION',
];

const formatSqlForDisplay = (query: string | null | undefined): string => {
    if (!query || !query.trim()) return '—';

    let normalized = query.replace(/\s+/g, ' ').trim();
    for (const keyword of SQL_LINE_BREAK_KEYWORDS) {
        const escapedKeyword = keyword.replace(' ', '\\s+');
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
        normalized = normalized.replace(regex, `\n${keyword}`);
    }

    normalized = normalized
        .replace(/\s*,\s*/g, ',\n  ')
        .replace(/\(\s*/g, '(')
        .replace(/\s*\)/g, ')')
        .replace(/\n{2,}/g, '\n')
        .trim();

    return normalized;
};

export default function ConnectionDetailPage() {
    const { t } = useI18n();
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        connection,
        metrics,
        loading,
        loadingMetrics,
        error,
        setError,
        loadConnection,
        loadMetrics,
    } = useConnectionDetailCore(id);
    const [activeTab, setActiveTabState] = useState<TabType>('metrics');
    const [visibleTabs, setVisibleTabs] = useState(DEFAULT_CONNECTION_TABS_VISIBILITY);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [confirmDeleteName, setConfirmDeleteName] = useState<string>('');
    const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
// Состояния для редактирования пользователя
    const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

// Состояния для пагинации пользователей
    const [usersPage, setUsersPage] = useState(1);
    const [usersPageSize, setUsersPageSize] = useState(8);
    const [usersSearchQuery, setUsersSearchQuery] = useState('');
    const [usersSearchTerm, setUsersSearchTerm] = useState('');

    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [userDeleteTarget, setUserDeleteTarget] = useState<{ oid: number; name: string } | null>(null);
    const [deletingUserOid, setDeletingUserOid] = useState<number | null>(null);
    const [userDeleteError, setUserDeleteError] = useState<string | null>(null);
    const [usersReloadTrigger, setUsersReloadTrigger] = useState(0);


    const [groupsPage, setGroupsPage] = useState(1);
    const [groupsPageSize, setGroupsPageSize] = useState(8);
    const [groupsSearchQuery, setGroupsSearchQuery] = useState('');
    const [groupsSearchTerm, setGroupsSearchTerm] = useState('');
    const [groupsReloadTrigger, setGroupsReloadTrigger] = useState(0);
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<{ oid: number; name: string; description: string | null } | null>(null);
    const [groupFormName, setGroupFormName] = useState('');
    const [groupFormDescription, setGroupFormDescription] = useState('');
    const [groupFormLoading, setGroupFormLoading] = useState(false);
    const [groupDeleteTarget, setGroupDeleteTarget] = useState<{ oid: number; name: string } | null>(null);
    const [deletingGroupOid, setDeletingGroupOid] = useState<number | null>(null);
    const [groupDeleteErrorModal, setGroupDeleteErrorModal] = useState<string | null>(null);
    const [groupUsersModal, setGroupUsersModal] = useState<{ oid: number; name: string; userCount: number } | null>(null);
    const [groupUsers, setGroupUsers] = useState<GroupUser[]>([]);
    const [allUsersForGroup, setAllUsersForGroup] = useState<GroupUser[]>([]);
    const [groupUserCountOverrides, setGroupUserCountOverrides] = useState<Record<number, number>>({});
    const [selectedGroupUserOids, setSelectedGroupUserOids] = useState<number[]>([]);
    const [groupUserSearchQuery, setGroupUserSearchQuery] = useState('');
    const [groupUsersLoading, setGroupUsersLoading] = useState(false);
    const [groupUsersSaving, setGroupUsersSaving] = useState(false);


    const [schemasPage, setSchemasPage] = useState(1);
    const [schemasPageSize, setSchemasPageSize] = useState(8);
    const [schemasSearchQuery, setSchemasSearchQuery] = useState('');
    const [schemasSearchTerm, setSchemasSearchTerm] = useState('');
    const [schemasReloadTrigger, setSchemasReloadTrigger] = useState(0);
    const [editingSchema, setEditingSchema] = useState<SchemaPrivilegeInfo | null>(null);
    const [schemaRolesForm, setSchemaRolesForm] = useState<SchemaRolePrivilege[]>([]);
    const [schemaModalLoading, setSchemaModalLoading] = useState(false);

    const [tablesPage, setTablesPage] = useState(1);
    const [tablesPageSize, setTablesPageSize] = useState(8);
    const [tablesSearchQuery, setTablesSearchQuery] = useState('');
    const [tablesSearchTerm, setTablesSearchTerm] = useState('');
    const [tablesFilterType, setTablesFilterType] = useState<TablesFilterType>('regular');
    const [tablesReloadTrigger, setTablesReloadTrigger] = useState(0);
    const [editingTable, setEditingTable] = useState<TablePrivilegeInfo | null>(null);
    const [tableGroupsForm, setTableGroupsForm] = useState<TableGroupPrivilege[]>([]);
    const [tableGroupSearchQuery, setTableGroupSearchQuery] = useState('');
    const [tableModalLoading, setTableModalLoading] = useState(false);

    const [viewsPage, setViewsPage] = useState(1);
    const [viewsPageSize, setViewsPageSize] = useState(8);
    const [viewsSearchQuery, setViewsSearchQuery] = useState('');
    const [viewsSearchTerm, setViewsSearchTerm] = useState('');

    const [materializedViewsPage, setMaterializedViewsPage] = useState(1);
    const [materializedViewsPageSize, setMaterializedViewsPageSize] = useState(8);
    const [materializedViewsSearchQuery, setMaterializedViewsSearchQuery] = useState('');
    const [materializedViewsSearchTerm, setMaterializedViewsSearchTerm] = useState('');
    const [viewsFilterType, setViewsFilterType] = useState<ViewsFilterType>('views');
    const [viewsReloadTrigger, setViewsReloadTrigger] = useState(0);
    const [editingView, setEditingView] = useState<ViewPrivilegeInfo | null>(null);
    const [viewGroupsForm, setViewGroupsForm] = useState<ViewGroupPrivilege[]>([]);
    const [viewGroupSearchQuery, setViewGroupSearchQuery] = useState('');
    const [viewModalLoading, setViewModalLoading] = useState(false);

    const [indexesPage, setIndexesPage] = useState(1);
    const [indexesPageSize, setIndexesPageSize] = useState(8);
    const [indexesSearchQuery, setIndexesSearchQuery] = useState('');
    const [indexesSearchTerm, setIndexesSearchTerm] = useState('');
    const [indexesReloadTrigger, setIndexesReloadTrigger] = useState(0);

    const [functionsPage, setFunctionsPage] = useState(1);
    const [functionsPageSize, setFunctionsPageSize] = useState(8);
    const [functionsSearchQuery, setFunctionsSearchQuery] = useState('');
    const [functionsSearchTerm, setFunctionsSearchTerm] = useState('');
    const [functionsReloadTrigger, setFunctionsReloadTrigger] = useState(0);

    const [proceduresPage, setProceduresPage] = useState(1);
    const [proceduresPageSize, setProceduresPageSize] = useState(8);
    const [proceduresSearchQuery, setProceduresSearchQuery] = useState('');
    const [proceduresSearchTerm, setProceduresSearchTerm] = useState('');
    const [proceduresReloadTrigger, setProceduresReloadTrigger] = useState(0);

    const [sqlQueryText, setSqlQueryText] = useState('SELECT 1 AS test;');
    const [sqlQueryLimit, setSqlQueryLimit] = useState(100);
    const [sqlQueryLoading, setSqlQueryLoading] = useState(false);
    const [sqlQueryError, setSqlQueryError] = useState<string | null>(null);
    const [sqlQueryColumns, setSqlQueryColumns] = useState<string[]>([]);
    const [sqlQueryRows, setSqlQueryRows] = useState<Record<string, unknown>[]>([]);
    const [sqlQueryTruncated, setSqlQueryTruncated] = useState(false);

    const [activeSqlPage, setActiveSqlPage] = useState(1);
    const [activeSqlPageSize, setActiveSqlPageSize] = useState(8);
    const [activeSqlUsernameQuery, setActiveSqlUsernameQuery] = useState('');
    const [activeSqlUsername, setActiveSqlUsername] = useState('');
    const [activeSqlMinDuration, setActiveSqlMinDuration] = useState('');
    const [activeSqlMaxDuration, setActiveSqlMaxDuration] = useState('');
    const [activeSqlReloadTrigger, setActiveSqlReloadTrigger] = useState(0);
    const [activityChartReloadTrigger, setActivityChartReloadTrigger] = useState(0);
    const [activityChartPoints, setActivityChartPoints] = useState<ActivityChartPoint[]>([]);
    const [sessionActivityPoints, setSessionActivityPoints] = useState<SessionActivityChartPoint[]>([]);
    const [sessionActivityReloadTrigger, setSessionActivityReloadTrigger] = useState(0);
    const [activityChartRefreshIntervalMs, setActivityChartRefreshIntervalMs] = useState(2000);
    const [sessionMonitoringRefreshIntervalMs, setSessionMonitoringRefreshIntervalMs] = useState(1000);
    const [isSessionActivityCollapsed, setIsSessionActivityCollapsed] = useState(false);
    const [isSqlActivityCollapsed, setIsSqlActivityCollapsed] = useState(false);
    const [sessionChartHoverIndex, setSessionChartHoverIndex] = useState<number | null>(null);
    const [sqlChartHoverIndex, setSqlChartHoverIndex] = useState<number | null>(null);
    const [sessionSeriesVisibility, setSessionSeriesVisibility] = useState({
        totalSessions: true,
        activeSessions: true,
        activeTransactions: true,
    });
    const [sqlSeriesVisibility, setSqlSeriesVisibility] = useState({
        total: true,
        select: true,
        insert: true,
        update: true,
        delete: true,
        other: true,
    });
    const [sessionChartWindowStartPercent, setSessionChartWindowStartPercent] = useState(50);
    const [sessionChartWindowEndPercent, setSessionChartWindowEndPercent] = useState(100);
    const [sqlChartWindowStartPercent, setSqlChartWindowStartPercent] = useState(50);
    const [sqlChartWindowEndPercent, setSqlChartWindowEndPercent] = useState(100);
    const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
    const [terminateProcessModal, setTerminateProcessModal] = useState<{ title: string; message: string } | null>(null);
    const sessionTimelineRangeShellRef = useRef<HTMLDivElement | null>(null);
    const sqlTimelineRangeShellRef = useRef<HTMLDivElement | null>(null);

// Обработчики для создания пользователя
    const openCreateUserModal = () => {
        setIsCreateUserModalOpen(true);
    };

    const closeCreateUserModal = () => {
        setIsCreateUserModalOpen(false);
    };

    const handleCreateUserSuccess = () => {
        closeCreateUserModal();
        // Перезагружаем список пользователей
        setUsersPage(1);
        setUsersSearchTerm('');
        setUsersReloadTrigger(prev => prev + 1);
    };

// Используем хук с параметрами пагинации
    const {
        users,
        loading: loadingUsers,
        error: usersError,
        total: totalUsers,
        pages: totalUsersPages,
        hasNext: usersHasNext,
        hasPrev: usersHasPrev
    } = useConnectionUsers(
        id ? parseInt(id) : 0,
        usersPage,
        usersPageSize,
        usersSearchTerm || null,
        usersReloadTrigger
    );


    const {
        groups,
        loading: loadingGroups,
        error: groupsError,
        total: totalGroups,
        pages: totalGroupsPages,
        hasNext: groupsHasNext,
        hasPrev: groupsHasPrev
    } = useConnectionGroups(
        id ? parseInt(id) : 0,
        groupsPage,
        groupsPageSize,
        groupsSearchTerm || null,
        groupsReloadTrigger
    );


    const {
        schemas,
        loading: loadingSchemas,
        error: schemasError,
        total: totalSchemas,
        pages: totalSchemasPages,
        hasNext: schemasHasNext,
        hasPrev: schemasHasPrev
    } = useConnectionSchemas(
        id ? parseInt(id) : 0,
        schemasPage,
        schemasPageSize,
        schemasSearchTerm || null,
        schemasReloadTrigger
    );

    const {
        tables,
        loading: loadingTables,
        error: tablesError,
        total: totalTables,
        pages: totalTablesPages,
        hasNext: tablesHasNext,
        hasPrev: tablesHasPrev
    } = useConnectionTables(
        id ? parseInt(id) : 0,
        tablesPage,
        tablesPageSize,
        tablesSearchTerm || null,
        tablesFilterType,
        tablesReloadTrigger
    );


    const {
        views,
        loading: loadingViews,
        error: viewsError,
        total: totalViews,
        pages: totalViewsPages,
        hasNext: viewsHasNext,
        hasPrev: viewsHasPrev
    } = useConnectionViews(
        id ? parseInt(id) : 0,
        viewsPage,
        viewsPageSize,
        viewsSearchTerm || null,
        viewsReloadTrigger
    );

    const {
        views: materializedViews,
        loading: loadingMaterializedViews,
        error: materializedViewsError,
        total: totalMaterializedViews,
        pages: totalMaterializedViewsPages,
        hasNext: materializedViewsHasNext,
        hasPrev: materializedViewsHasPrev
    } = useConnectionMaterializedViews(
        id ? parseInt(id) : 0,
        materializedViewsPage,
        materializedViewsPageSize,
        materializedViewsSearchTerm || null,
        viewsReloadTrigger
    );

    const {
        viewPrivileges,
        loading: loadingViewsPrivileges,
        error: viewsPrivilegesError,
    } = useConnectionViewsPrivileges(
        id ? parseInt(id) : 0,
        viewsPage,
        viewsPageSize,
        viewsSearchTerm || null,
        viewsReloadTrigger
    );

    const {
        viewPrivileges: materializedViewPrivileges,
        loading: loadingMaterializedViewsPrivileges,
        error: materializedViewsPrivilegesError,
    } = useConnectionMaterializedViewsPrivileges(
        id ? parseInt(id) : 0,
        materializedViewsPage,
        materializedViewsPageSize,
        materializedViewsSearchTerm || null,
        viewsReloadTrigger
    );

    const resolvedViewsTotal = totalViews > 0 ? totalViews : views.length;
    const resolvedViewsPages = totalViewsPages > 0 ? totalViewsPages : 1;
    const resolvedMaterializedViewsTotal = totalMaterializedViews > 0 ? totalMaterializedViews : materializedViews.length;
    const resolvedMaterializedViewsPages = totalMaterializedViewsPages > 0 ? totalMaterializedViewsPages : 1;

    const {
        indexes,
        loading: loadingIndexes,
        error: indexesError,
        total: totalIndexes,
        pages: totalIndexesPages,
        hasNext: indexesHasNext,
        hasPrev: indexesHasPrev
    } = useConnectionIndexes(
        id ? parseInt(id) : 0,
        indexesPage,
        indexesPageSize,
        indexesSearchTerm || null,
        indexesReloadTrigger
    );

    const resolvedIndexesTotal = totalIndexes > 0 ? totalIndexes : indexes.length;
    const resolvedIndexesPages = totalIndexesPages > 0 ? totalIndexesPages : 1;


    const {
        functions,
        loading: loadingFunctions,
        error: functionsError,
        total: totalFunctions,
        pages: totalFunctionsPages,
        hasNext: functionsHasNext,
        hasPrev: functionsHasPrev
    } = useConnectionFunctions(
        id ? parseInt(id) : 0,
        functionsPage,
        functionsPageSize,
        functionsSearchTerm || null,
        functionsReloadTrigger
    );

    const resolvedFunctionsTotal = totalFunctions > 0 ? totalFunctions : functions.length;
    const resolvedFunctionsPages = totalFunctionsPages > 0 ? totalFunctionsPages : 1;


    const {
        procedures,
        loading: loadingProcedures,
        error: proceduresError,
        total: totalProcedures,
        pages: totalProceduresPages,
        hasNext: proceduresHasNext,
        hasPrev: proceduresHasPrev
    } = useConnectionProcedures(
        id ? parseInt(id) : 0,
        proceduresPage,
        proceduresPageSize,
        proceduresSearchTerm || null,
        proceduresReloadTrigger
    );

    const resolvedProceduresTotal = totalProcedures > 0 ? totalProcedures : procedures.length;
    const resolvedProceduresPages = totalProceduresPages > 0 ? totalProceduresPages : 1;


    const {
        activeQueries,
        loading: loadingActiveQueries,
        error: activeQueriesError,
        total: totalActiveQueries,
        pages: totalActiveQueriesPages,
        hasNext: activeQueriesHasNext,
        hasPrev: activeQueriesHasPrev,
    } = useConnectionActiveQueries(
        id ? parseInt(id) : 0,
        activeSqlPage,
        activeSqlPageSize,
        activeSqlUsername || null,
        activeSqlMinDuration.trim() ? Number(activeSqlMinDuration) : null,
        activeSqlMaxDuration.trim() ? Number(activeSqlMaxDuration) : null,
        activeSqlReloadTrigger,
    );

    const {
        activeQueries: chartActiveQueries,
        total: chartTotalActiveQueries,
        loading: chartLoadingActiveQueries,
        error: chartActiveQueriesError,
    } = useConnectionActiveQueries(
        activeTab === 'monitoring' && id ? parseInt(id) : null,
        1,
        200,
        null,
        null,
        null,
        activityChartReloadTrigger,
    );

    const isMonitoringRelatedTab = activeTab === 'metrics' || activeTab === 'active_sql' || activeTab === 'monitoring';
    const sessionActivityRefreshMs = activeTab === 'monitoring' ? sessionMonitoringRefreshIntervalMs : 3000;
    const { snapshot: sessionActivitySnapshot, loading: loadingSessionActivity, error: sessionActivityError } = useConnectionActivitySnapshot(
        isMonitoringRelatedTab && id ? parseInt(id) : null,
        sessionActivityReloadTrigger,
        sessionActivityRefreshMs,
    );

    useEffect(() => {
        if (activeTab === 'metrics' && !metrics) {
            loadMetrics();
        }
    }, [activeTab, metrics, loadMetrics]);

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');

        if (isTabType(tabFromUrl)) {
            if (tabFromUrl !== activeTab) {
                setActiveTabState(tabFromUrl);
            }
            return;
        }

        setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);
            nextParams.set('tab', 'metrics');
            return nextParams;
        }, { replace: true });
    }, [searchParams, setSearchParams, activeTab]);

    const handleTabChange = (tab: TabType) => {
        setActiveTabState(tab);
        setSearchParams((prev) => {
            const nextParams = new URLSearchParams(prev);
            nextParams.set('tab', tab);
            return nextParams;
        }, { replace: true });
    };

    useEffect(() => {
        const loadVisibleTabs = async () => {
            const nextVisibleTabs = await connectionTabsSettingsModel.fetchVisibility();
            setVisibleTabs(nextVisibleTabs);
        };

        void loadVisibleTabs();
    }, []);

    useEffect(() => {
        const visibleTabKeys = connectionTabsSettingsModel.getVisibleTabs(visibleTabs);
        if (visibleTabKeys.length === 0) {
            if (activeTab !== 'metrics') {
                setActiveTabState('metrics');
                setSearchParams((prev) => {
                    const nextParams = new URLSearchParams(prev);
                    nextParams.set('tab', 'metrics');
                    return nextParams;
                }, { replace: true });
            }
            return;
        }

        if (!visibleTabKeys.includes(activeTab)) {
            const fallbackTab = visibleTabKeys[0] as TabType;
            setActiveTabState(fallbackTab);
            setSearchParams((prev) => {
                const nextParams = new URLSearchParams(prev);
                nextParams.set('tab', fallbackTab);
                return nextParams;
            }, { replace: true });
        }
    }, [activeTab, visibleTabs, setSearchParams]);

    useEffect(() => {
        if (activeTab !== 'monitoring') return;

        setActivityChartReloadTrigger((prev) => prev + 1);
        const intervalId = window.setInterval(() => {
            setActivityChartReloadTrigger((prev) => prev + 1);
        }, activityChartRefreshIntervalMs);

        return () => window.clearInterval(intervalId);
    }, [activeTab, activityChartRefreshIntervalMs]);

    useEffect(() => {
        if (activeTab !== 'monitoring' || chartLoadingActiveQueries) return;

        const point: ActivityChartPoint = {
            timestamp: new Date().toLocaleTimeString('ru-RU'),
            total: chartTotalActiveQueries,
            select: 0,
            insert: 0,
            update: 0,
            delete: 0,
            other: 0,
        };

        chartActiveQueries.forEach((queryInfo) => {
            const op = detectQueryOperation(queryInfo.query);
            point[op] += 1;
        });

        setActivityChartPoints((prev) => [...prev.slice(-59), point]);
    }, [activeTab, chartTotalActiveQueries, chartLoadingActiveQueries, chartActiveQueries]);

    useEffect(() => {
        if ((activeTab !== 'metrics' && activeTab !== 'monitoring') || !sessionActivitySnapshot) return;

        const activeTransactions = sessionActivitySnapshot.users.reduce((sum, user) => sum + user.active_transactions, 0);
        const point: SessionActivityChartPoint = {
            timestamp: new Date().toLocaleTimeString('ru-RU'),
            totalSessions: sessionActivitySnapshot.sessions_total,
            activeSessions: sessionActivitySnapshot.active_sessions,
            activeTransactions,
        };

        setSessionActivityPoints((prev) => [...prev.slice(-59), point]);
    }, [activeTab, sessionActivitySnapshot]);

    const sessionChartWindowBoundaries = useMemo(() => {
        if (sessionActivityPoints.length <= 1) {
            return { startIndex: 0, endIndex: Math.max(sessionActivityPoints.length - 1, 0) };
        }

        const maxIndex = sessionActivityPoints.length - 1;
        const startIndex = Math.floor((sessionChartWindowStartPercent / 100) * maxIndex);
        const endIndex = Math.ceil((sessionChartWindowEndPercent / 100) * maxIndex);

        return {
            startIndex: Math.max(0, Math.min(startIndex, maxIndex)),
            endIndex: Math.max(0, Math.min(endIndex, maxIndex)),
        };
    }, [sessionActivityPoints, sessionChartWindowStartPercent, sessionChartWindowEndPercent]);

    const applySessionChartWindow = (nextStart: number, nextEnd: number) => {
        const minGap = 4;
        const safeStart = Math.max(0, Math.min(nextStart, 100 - minGap));
        const safeEnd = Math.max(safeStart + minGap, Math.min(nextEnd, 100));
        setSessionChartWindowStartPercent(safeStart);
        setSessionChartWindowEndPercent(safeEnd);
        setSessionChartHoverIndex(null);
    };

    const shiftSessionChartWindow = (deltaPercent: number) => {
        const width = sessionChartWindowEndPercent - sessionChartWindowStartPercent;
        const nextStart = Math.max(0, Math.min(sessionChartWindowStartPercent + deltaPercent, 100 - width));
        applySessionChartWindow(nextStart, nextStart + width);
    };

    const zoomSessionChartWindow = (zoomIn: boolean) => {
        const currentWidth = sessionChartWindowEndPercent - sessionChartWindowStartPercent;
        const minWidth = 8;
        const maxWidth = 100;
        const nextWidth = zoomIn
            ? Math.max(minWidth, currentWidth * 0.88)
            : Math.min(maxWidth, currentWidth * 1.12);
        const center = (sessionChartWindowStartPercent + sessionChartWindowEndPercent) / 2;
        const nextStart = Math.max(0, Math.min(center - nextWidth / 2, 100 - nextWidth));
        applySessionChartWindow(nextStart, nextStart + nextWidth);
    };

    const handleTimelineScaleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            zoomSessionChartWindow(event.deltaY < 0);
            return;
        }
        const direction = event.deltaY > 0 ? 1 : -1;
        shiftSessionChartWindow(direction * 1.5);
    };

    const handleTimelineScalePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const shell = sessionTimelineRangeShellRef.current;
        if (!shell) return;
        const rect = shell.getBoundingClientRect();
        const clickPercent = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
        const width = sessionChartWindowEndPercent - sessionChartWindowStartPercent;
        const nextStart = Math.max(0, Math.min(clickPercent - width / 2, 100 - width));
        applySessionChartWindow(nextStart, nextStart + width);
    };

    const showAllSessionChartWindow = () => {
        applySessionChartWindow(0, 100);
    };

    const showLiveSessionChartWindow = () => {
        applySessionChartWindow(80, 100);
    };

    const visibleSessionActivityPoints = useMemo(() => {
        if (sessionActivityPoints.length === 0) return [];
        const { startIndex, endIndex } = sessionChartWindowBoundaries;
        return sessionActivityPoints.slice(startIndex, endIndex + 1);
    }, [sessionActivityPoints, sessionChartWindowBoundaries]);

    const sqlChartWindowBoundaries = useMemo(() => {
        if (activityChartPoints.length <= 1) {
            return { startIndex: 0, endIndex: Math.max(activityChartPoints.length - 1, 0) };
        }

        const maxIndex = activityChartPoints.length - 1;
        const startIndex = Math.floor((sqlChartWindowStartPercent / 100) * maxIndex);
        const endIndex = Math.ceil((sqlChartWindowEndPercent / 100) * maxIndex);

        return {
            startIndex: Math.max(0, Math.min(startIndex, maxIndex)),
            endIndex: Math.max(0, Math.min(endIndex, maxIndex)),
        };
    }, [activityChartPoints, sqlChartWindowStartPercent, sqlChartWindowEndPercent]);

    const applySqlChartWindow = (nextStart: number, nextEnd: number) => {
        const minGap = 4;
        const safeStart = Math.max(0, Math.min(nextStart, 100 - minGap));
        const safeEnd = Math.max(safeStart + minGap, Math.min(nextEnd, 100));
        setSqlChartWindowStartPercent(safeStart);
        setSqlChartWindowEndPercent(safeEnd);
        setSqlChartHoverIndex(null);
    };

    const shiftSqlChartWindow = (deltaPercent: number) => {
        const width = sqlChartWindowEndPercent - sqlChartWindowStartPercent;
        const nextStart = Math.max(0, Math.min(sqlChartWindowStartPercent + deltaPercent, 100 - width));
        applySqlChartWindow(nextStart, nextStart + width);
    };

    const zoomSqlChartWindow = (zoomIn: boolean) => {
        const currentWidth = sqlChartWindowEndPercent - sqlChartWindowStartPercent;
        const minWidth = 8;
        const maxWidth = 100;
        const nextWidth = zoomIn
            ? Math.max(minWidth, currentWidth * 0.88)
            : Math.min(maxWidth, currentWidth * 1.12);
        const center = (sqlChartWindowStartPercent + sqlChartWindowEndPercent) / 2;
        const nextStart = Math.max(0, Math.min(center - nextWidth / 2, 100 - nextWidth));
        applySqlChartWindow(nextStart, nextStart + nextWidth);
    };

    const handleSqlTimelineScaleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            zoomSqlChartWindow(event.deltaY < 0);
            return;
        }
        const direction = event.deltaY > 0 ? 1 : -1;
        shiftSqlChartWindow(direction * 1.5);
    };

    const handleSqlTimelineScalePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const shell = sqlTimelineRangeShellRef.current;
        if (!shell) return;
        const rect = shell.getBoundingClientRect();
        const clickPercent = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
        const width = sqlChartWindowEndPercent - sqlChartWindowStartPercent;
        const nextStart = Math.max(0, Math.min(clickPercent - width / 2, 100 - width));
        applySqlChartWindow(nextStart, nextStart + width);
    };

    const showAllSqlChartWindow = () => {
        applySqlChartWindow(0, 100);
    };

    const showLiveSqlChartWindow = () => {
        applySqlChartWindow(80, 100);
    };

    const visibleSqlActivityPoints = useMemo(() => {
        if (activityChartPoints.length === 0) return [];
        const { startIndex, endIndex } = sqlChartWindowBoundaries;
        return activityChartPoints.slice(startIndex, endIndex + 1);
    }, [activityChartPoints, sqlChartWindowBoundaries]);

    const sessionActivityChartModel = useMemo(() => {
        const width = 860;
        const height = 210;
        const axis = {left: 52, right: 20, top: 16, bottom: 34};
        const innerWidth = width - axis.left - axis.right;
        const innerHeight = height - axis.top - axis.bottom;

        if (visibleSessionActivityPoints.length === 0) {
            return {
                width,
                height,
                axis,
                lines: { totalSessions: '', activeSessions: '', activeTransactions: '' },
                yTicks: [0, 1, 2, 3, 4],
                xTickLabels: [] as Array<{ x: number; label: string }>,
                maxValue: 0,
            };
        }

        const values = visibleSessionActivityPoints.flatMap((p) => [p.totalSessions, p.activeSessions, p.activeTransactions]);
        const maxValue = Math.max(...values, 1);

        const buildPolyline = (key: keyof Omit<SessionActivityChartPoint, 'timestamp'>) =>
            visibleSessionActivityPoints
                .map((point, index) => {
                    const x = axis.left + (index / Math.max(visibleSessionActivityPoints.length - 1, 1)) * innerWidth;
                    const y = axis.top + innerHeight - ((point[key] as number) / maxValue) * innerHeight;
                    return `${x},${y}`;
                })
                .join(' ');

        const yTicks = [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(maxValue * part));
        const xTickIndexes = [0, 0.5, 1]
            .map((part) => Math.round((visibleSessionActivityPoints.length - 1) * part))
            .filter((idx, pos, arr) => arr.indexOf(idx) === pos);

        const xTickLabels = xTickIndexes.map((idx) => ({
            x: axis.left + (idx / Math.max(visibleSessionActivityPoints.length - 1, 1)) * innerWidth,
            label: visibleSessionActivityPoints[idx]?.timestamp ?? '',
        }));

        return {
            width,
            height,
            axis,
            lines: {
                totalSessions: buildPolyline('totalSessions'),
                activeSessions: buildPolyline('activeSessions'),
                activeTransactions: buildPolyline('activeTransactions'),
            },
            yTicks,
            xTickLabels,
            maxValue,
        };
    }, [visibleSessionActivityPoints]);

    const hoveredSessionPoint = useMemo(() => {
        if (sessionChartHoverIndex === null) return null;
        return visibleSessionActivityPoints[sessionChartHoverIndex] ?? null;
    }, [sessionChartHoverIndex, visibleSessionActivityPoints]);

    const hoveredSessionPointX = useMemo(() => {
        if (sessionChartHoverIndex === null || visibleSessionActivityPoints.length === 0) return null;
        const chartInnerWidth = sessionActivityChartModel.width - sessionActivityChartModel.axis.left - sessionActivityChartModel.axis.right;
        const safeIndex = Math.max(0, Math.min(sessionChartHoverIndex, visibleSessionActivityPoints.length - 1));
        return sessionActivityChartModel.axis.left + (safeIndex / Math.max(visibleSessionActivityPoints.length - 1, 1)) * chartInnerWidth;
    }, [sessionChartHoverIndex, sessionActivityChartModel, visibleSessionActivityPoints.length]);

    useEffect(() => {
        if (sessionChartHoverIndex === null) return;
        if (sessionChartHoverIndex <= visibleSessionActivityPoints.length - 1) return;
        setSessionChartHoverIndex(null);
    }, [sessionChartHoverIndex, visibleSessionActivityPoints.length]);

    const activityChartModel = useMemo(() => {
        const width = 860;
        const height = 220;
        const axis = {left: 52, right: 20, top: 16, bottom: 34};
        const innerWidth = width - axis.left - axis.right;
        const innerHeight = height - axis.top - axis.bottom;

        if (visibleSqlActivityPoints.length === 0) {
            return {
                width,
                height,
                axis,
                lines: {
                    total: '',
                    select: '',
                    insert: '',
                    update: '',
                    delete: '',
                    other: '',
                },
                yTicks: [0, 1, 2, 3, 4],
                xTickLabels: [] as Array<{ x: number; label: string }>,
                minValue: 0,
                maxValue: 0,
                avgValue: 0,
            };
        }

        const values = visibleSqlActivityPoints.flatMap((p) => [p.total, p.select, p.insert, p.update, p.delete, p.other]);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const avgValue = Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10;
        const topValue = Math.max(maxValue, 1);

        const buildPolyline = (key: keyof Omit<ActivityChartPoint, 'timestamp'>) =>
            visibleSqlActivityPoints
                .map((point, index) => {
                    const x = axis.left + (index / Math.max(visibleSqlActivityPoints.length - 1, 1)) * innerWidth;
                    const y = axis.top + innerHeight - ((point[key] as number) / topValue) * innerHeight;
                    return `${x},${y}`;
                })
                .join(' ');

        const yTicks = [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(topValue * part));

        const xTickIndexes = [0, 0.5, 1]
            .map((part) => Math.round((visibleSqlActivityPoints.length - 1) * part))
            .filter((idx, pos, arr) => arr.indexOf(idx) === pos);

        const xTickLabels = xTickIndexes.map((idx) => ({
            x: axis.left + (idx / Math.max(visibleSqlActivityPoints.length - 1, 1)) * innerWidth,
            label: visibleSqlActivityPoints[idx]?.timestamp ?? '',
        }));

        return {
            width,
            height,
            axis,
            lines: {
                total: buildPolyline('total'),
                select: buildPolyline('select'),
                insert: buildPolyline('insert'),
                update: buildPolyline('update'),
                delete: buildPolyline('delete'),
                other: buildPolyline('other'),
            },
            yTicks,
            xTickLabels,
            minValue,
            maxValue,
            avgValue,
        };
    }, [visibleSqlActivityPoints]);

    const hoveredSqlPoint = useMemo(() => {
        if (sqlChartHoverIndex === null) return null;
        return visibleSqlActivityPoints[sqlChartHoverIndex] ?? null;
    }, [sqlChartHoverIndex, visibleSqlActivityPoints]);

    const hoveredSqlPointX = useMemo(() => {
        if (sqlChartHoverIndex === null || visibleSqlActivityPoints.length === 0) return null;
        const chartInnerWidth = activityChartModel.width - activityChartModel.axis.left - activityChartModel.axis.right;
        const safeIndex = Math.max(0, Math.min(sqlChartHoverIndex, visibleSqlActivityPoints.length - 1));
        return activityChartModel.axis.left + (safeIndex / Math.max(visibleSqlActivityPoints.length - 1, 1)) * chartInnerWidth;
    }, [sqlChartHoverIndex, activityChartModel, visibleSqlActivityPoints.length]);

    useEffect(() => {
        if (sqlChartHoverIndex === null) return;
        if (sqlChartHoverIndex <= visibleSqlActivityPoints.length - 1) return;
        setSqlChartHoverIndex(null);
    }, [sqlChartHoverIndex, visibleSqlActivityPoints.length]);

// Обработчики для поиска и пагинации пользователей

    const refreshUsers = () => {
        setUsersReloadTrigger((prev) => prev + 1);
    };

    const refreshGroups = () => {
        setGroupsReloadTrigger((prev) => prev + 1);
    };

    const refreshSchemas = () => {
        setSchemasReloadTrigger((prev) => prev + 1);
    };

    const refreshTables = () => {
        setTablesReloadTrigger((prev) => prev + 1);
    };

    const refreshViews = () => {
        setViewsReloadTrigger((prev) => prev + 1);
    };

    const refreshIndexes = () => {
        setIndexesReloadTrigger((prev) => prev + 1);
    };

    const refreshFunctions = () => {
        setFunctionsReloadTrigger((prev) => prev + 1);
    };

    const refreshProcedures = () => {
        setProceduresReloadTrigger((prev) => prev + 1);
    };

    const handleUsersSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsersSearchQuery(e.target.value);
    };

    const handleUsersSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setUsersSearchTerm(usersSearchQuery.trim());
        setUsersPage(1);
    };

    const handleUsersSearchClear = () => {
        setUsersSearchQuery('');
        setUsersSearchTerm('');
        setUsersPage(1);
    };

    const handleUsersPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalUsersPages) {
            setUsersPage(newPage);
        }
    };

    const handleUsersPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setUsersPageSize(newSize);
        setUsersPage(1);
    };

    const handleUsersFirstPage = () => {
        setUsersPage(1);
    };

    const handleUsersLastPage = () => {
        setUsersPage(totalUsersPages);
    };

    const handleGroupsSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGroupsSearchQuery(e.target.value);
    };

    const handleGroupsSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setGroupsSearchTerm(groupsSearchQuery.trim());
        setGroupsPage(1);
    };

    const handleGroupsSearchClear = () => {
        setGroupsSearchQuery('');
        setGroupsSearchTerm('');
        setGroupsPage(1);
    };

    const handleGroupsPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalGroupsPages) {
            setGroupsPage(newPage);
        }
    };

    const handleGroupsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setGroupsPageSize(newSize);
        setGroupsPage(1);
    };

    const handleGroupsFirstPage = () => {
        setGroupsPage(1);
    };

    const handleGroupsLastPage = () => {
        setGroupsPage(totalGroupsPages);
    };

    const openCreateGroupModal = () => {
        setEditingGroup(null);
        setGroupFormName('');
        setGroupFormDescription('');
        setIsCreateGroupModalOpen(true);
    };

    const openEditGroupModal = (group: { oid: number; name: string; description: string | null }) => {
        setEditingGroup(group);
        setGroupFormName(group.name);
        setGroupFormDescription(group.description || '');
        setIsCreateGroupModalOpen(true);
    };

    const closeGroupModal = () => {
        if (groupFormLoading) return;
        setIsCreateGroupModalOpen(false);
        setEditingGroup(null);
        setGroupFormName('');
        setGroupFormDescription('');
    };

    const saveGroup = async (e: React.FormEvent) => {
        e.preventDefault();

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        if (!groupFormName.trim()) {
            setError(t('groups.form.name_required'));
            return;
        }

        setGroupFormLoading(true);
        try {
            const payload = {
                name: groupFormName.trim(),
                description: groupFormDescription.trim() || null,
            };

            const url = editingGroup
                ? `${API_BASE_URL}/api/v1/db_connections/${id}/groups/${editingGroup.oid}`
                : `${API_BASE_URL}/api/v1/db_connections/${id}/groups`;
            const method = editingGroup ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось сохранить группу');
            }

            closeGroupModal();
            setGroupsPage(1);
            setGroupsReloadTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Ошибка при сохранении группы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось сохранить группу');
        } finally {
            setGroupFormLoading(false);
        }
    };

    const openGroupDeleteConfirm = (group: { oid: number; name: string }) => {
        setGroupDeleteErrorModal(null);
        setGroupDeleteTarget({oid: group.oid, name: group.name});
    };

    const closeGroupDeleteConfirm = () => {
        if (deletingGroupOid !== null) return;
        setGroupDeleteTarget(null);
    };

    const deleteGroup = async () => {
        if (!groupDeleteTarget) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            setGroupDeleteTarget(null);
            return;
        }

        setDeletingGroupOid(groupDeleteTarget.oid);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/groups/${groupDeleteTarget.oid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось удалить группу');
            }

            setGroupDeleteTarget(null);
            setGroupsReloadTrigger(prev => prev + 1);
        } catch (err) {
            console.error('Ошибка при удалении группы:', err);
            const message = err instanceof Error ? err.message : 'Не удалось удалить группу';
            setGroupDeleteErrorModal(message);
        } finally {
            setDeletingGroupOid(null);
        }
    };

    const loadGroupUsers = async (groupOid: number) => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setGroupUsersLoading(true);
        try {
            const [groupResponse, usersResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/groups/${groupOid}/get_users`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
                fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/users?page=1&size=200`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }),
            ]);

            if (!groupResponse.ok) {
                const errData = await groupResponse.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось получить список пользователей группы');
            }
            if (!usersResponse.ok) {
                const errData = await usersResponse.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось получить список пользователей');
            }

            const groupData = await groupResponse.json();
            const usersData = await usersResponse.json();

            const usersInGroup = groupData.users || [];
            setGroupUsers(usersInGroup);
            setAllUsersForGroup(usersData.items || []);
            setSelectedGroupUserOids(usersInGroup.map((user: GroupUser) => user.oid));
        } catch (err) {
            console.error('Ошибка при загрузке пользователей группы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей группы');
        } finally {
            setGroupUsersLoading(false);
        }
    };

    const openGroupUsersModal = async (group: { oid: number; name: string; user_count?: number }) => {
        setGroupUsersModal({oid: group.oid, name: group.name, userCount: groupUserCountOverrides[group.oid] ?? group.user_count ?? 0});
        setSelectedGroupUserOids([]);
        setGroupUserSearchQuery('');
        setGroupUsers([]);
        setAllUsersForGroup([]);
        await loadGroupUsers(group.oid);
    };

    const closeGroupUsersModal = () => {
        if (groupUsersSaving) return;
        setGroupUsersModal(null);
        setGroupUsers([]);
        setAllUsersForGroup([]);
        setSelectedGroupUserOids([]);
        setGroupUserSearchQuery('');
    };

    const toggleGroupUserSelection = (userOid: number) => {
        setSelectedGroupUserOids((prev) => (
            prev.includes(userOid) ? prev.filter((oid) => oid !== userOid) : [...prev, userOid]
        ));
    };

    const updateGroupUserMembership = async (userOid: number, action: 'add_user' | 'remove_user', token: string) => {
        if (!groupUsersModal) return;

        const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/groups/${groupUsersModal.oid}/${action}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({user_oid: userOid}),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const fallbackMessage = action === 'add_user'
                ? 'Не удалось добавить пользователя в группу'
                : 'Не удалось удалить пользователя из группы';
            throw new Error(errData?.detail || fallbackMessage);
        }
    };

    const saveGroupUsersSelection = async () => {
        if (!groupUsersModal) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        const previousUserOids = new Set(groupUsers.map((user) => user.oid));
        const selectedUserOidsSet = new Set(selectedGroupUserOids);
        const usersToAdd = selectedGroupUserOids.filter((userOid) => !previousUserOids.has(userOid));
        const usersToRemove = groupUsers
            .map((user) => user.oid)
            .filter((userOid) => !selectedUserOidsSet.has(userOid));

        if (usersToAdd.length === 0 && usersToRemove.length === 0) return;

        setGroupUsersSaving(true);
        try {
            await Promise.all(usersToAdd.map((userOid) => updateGroupUserMembership(userOid, 'add_user', token)));
            await Promise.all(usersToRemove.map((userOid) => updateGroupUserMembership(userOid, 'remove_user', token)));

            const updatedUsers = allUsersForGroup.filter((user) => selectedUserOidsSet.has(user.oid));
            setGroupUsers(updatedUsers);
            setGroupUserCountOverrides((prev) => ({...prev, [groupUsersModal.oid]: updatedUsers.length}));
        } catch (err) {
            console.error('Ошибка при сохранении пользователей группы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось сохранить состав группы');
        } finally {
            setGroupUsersSaving(false);
        }
    };

    const filteredUsersForGroupManagement = allUsersForGroup.filter((user) => user.name.toLowerCase().includes(groupUserSearchQuery.trim().toLowerCase()));
    const filteredTableGroupsForm = tableGroupsForm.filter((group) => group.group.toLowerCase().includes(tableGroupSearchQuery.trim().toLowerCase()));
    const filteredViewGroupsForm = viewGroupsForm.filter((group) => group.role.toLowerCase().includes(viewGroupSearchQuery.trim().toLowerCase()));

    const handleSchemasSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSchemasSearchQuery(e.target.value);
    };

    const handleSchemasSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSchemasSearchTerm(schemasSearchQuery.trim());
        setSchemasPage(1);
    };

    const handleSchemasSearchClear = () => {
        setSchemasSearchQuery('');
        setSchemasSearchTerm('');
        setSchemasPage(1);
    };

    const handleSchemasPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalSchemasPages) {
            setSchemasPage(newPage);
        }
    };

    const handleSchemasPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setSchemasPageSize(newSize);
        setSchemasPage(1);
    };

    const handleSchemasFirstPage = () => {
        setSchemasPage(1);
    };

    const handleSchemasLastPage = () => {
        setSchemasPage(totalSchemasPages);
    };

    const openSchemaEditModal = (schema: SchemaPrivilegeInfo) => {
        setEditingSchema(schema);
        setSchemaRolesForm(schema.role_privileges.map((role) => ({...role})));
    };

    const closeSchemaEditModal = () => {
        if (schemaModalLoading) return;
        setEditingSchema(null);
        setSchemaRolesForm([]);
    };

    const toggleSchemaRolePrivilege = (roleName: string, field: 'create' | 'usage') => {
        setSchemaRolesForm((prev) => prev.map((role) => (
            role.role === roleName ? {...role, [field]: !role[field]} : role
        )));
    };

    const setSchemaPrivilegeForAllRoles = (field: 'create' | 'usage') => {
        setSchemaRolesForm((prev) => {
            const allSelected = prev.length > 0 && prev.every((role) => role[field]);
            return prev.map((role) => ({...role, [field]: !allSelected}));
        });
    };

    const getSchemaPrivilegeButtonState = (field: 'create' | 'usage') => {
        const total = schemaRolesForm.length;
        const selected = schemaRolesForm.filter((role) => role[field]).length;

        if (total > 0 && selected === total) return 'all';
        if (selected > 0) return 'partial';
        return 'none';
    };

    const saveSchemaPrivileges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSchema) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setSchemaModalLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/schemas/privileges_groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schema_name: editingSchema.schema_name,
                    groups: schemaRolesForm.map((role) => ({
                        groupname: role.role,
                        create: role.create,
                        usage: role.usage,
                    })),
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось обновить привилегии схемы');
            }

            closeSchemaEditModal();
            setSchemasReloadTrigger((prev) => prev + 1);
        } catch (err) {
            console.error('Ошибка обновления привилегий схемы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось обновить привилегии схемы');
        } finally {
            setSchemaModalLoading(false);
        }
    };

    const handleTablesSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTablesSearchQuery(e.target.value);
    };

    const handleTablesSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setTablesSearchTerm(tablesSearchQuery.trim());
        setTablesPage(1);
    };

    const handleTablesSearchClear = () => {
        setTablesSearchQuery('');
        setTablesSearchTerm('');
        setTablesPage(1);
    };

    const handleTablesFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTablesFilterType(e.target.value as TablesFilterType);
        setTablesPage(1);
    };

    const handleTablesPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalTablesPages) {
            setTablesPage(newPage);
        }
    };

    const handleTablesPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setTablesPageSize(newSize);
        setTablesPage(1);
    };

    const handleTablesFirstPage = () => {
        setTablesPage(1);
    };

    const handleTablesLastPage = () => {
        setTablesPage(totalTablesPages);
    };

    const handleViewsFilterTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextFilter = e.target.value as ViewsFilterType;
        setViewsFilterType(nextFilter);

        if (nextFilter === 'views') {
            setViewsPage(1);
        } else {
            setMaterializedViewsPage(1);
        }
    };

    const handleViewsSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setViewsSearchQuery(e.target.value);
    };

    const handleViewsSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setViewsSearchTerm(viewsSearchQuery.trim());
        setViewsPage(1);
    };

    const handleViewsSearchClear = () => {
        setViewsSearchQuery('');
        setViewsSearchTerm('');
        setViewsPage(1);
    };

    const handleViewsPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= resolvedViewsPages) {
            setViewsPage(newPage);
        }
    };

    const handleViewsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setViewsPageSize(newSize);
        setViewsPage(1);
    };

    const handleViewsFirstPage = () => {
        setViewsPage(1);
    };

    const handleViewsLastPage = () => {
        setViewsPage(resolvedViewsPages);
    };

    const handleMaterializedViewsSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMaterializedViewsSearchQuery(e.target.value);
    };

    const handleMaterializedViewsSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMaterializedViewsSearchTerm(materializedViewsSearchQuery.trim());
        setMaterializedViewsPage(1);
    };

    const handleMaterializedViewsSearchClear = () => {
        setMaterializedViewsSearchQuery('');
        setMaterializedViewsSearchTerm('');
        setMaterializedViewsPage(1);
    };

    const handleMaterializedViewsPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= resolvedMaterializedViewsPages) {
            setMaterializedViewsPage(newPage);
        }
    };

    const handleMaterializedViewsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setMaterializedViewsPageSize(newSize);
        setMaterializedViewsPage(1);
    };

    const handleMaterializedViewsFirstPage = () => {
        setMaterializedViewsPage(1);
    };

    const handleMaterializedViewsLastPage = () => {
        setMaterializedViewsPage(resolvedMaterializedViewsPages);
    };

    const handleIndexesSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIndexesSearchQuery(e.target.value);
    };

    const handleIndexesSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIndexesSearchTerm(indexesSearchQuery.trim());
        setIndexesPage(1);
    };

    const handleIndexesSearchClear = () => {
        setIndexesSearchQuery('');
        setIndexesSearchTerm('');
        setIndexesPage(1);
    };

    const handleIndexesPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= resolvedIndexesPages) {
            setIndexesPage(newPage);
        }
    };

    const handleIndexesPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setIndexesPageSize(newSize);
        setIndexesPage(1);
    };

    const handleIndexesFirstPage = () => {
        setIndexesPage(1);
    };

    const handleIndexesLastPage = () => {
        setIndexesPage(resolvedIndexesPages);
    };

    const handleFunctionsSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFunctionsSearchQuery(e.target.value);
    };

    const handleFunctionsSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFunctionsSearchTerm(functionsSearchQuery.trim());
        setFunctionsPage(1);
    };

    const handleFunctionsSearchClear = () => {
        setFunctionsSearchQuery('');
        setFunctionsSearchTerm('');
        setFunctionsPage(1);
    };

    const handleFunctionsPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= resolvedFunctionsPages) {
            setFunctionsPage(newPage);
        }
    };

    const handleFunctionsPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setFunctionsPageSize(newSize);
        setFunctionsPage(1);
    };

    const handleFunctionsFirstPage = () => {
        setFunctionsPage(1);
    };

    const handleFunctionsLastPage = () => {
        setFunctionsPage(resolvedFunctionsPages);
    };

    const handleProceduresSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProceduresSearchQuery(e.target.value);
    };

    const handleProceduresSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProceduresSearchTerm(proceduresSearchQuery.trim());
        setProceduresPage(1);
    };

    const handleProceduresSearchClear = () => {
        setProceduresSearchQuery('');
        setProceduresSearchTerm('');
        setProceduresPage(1);
    };

    const handleProceduresPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= resolvedProceduresPages) {
            setProceduresPage(newPage);
        }
    };

    const handleProceduresPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setProceduresPageSize(newSize);
        setProceduresPage(1);
    };

    const handleProceduresFirstPage = () => {
        setProceduresPage(1);
    };

    const handleProceduresLastPage = () => {
        setProceduresPage(resolvedProceduresPages);
    };

    const applySqlTemplate = (template: string) => {
        setSqlQueryText(template);
        setSqlQueryError(null);
    };

    const parseApiErrorDetail = (detail: unknown, fallback = 'Не удалось выполнить SQL-запрос'): string => {
        if (typeof detail === 'string' && detail.trim()) return detail;
        if (Array.isArray(detail)) {
            const messages = detail
                .map((item) => {
                    if (typeof item === 'string') return item;
                    if (item && typeof item === 'object') {
                        const obj = item as { msg?: unknown; loc?: unknown };
                        const msg = typeof obj.msg === 'string' ? obj.msg : '';
                        const loc = Array.isArray(obj.loc) ? obj.loc.join(' -> ') : '';
                        return [loc, msg].filter(Boolean).join(': ');
                    }
                    return '';
                })
                .filter(Boolean);
            if (messages.length > 0) return messages.join('; ');
        }
        if (detail && typeof detail === 'object') {
            const candidate = (detail as { detail?: unknown; message?: unknown }).detail
                ?? (detail as { detail?: unknown; message?: unknown }).message;
            if (typeof candidate === 'string' && candidate.trim()) return candidate;
        }
        return fallback;
    };

    const normalizeTerminateProcessError = (message: string, pid: number): { title: string; message: string } => {
        const normalized = message.toLowerCase();
        if (normalized.includes('не найден') || normalized.includes('уже заверш')) {
            return {
                title: 'Предупреждение',
                message: `Процесс с PID ${pid} не найден или уже завершён. Обновите список транзакций.`,
            };
        }

        if (normalized.includes('connection is closed') || normalized.includes('соединение') && normalized.includes('закрыт')) {
            return {
                title: 'Ошибка завершения процесса',
                message: 'Соединение с базой данных закрыто. Нажмите «Обновить» и повторите попытку.',
            };
        }

        return {
            title: 'Ошибка завершения процесса',
            message,
        };
    };

    const refreshActiveTransactions = () => {
        setError(null);
        setTerminateProcessModal(null);
        setActiveSqlReloadTrigger((prev) => prev + 1);
    };

    const refreshMonitoringSessionActivity = () => {
        setSessionActivityReloadTrigger((prev) => prev + 1);
    };

    const refreshMonitoringSqlActivity = () => {
        setActivityChartReloadTrigger((prev) => prev + 1);
    };

    const handleActiveSqlFilterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setActiveSqlUsername(activeSqlUsernameQuery.trim());
        setActiveSqlPage(1);
    };

    const handleActiveSqlFilterClear = () => {
        setActiveSqlUsernameQuery('');
        setActiveSqlUsername('');
        setActiveSqlMinDuration('');
        setActiveSqlMaxDuration('');
        setActiveSqlPage(1);
    };

    const handleActiveSqlPageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalActiveQueriesPages) {
            setActiveSqlPage(newPage);
        }
    };

    const handleActiveSqlPageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value, 10);
        setActiveSqlPageSize(newSize);
        setActiveSqlPage(1);
    };

    const terminateActiveSqlQuery = async (pid: number) => {
        if (!id) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setTerminatingPid(pid);
        setError(null);
        setTerminateProcessModal(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/active_connections`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({pid}),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(parseApiErrorDetail((errData as { detail?: unknown }).detail ?? errData, 'Не удалось завершить активный SQL-запрос'));
            }

            setActiveSqlReloadTrigger((prev) => prev + 1);
        } catch (err) {
            console.error('Ошибка завершения активного SQL-запроса:', err);
            const errorMessage = err instanceof Error ? err.message : 'Не удалось завершить активный SQL-запрос';
            setTerminateProcessModal(normalizeTerminateProcessError(errorMessage, pid));
        } finally {
            setTerminatingPid(null);
        }
    };

    const executeSqlQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        const queryToExecute = sqlQueryText.trim();
        if (!queryToExecute) {
            setSqlQueryError('Введите SQL-запрос перед выполнением.');
            setSqlQueryColumns([]);
            setSqlQueryRows([]);
            setSqlQueryTruncated(false);
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setSqlQueryLoading(true);
        setSqlQueryError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: queryToExecute,
                    limit: sqlQueryLimit,
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(parseApiErrorDetail((errData as { detail?: unknown }).detail ?? errData));
            }

            const data = await response.json();
            setSqlQueryColumns(Array.isArray(data.columns) ? data.columns : []);
            setSqlQueryRows(Array.isArray(data.rows) ? data.rows : []);
            setSqlQueryTruncated(Boolean(data.truncated));
        } catch (err) {
            console.error('Ошибка выполнения SQL-запроса:', err);
            setSqlQueryError(err instanceof Error ? err.message : 'Не удалось выполнить SQL-запрос');
            setSqlQueryColumns([]);
            setSqlQueryRows([]);
            setSqlQueryTruncated(false);
        } finally {
            setSqlQueryLoading(false);
        }
    };

    const openTableEditModal = (table: TablePrivilegeInfo) => {
        setEditingTable(table);
        setTableGroupsForm(table.group_privileges.map((group) => ({...group})));
        setTableGroupSearchQuery('');
    };

    const closeTableEditModal = () => {
        if (tableModalLoading) return;
        setEditingTable(null);
        setTableGroupsForm([]);
        setTableGroupSearchQuery('');
    };

    const toggleTableGroupPrivilege = (
        groupName: string,
        field: 'select' | 'insert' | 'update' | 'delete' | 'truncate',
    ) => {
        setTableGroupsForm((prev) => prev.map((group) => (
            group.group === groupName ? {...group, [field]: !group[field]} : group
        )));
    };

    const setTablePrivilegeForAllGroups = (
        field: 'select' | 'insert' | 'update' | 'delete' | 'truncate',
    ) => {
        setTableGroupsForm((prev) => {
            const allSelected = prev.length > 0 && prev.every((group) => group[field]);
            return prev.map((group) => ({...group, [field]: !allSelected}));
        });
    };

    const getTablePrivilegeButtonState = (
        field: 'select' | 'insert' | 'update' | 'delete' | 'truncate',
    ) => {
        const total = tableGroupsForm.length;
        const selected = tableGroupsForm.filter((group) => group[field]).length;

        if (total > 0 && selected === total) {
            return 'all';
        }
        if (selected > 0) {
            return 'partial';
        }
        return 'none';
    };

    const saveTablePrivileges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTable) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setTableModalLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/tables/privileges_groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schema_name: editingTable.schema_name,
                    table_name: editingTable.table_name,
                    groups: tableGroupsForm.map((group) => ({
                        groupname: group.group,
                        select: group.select,
                        insert: group.insert,
                        update: group.update,
                        delete: group.delete,
                        truncate: group.truncate,
                    })),
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось обновить привилегии таблицы');
            }

            closeTableEditModal();
            setTablesReloadTrigger((prev) => prev + 1);
        } catch (err) {
            console.error('Ошибка обновления привилегий таблицы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось обновить привилегии таблицы');
        } finally {
            setTableModalLoading(false);
        }
    };

    const openViewEditModal = (view: ViewPrivilegeInfo, kind: ViewsFilterType) => {
        setEditingView(view);
        setViewGroupsForm(view.role_privileges.map((role) => ({ ...role })));
        setViewGroupSearchQuery('');
        setViewsFilterType(kind);
    };

    const closeViewEditModal = () => {
        if (viewModalLoading) return;
        setEditingView(null);
        setViewGroupsForm([]);
        setViewGroupSearchQuery('');
    };

    const toggleViewGroupPrivilege = (roleName: string, field: 'create' | 'usage') => {
        setViewGroupsForm((prev) => prev.map((group) => (
            group.role === roleName ? { ...group, [field]: !group[field] } : group
        )));
    };

    const setViewPrivilegeForAllGroups = (field: 'create' | 'usage') => {
        setViewGroupsForm((prev) => {
            const allSelected = prev.length > 0 && prev.every((group) => group[field]);
            return prev.map((group) => ({ ...group, [field]: !allSelected }));
        });
    };

    const getViewPrivilegeButtonState = (field: 'create' | 'usage') => {
        const total = viewGroupsForm.length;
        const selected = viewGroupsForm.filter((group) => group[field]).length;

        if (total > 0 && selected === total) return 'all';
        if (selected > 0) return 'partial';
        return 'none';
    };

    const saveViewPrivileges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingView) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setViewModalLoading(true);
        try {
            const endpoint = viewsFilterType === 'materialized_views'
                ? 'views/materialized/privileges_groups'
                : 'views/privileges_groups';

            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    schema_name: editingView.schema_name,
                    view_name: editingView.view_name,
                    groups: viewGroupsForm.map((group) => ({
                        groupname: group.role,
                        create: group.create,
                        usage: group.usage,
                    })),
                }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось обновить привилегии представления');
            }

            closeViewEditModal();
            setViewsReloadTrigger((prev) => prev + 1);
        } catch (err) {
            console.error('Ошибка обновления привилегий представления:', err);
            setError(err instanceof Error ? err.message : 'Не удалось обновить привилегии представления');
        } finally {
            setViewModalLoading(false);
        }
    };

// Функция для получения бейджа окружения
    const getEnvironmentBadge = (env: string) => {
        const envLower = env.toLowerCase();
        let colorClass = '';
        let label = env;
        switch (envLower) {
            case 'production':
                colorClass = styles.badge_production;
                label = 'ПРОДАКШЕН';
                break;
            case 'testing':
                colorClass = styles.badge_testing;
                label = 'ТЕСТИРОВАНИЕ';
                break;
            case 'analytics':
                colorClass = styles.badge_analytics;
                label = 'АНАЛИТИКА';
                break;
            case 'development':
            default:
                colorClass = styles.badge_development;
                label = 'РАЗРАБОТКА';
                break;
        }
        return (
            <span className={clsx(styles.badge, colorClass)}>
{label}
</span>
        );
    };

    const getStatusIndicatorClass = (status: string) => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'connected') return styles.statusIndicator_connected;
        if (statusLower === 'error') return styles.statusIndicator_error;
        return styles.statusIndicator_unknown;
    };

// Форматирование времени работы
    const openDeleteConfirm = (connectionId: number, connectionName: string) => {
        setConfirmDeleteId(connectionId);
        setConfirmDeleteName(connectionName);
    };

    const closeDeleteConfirm = () => {
        setConfirmDeleteId(null);
        setConfirmDeleteName('');
    };

    const deleteConnection = async () => {
        if (!confirmDeleteId) return;
        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            closeDeleteConfirm();
            return;
        }
        setDeletingId(confirmDeleteId);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${confirmDeleteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось удалить подключение');
            }
            navigate('/connections');
        } catch (err) {
            console.error('Ошибка при удалении подключения:', err);
            setError(err instanceof Error ? err.message : 'Не удалось удалить подключение');
            closeDeleteConfirm();
        } finally {
            setDeletingId(null);
        }
    };

    const openEditModal = () => {
        if (connection) {
            setEditingConnection(connection);
            setIsEditModalOpen(true);
        }
    };

    const downloadConnectionSettings = async () => {
        if (!id || !connection) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/settings`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось получить настройки базы данных');
            }

            const data = await response.json();
            const fileContent = JSON.stringify(data, null, 2);
            const blob = new Blob([fileContent], {type: 'application/json;charset=utf-8'});
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeName = (connection.name || `connection_${id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            link.href = url;
            link.download = `${safeName}_settings.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Ошибка скачивания настроек:', err);
            setError(err instanceof Error ? err.message : 'Не удалось скачать настройки');
        }
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingConnection(null);
    };

    const handleEditSuccess = () => {
        closeEditModal();
        loadConnection();
    };

// Открытие модального окна редактирования пользователя
    const openEditUserModal = (user: EditingUser) => {
        setEditingUser(user);
        setIsEditUserModalOpen(true);
    };

// Закрытие модального окна редактирования пользователя
    const closeEditUserModal = () => {
        setIsEditUserModalOpen(false);
        setEditingUser(null);
    };

// Обработчик успешного редактирования пользователя
    const handleEditUserSuccess = () => {
        closeEditUserModal();
// Перезагружаем список пользователей
        setUsersPage(1);
        setUsersSearchTerm('');
        setUsersReloadTrigger(prev => prev + 1);
    };


    const formatDeleteUserError = (detail: unknown): string => {
        if (typeof detail === 'string' && detail.trim().length > 0) {
            return detail.trim();
        }

        if (Array.isArray(detail)) {
            const parts = detail
                .map((item) => {
                    if (typeof item === 'string') return item.trim();
                    if (item && typeof item === 'object' && 'msg' in item) {
                        const msg = (item as { msg?: unknown }).msg;
                        return typeof msg === 'string' ? msg.trim() : '';
                    }
                    return '';
                })
                .filter(Boolean);

            if (parts.length > 0) {
                return parts.join('\n');
            }
        }

        if (detail && typeof detail === 'object') {
            const maybeDetail = (detail as { detail?: unknown }).detail;
            if (maybeDetail !== undefined) {
                return formatDeleteUserError(maybeDetail);
            }
        }

        return 'Не удалось удалить пользователя';
    };

    const openUserDeleteConfirm = (user: { oid: number; name: string }) => {
        setUserDeleteTarget({oid: user.oid, name: user.name});
        setUserDeleteError(null);
    };

    const closeUserDeleteConfirm = () => {
        if (deletingUserOid !== null) return;
        setUserDeleteTarget(null);
        setUserDeleteError(null);
    };

    const deleteUser = async () => {
        if (!userDeleteTarget) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            setUserDeleteTarget(null);
            return;
        }

        setDeletingUserOid(userDeleteTarget.oid);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/users/${userDeleteTarget.oid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(formatDeleteUserError(errData));
            }

            setUserDeleteError(null);
            setUserDeleteTarget(null);
            setUsersReloadTrigger(prev => prev + 1);
            if (editingUser?.oid === userDeleteTarget.oid) {
                closeEditUserModal();
            }
        } catch (err) {
            console.error('Ошибка при удалении пользователя:', err);
            setUserDeleteError(err instanceof Error ? err.message : 'Не удалось удалить пользователя');
        } finally {
            setDeletingUserOid(null);
        }
    };

    if (loading) {
        return (
            <section className={clsx(styles.connectionDetail)}>
                <div className="container">
                    <div className={clsx(styles.connectionDetail__section)}>
                        <div className={clsx(styles.connectionDetail__loading)}>
                            <div className={clsx(styles.spinner)}>
                                <FontAwesomeIcon icon={faSpinner} spin size="3x"/>
                            </div>
                            <p>Загрузка подключения...</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (error || !connection) {
        return (
            <section className={clsx(styles.connectionDetail)}>
                <div className="container">
                    <div className={clsx(styles.connectionDetail__section)}>
                        <div className={clsx(styles.connectionDetail__error)}>
                            <FontAwesomeIcon icon={faExclamationCircle} size="3x"/>
                            <p>{error || 'Подключение не найдено'}</p>
                            <button
                                className={clsx(styles.retryButton)}
                                onClick={() => navigate('/connections')}
                            >
                                Вернуться к списку
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    const getMetricValue = (metricKey: string, defaultValue: string = '—') => {
        if (!metrics) return defaultValue;
        const metric = metrics.basic_metrics.find(m => m.metric === metricKey);
        return metric ? metric.value : defaultValue;
    };

    return (
        <section className={clsx(styles.connectionDetail)}>
            <div className="container">
                <div className={clsx(styles.connectionDetail__section)}>
                    <div className={clsx(styles.connectionCard)}>
                        <div className={clsx(styles.cardHeader)}>
                            <div className={clsx(styles.cardIconContainer)}>
                                <FontAwesomeIcon
                                    icon={faDatabase}
                                    className={clsx(styles.cardIcon)}
                                />
                                <div
                                    className={clsx(
                                        styles.statusIndicator,
                                        getStatusIndicatorClass(connection.status)
                                    )}
                                    title={connection.status}
                                ></div>
                            </div>
                            <div className={clsx(styles.cardHeaderContent)}>
                                <div className={clsx(styles.cardTitle)}>
                                    {connection.database_type.toUpperCase()}
                                    {getEnvironmentBadge(connection.environment)}
                                </div>
                                <div className={clsx(styles.cardName)}>
                                    {connection.name || 'Без имени'}
                                </div>
                                <div
                                    className={clsx(styles.cardDescription)}
                                    title={connection.description || ''}
                                >
                                    {connection.description
                                        ? (connection.description.length > 50
                                            ? connection.description.slice(0, 50) + '...'
                                            : connection.description)
                                        : ''}
                                </div>
                            </div>
                            {visibleTabs.metrics && activeTab === 'metrics' && (
                                <div className={clsx(styles.cardHeaderActions)}>
                                    <button
                                        className={clsx(styles.actionButton, styles.actionButton_primary)}
                                        onClick={downloadConnectionSettings}
                                        title="Скачать настройки"
                                        disabled={deletingId === connection.id}
                                    >
                                        Скачать настройки
                                    </button>
                                    <button
                                        className={clsx(styles.actionButton, styles.actionButton_primary)}
                                        onClick={openEditModal}
                                        title="Редактировать подключение"
                                        disabled={deletingId === connection.id}
                                    >
                                        Редактировать
                                    </button>
                                    <button
                                        className={clsx(styles.actionButton, styles.actionButton_delete)}
                                        onClick={() => openDeleteConfirm(connection.id, connection.name || 'Без имени')}
                                        title="Удалить подключение"
                                        disabled={deletingId !== null}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            )}
                        </div>
                        <DetailTabNavigation
                            activeTab={activeTab}
                            setActiveTab={handleTabChange}
                            setUsersSearchQuery={setUsersSearchQuery}
                            setUsersSearchTerm={setUsersSearchTerm}
                            setUsersPage={setUsersPage}
                            setGroupsSearchQuery={setGroupsSearchQuery}
                            setGroupsSearchTerm={setGroupsSearchTerm}
                            setGroupsPage={setGroupsPage}
                            setSchemasSearchQuery={setSchemasSearchQuery}
                            setSchemasSearchTerm={setSchemasSearchTerm}
                            setSchemasPage={setSchemasPage}
                            setTablesSearchQuery={setTablesSearchQuery}
                            setTablesSearchTerm={setTablesSearchTerm}
                            setTablesPage={setTablesPage}
                            setViewsSearchQuery={setViewsSearchQuery}
                            setViewsSearchTerm={setViewsSearchTerm}
                            setViewsPage={setViewsPage}
                            setIndexesSearchQuery={setIndexesSearchQuery}
                            setIndexesSearchTerm={setIndexesSearchTerm}
                            setIndexesPage={setIndexesPage}
                            setFunctionsSearchQuery={setFunctionsSearchQuery}
                            setFunctionsSearchTerm={setFunctionsSearchTerm}
                            setFunctionsPage={setFunctionsPage}
                            setProceduresSearchQuery={setProceduresSearchQuery}
                            setProceduresSearchTerm={setProceduresSearchTerm}
                            setProceduresPage={setProceduresPage}
                            setActiveSqlPage={setActiveSqlPage}
                            setSqlQueryError={setSqlQueryError}
                            visibleTabs={visibleTabs}
                        />
                        <div className={clsx(styles.tabContent)}>
                            {connectionTabsSettingsModel.getVisibleTabs(visibleTabs).length === 0 && (
                                <div className={clsx(styles.usersEmpty)}>
                                    <FontAwesomeIcon icon={faInfoCircle} size="2x"/>
                                    <p>Все вкладки скрыты. Включите нужные вкладки в разделе «Настройки».</p>
                                </div>
                            )}
                            {visibleTabs.metrics && activeTab === 'metrics' && (
                                <div className={clsx(styles.metricsContent)}>
                                    {loadingMetrics ? (
                                        <div className={clsx(styles.metricsLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>Загрузка информации...</p>
                                        </div>
                                    ) : metrics && metrics.basic_metrics.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.metricsGrid)}>
                                                {/* Общая информация */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faDatabase} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Общая информация</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>База данных:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.database_name || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Хост:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.host || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Порт:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.port || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Пользователь:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{connection.username || '—'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер базы данных:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('db_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Версия СУБД:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('server_version', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Кодировка:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('client_encoding', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Авто очистка:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('autovacuum', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Логирование:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('log_statement_stats', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Коллация:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('database_collation', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Буфер:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('shared_buffers', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Рабочая память:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('work_mem', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Временная зона:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('TimeZone', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Время работы:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{formatUptime(getMetricValue('server_uptime', '—'))}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Начало работы:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{formatStartTime(getMetricValue('server_start_time', '—'))}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Дата создания подключения:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{formatDateTime(connection.created_at)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Структура базы */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faTable} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Структура базы</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('table_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('table_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество временных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('temp_table_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер временных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('temp_table_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество системных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('system_table_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер системных таблиц:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('system_table_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество индексов:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('index_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Размер индексов:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('index_size', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество представлений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('view_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Материализованных представлений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('materialized_view_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Хранимых процедур:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('procedure_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Триггеров:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('trigger_count', '—')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Пользователи и группы */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faUserGroup} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Пользователи и группы</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Всего пользователей:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('total_users', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Всего суперпользователей:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('superuser_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Активных пользователей:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('active_users', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество групп:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('role_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Количество системных групп:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('pg_role_count', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Максимальное кол-во подключений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('max_connections', '—')}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Текущих подключений:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{getMetricValue('current_connections', '—')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faCogs} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Расширения</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        {metrics.extensions.length > 0 ? (
                                                            metrics.extensions.map((ext, index) => (
                                                                <div key={`${ext.name}-${index}`} className={clsx(styles.metricsCardRow)}>
                                                                    <div className={clsx(styles.metricsCardLabel)}>{ext.name}</div>
                                                                    <div className={clsx(styles.metricsCardValue)}>{ext.version}</div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className={clsx(styles.metricsCardRow)}>
                                                                <div className={clsx(styles.metricsCardLabel)}>Расширения</div>
                                                                <div className={clsx(styles.metricsCardValue)}>Не найдены</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Кластеризация и репликация */}
                                                <div className={clsx(styles.metricsCard)}>
                                                    <div className={clsx(styles.metricsCardHeader)}>
                                                        <FontAwesomeIcon icon={faNetworkWired} className={clsx(styles.metricsCardIcon)}/>
                                                        <h3 className={clsx(styles.metricsCardTitle)}>Кластеризация и репликация</h3>
                                                    </div>
                                                    <div className={clsx(styles.metricsCardContent)}>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Статус репликации:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{metrics.cluster_replication.length > 0 ? 'Поддерживается' : 'Не поддерживается'}</div>
                                                        </div>
                                                        <div className={clsx(styles.metricsCardRow)}>
                                                            <div className={clsx(styles.metricsCardLabel)}>Задержка репликации:</div>
                                                            <div className={clsx(styles.metricsCardValue)}>{metrics.cluster_replication.length > 0 ? metrics.cluster_replication[0].replication_lag : '—'}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>


                                                                                    </>
                                    ) : (
                                        <div className={clsx(styles.metricsEmpty)}>
                                            <FontAwesomeIcon icon={faInfoCircle} size="3x"/>
                                            <p>Информация недоступна</p>
                                            {error && <p className={clsx(styles.errorMessage)}>{error}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.users && activeTab === 'users' && (
                                <div className={clsx(styles.usersContent)}>
                                    {/* Панель поиска */}
                                    <div className={clsx(styles.usersHeader)}>
                                        <form
                                            onSubmit={handleUsersSearchSubmit}
                                            className={clsx(styles.usersSearchContainer)}
                                        >
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.users')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {totalUsers}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск пользователей"
                                                    value={usersSearchQuery}
                                                    onChange={handleUsersSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {usersSearchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={handleUsersSearchClear}
                                                        className={clsx(styles.usersSearchClear)}
                                                        title="Очистить поиск"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button
                                                type="submit"
                                                className={clsx(styles.usersSearchButton)}
                                                title="Найти"
                                            >
                                                Поиск
                                            </button>
                                        </form>
                                        <button
                                            className={clsx(styles.createUserButton)}
                                            onClick={openCreateUserModal}
                                            aria-label="Создать нового пользователя"
                                        >
                                            Создать пользователя
                                        </button>
                                        <button
                                            type="button"
                                            className={clsx(styles.refreshButton)}
                                            onClick={refreshUsers}
                                            disabled={loadingUsers}
                                            aria-label="Обновить список пользователей"
                                            title="Обновить список пользователей"
                                        >
                                            <FontAwesomeIcon icon={faArrowsRotate} spin={loadingUsers}/>
                                        </button>
                                    </div>
                                    {loadingUsers ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>Загрузка пользователей...</p>
                                        </div>
                                    ) : users && users.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {users.map((user) => (
                                                    <div key={user.oid} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{user.name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.usersMetaGrid)}>
                                                                    <div className={clsx(styles.userItemInfo, styles.usersMetaCell)}>
                                                                        <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned, styles.usersMetaTableLabel)}>Описание:</span>
                                                                        <span
                                                                            className={clsx(styles.userItemInfoValue, styles.usersMetaTableValue, styles.usersMetaDescriptionValue)}
                                                                            title={user.description || '—'}
                                                                        >
                                                                            {user.description || '—'}
                                                                        </span>
                                                                    </div>
                                                                    <div className={clsx(styles.userItemInfo, styles.usersMetaCell)}>
                                                                        <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned, styles.usersMetaTableLabel)}>Email:</span>
                                                                        <span
                                                                            className={clsx(styles.userItemInfoValue, styles.usersMetaTableValue, styles.usersMetaEmailValue)}
                                                                            title={user.email || '—'}
                                                                        >
                                                                            {user.email || '—'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className={clsx(styles.userActions)}>
                                                                    <button
                                                                        className={clsx(styles.userActionButton)}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openEditUserModal(user);
                                                                        }}
                                                                        title={`Редактировать ${user.name}`}
                                                                        aria-label={`Редактировать пользователя ${user.name}`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faPencilAlt}/>
                                                                    </button>
                                                                    <button
                                                                        className={clsx(styles.userActionButton, styles.userActionButton_delete)}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openUserDeleteConfirm(user);
                                                                        }}
                                                                        title={`Удалить ${user.name}`}
                                                                        aria-label={`Удалить пользователя ${user.name}`}
                                                                        disabled={deletingUserOid === user.oid}
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrashAlt}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>


                                            {/* Пагинация */}
                                            {totalUsers > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('users.shown')} <span className={clsx(styles.paginationHighlight)}>{((usersPage - 1) * usersPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(usersPage * usersPageSize, totalUsers)}</span> {t('users.of')} <span className={clsx(styles.paginationHighlight)}>{totalUsers}</span> {t('users.users')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select
                                                            value={usersPageSize}
                                                            onChange={handleUsersPageSizeChange}
                                                            className={clsx(styles.paginationSelect)}
                                                        >
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>
                                                                    {size} {t('users.per_page')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleUsersFirstPage}
                                                                disabled={usersPage === 1 || !usersHasPrev}
                                                                title={t('users.page.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleUsersPageChange(usersPage - 1)}
                                                                disabled={usersPage === 1 || !usersHasPrev}
                                                                title={t('users.page.prev')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
<span className={clsx(styles.pageInfo)}>
{t('users.page.label')} {usersPage} {t('users.of')} {totalUsersPages}
</span>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleUsersPageChange(usersPage + 1)}
                                                                disabled={usersPage === totalUsersPages || !usersHasNext}
                                                                title={t('users.page.next')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleUsersLastPage}
                                                                disabled={usersPage === totalUsersPages || !usersHasNext}
                                                                title={t('users.page.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faUsers} size="3x"/>
                                            <p>Пользователи не найдены</p>
                                            {usersError && <p className={clsx(styles.errorMessage)}>{usersError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.groups && activeTab === 'groups' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleGroupsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.groups')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {totalGroups}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('groups.search')}
                                                    value={groupsSearchQuery}
                                                    onChange={handleGroupsSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {groupsSearchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={handleGroupsSearchClear}
                                                        className={clsx(styles.usersSearchClear)}
                                                        title={t('groups.search_clear')}
                                                    >
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title={t('groups.search')}>
                                                {t('groups.search')}
                                            </button>
                                        </form>
                                        <button
                                            className={clsx(styles.createUserButton)}
                                            onClick={openCreateGroupModal}
                                            aria-label={t('groups.create.new')}
                                        >
                                            {t('groups.create.button')}
                                        </button>
                                        <button
                                            type="button"
                                            className={clsx(styles.refreshButton)}
                                            onClick={refreshGroups}
                                            disabled={loadingGroups}
                                            aria-label={t('groups.refresh')}
                                            title={t('groups.refresh')}
                                        >
                                            <FontAwesomeIcon icon={faArrowsRotate} spin={loadingGroups}/>
                                        </button>
                                    </div>

                                    {loadingGroups ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('groups.loading')}</p>
                                        </div>
                                    ) : groups && groups.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {groups.map((group) => (
                                                    <div key={group.oid} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{group.name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>{t('groups.users_count')}</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{groupUserCountOverrides[group.oid] ?? group.user_count}</span>
                                                                </div>
                                                                {group.description && (
                                                                    <div className={clsx(styles.userItemInfo)}>
                                                                        <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>{t('groups.description_label')}</span>
                                                                        <span className={clsx(styles.userItemInfoValue)}>{group.description}</span>
                                                                    </div>
                                                                )}
                                                                <div className={clsx(styles.userActions)}>
                                                                    <button
                                                                        className={clsx(styles.userActionButton)}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openGroupUsersModal(group);
                                                                        }}
                                                                        title={`Управление пользователями ${group.name}`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faUserPlus}/>
                                                                    </button>
                                                                    <button
                                                                        className={clsx(styles.userActionButton)}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openEditGroupModal(group);
                                                                        }}
                                                                        title={`Редактировать ${group.name}`}
                                                                    >
                                                                        <FontAwesomeIcon icon={faPencilAlt}/>
                                                                    </button>
                                                                    <button
                                                                        className={clsx(styles.userActionButton, styles.userActionButton_delete)}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            openGroupDeleteConfirm(group);
                                                                        }}
                                                                        title={`Удалить ${group.name}`}
                                                                        disabled={deletingGroupOid === group.oid}
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrashAlt}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {totalGroups > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('groups.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((groupsPage - 1) * groupsPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(groupsPage * groupsPageSize, totalGroups)}</span> {t('groups.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{totalGroups}</span> {t('groups.pagination.groups')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={groupsPageSize} onChange={handleGroupsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('groups.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleGroupsFirstPage}
                                                                disabled={groupsPage === 1 || !groupsHasPrev}
                                                                title={t('groups.pagination.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleGroupsPageChange(groupsPage - 1)} disabled={groupsPage === 1 || !groupsHasPrev} title={t('groups.pagination.prev')}>
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('groups.pagination.page')} {groupsPage} {t('groups.pagination.of')} {totalGroupsPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleGroupsPageChange(groupsPage + 1)} disabled={groupsPage === totalGroupsPages || !groupsHasNext} title={t('groups.pagination.next')}>
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleGroupsLastPage}
                                                                disabled={groupsPage === totalGroupsPages || !groupsHasNext}
                                                                title={t('groups.pagination.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faLayerGroup} size="3x"/>
                                            <p>{t('groups.not_found')}</p>
                                            {groupsError && <p className={clsx(styles.errorMessage)}>{groupsError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.schemas && activeTab === 'schemas' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleSchemasSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.schemas')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {totalSchemas}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('schemas.search')}
                                                    value={schemasSearchQuery}
                                                    onChange={handleSchemasSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {schemasSearchQuery && (
                                                    <button type="button" onClick={handleSchemasSearchClear} className={clsx(styles.usersSearchClear)} title={t('schemas.search_clear')}>
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title={t('schemas.search')}>{t('schemas.search')}</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshSchemas}
                                                disabled={loadingSchemas}
                                                aria-label={t('schemas.refresh')}
                                                title={t('schemas.refresh')}
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingSchemas}/>
                                            </button>
                                        </form>
                                    </div>

                                    {loadingSchemas ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('schemas.loading')}</p>
                                        </div>
                                    ) : schemas && schemas.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {schemas.map((schema) => (
                                                    <div key={schema.schema_name} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{schema.schema_name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>{t('schemas.owner')}</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{schema.owner}</span>
                                                                </div>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>{t('schemas.roles')}</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{schema.role_privileges.length}</span>
                                                                </div>
                                                                <div className={clsx(styles.userActions)}>
                                                                    <button className={clsx(styles.userActionButton)} onClick={() => openSchemaEditModal(schema)} title={`Изменить права для ${schema.schema_name}`}>
                                                                        <FontAwesomeIcon icon={faPencilAlt}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {totalSchemas > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('schemas.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((schemasPage - 1) * schemasPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(schemasPage * schemasPageSize, totalSchemas)}</span> {t('schemas.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{totalSchemas}</span> {t('schemas.pagination.schemas')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={schemasPageSize} onChange={handleSchemasPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('schemas.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleSchemasFirstPage}
                                                                disabled={schemasPage === 1 || !schemasHasPrev}
                                                                title={t('schemas.pagination.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleSchemasPageChange(schemasPage - 1)} disabled={schemasPage === 1 || !schemasHasPrev} title={t('schemas.pagination.prev')}>
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('schemas.pagination.page')} {schemasPage} {t('schemas.pagination.of')} {totalSchemasPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleSchemasPageChange(schemasPage + 1)} disabled={schemasPage === totalSchemasPages || !schemasHasNext} title={t('schemas.pagination.next')}>
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleSchemasLastPage}
                                                                disabled={schemasPage === totalSchemasPages || !schemasHasNext}
                                                                title={t('schemas.pagination.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faSitemap} size="3x"/>
                                            <p>Схемы не найдены</p>
                                            {schemasError && <p className={clsx(styles.errorMessage)}>{schemasError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.tables && activeTab === 'tables' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleTablesSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.tables')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {totalTables}
                                                </span>
                                            </div>
                                            <select value={tablesFilterType} onChange={handleTablesFilterTypeChange} className={clsx(styles.usersFilterSelect)}>
                                                <option value="regular">{t('tables.filter.regular')}</option>
                                                <option value="temporary">{t('tables.filter.temporary')}</option>
                                                <option value="all">{t('tables.filter.all')}</option>
                                            </select>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('tables.search')}
                                                    value={tablesSearchQuery}
                                                    onChange={handleTablesSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {tablesSearchQuery && (
                                                    <button type="button" onClick={handleTablesSearchClear} className={clsx(styles.usersSearchClear)} title={t('tables.search_clear')}>
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title={t('tables.search')}>{t('tables.search')}</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshTables}
                                                disabled={loadingTables}
                                                aria-label={t('tables.refresh')}
                                                title={t('tables.refresh')}
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingTables}/>
                                            </button>
                                        </form>
                                    </div>

                                    {loadingTables ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('tables.loading')}</p>
                                        </div>
                                    ) : tables && tables.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {tables.map((table) => (
                                                    <div key={`${table.schema_name}.${table.table_name}`} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{table.schema_name}.{table.table_name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>{t('tables.owner')}</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{table.owner}</span>
                                                                </div>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>{t('tables.groups')}</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{table.group_privileges.length}</span>
                                                                </div>
                                                                <div className={clsx(styles.userActions)}>
                                                                    <button className={clsx(styles.userActionButton)} onClick={() => openTableEditModal(table)} title={`Изменить права для ${table.table_name}`}>
                                                                        <FontAwesomeIcon icon={faPencilAlt}/>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {totalTables > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('tables.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((tablesPage - 1) * tablesPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(tablesPage * tablesPageSize, totalTables)}</span> {t('tables.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{totalTables}</span> {t('tables.pagination.tables')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={tablesPageSize} onChange={handleTablesPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('tables.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleTablesFirstPage}
                                                                disabled={tablesPage === 1 || !tablesHasPrev}
                                                                title={t('tables.pagination.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleTablesPageChange(tablesPage - 1)} disabled={tablesPage === 1 || !tablesHasPrev} title={t('tables.pagination.prev')}>
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('tables.pagination.page')} {tablesPage} {t('tables.pagination.of')} {totalTablesPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleTablesPageChange(tablesPage + 1)} disabled={tablesPage === totalTablesPages || !tablesHasNext} title={t('tables.pagination.next')}>
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleTablesLastPage}
                                                                disabled={tablesPage === totalTablesPages || !tablesHasNext}
                                                                title={t('tables.pagination.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faTableList} size="3x"/>
                                            <p>{t('tables.not_found')}</p>
                                            {tablesError && <p className={clsx(styles.errorMessage)}>{tablesError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.views && activeTab === 'views' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        {viewsFilterType === 'views' ? (
                                            <form onSubmit={handleViewsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                                <div className={clsx(styles.usersSearchTitle)}>
                                                    {t('tabs.views')}
                                                    <span className={clsx(styles.usersCountBadge)}>
                                                        {resolvedViewsTotal}
                                                    </span>
                                                </div>
                                                <select value={viewsFilterType} onChange={handleViewsFilterTypeChange} className={clsx(styles.usersFilterSelect)}>
                                                    <option value="views">{t('views.filter.views')}</option>
                                                    <option value="materialized_views">{t('views.filter.materialized')}</option>
                                                </select>
                                                <div className={clsx(styles.usersSearchWrapper)}>
                                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                    <input
                                                        type="text"
                                                        placeholder={t('views.search')}
                                                        value={viewsSearchQuery}
                                                        onChange={handleViewsSearchInputChange}
                                                        className={clsx(styles.usersSearchInput)}
                                                    />
                                                    {viewsSearchQuery && (
                                                        <button type="button" onClick={handleViewsSearchClear} className={clsx(styles.usersSearchClear)} title={t('views.search_clear')}>
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                        </button>
                                                    )}
                                                </div>
                                                <button type="submit" className={clsx(styles.usersSearchButton)} title={t('views.search')}>{t('views.search')}</button>
                                                <button
                                                    type="button"
                                                    className={clsx(styles.refreshButton)}
                                                    onClick={refreshViews}
                                                    disabled={loadingViews || loadingMaterializedViews}
                                                    aria-label={t('views.refresh')}
                                                    title={t('views.refresh')}
                                                >
                                                    <FontAwesomeIcon icon={faArrowsRotate} spin={loadingViews || loadingMaterializedViews}/>
                                                </button>
                                            </form>
                                        ) : (
                                            <form onSubmit={handleMaterializedViewsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                                <div className={clsx(styles.usersSearchTitle)}>
                                                    {t('tabs.views')}
                                                    <span className={clsx(styles.usersCountBadge)}>
                                                        {resolvedMaterializedViewsTotal}
                                                    </span>
                                                </div>
                                                <select value={viewsFilterType} onChange={handleViewsFilterTypeChange} className={clsx(styles.usersFilterSelect)}>
                                                    <option value="views">{t('views.filter.views')}</option>
                                                    <option value="materialized_views">{t('views.filter.materialized')}</option>
                                                </select>
                                                <div className={clsx(styles.usersSearchWrapper)}>
                                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                    <input
                                                        type="text"
                                                        placeholder={t('views.search_materialized')}
                                                        value={materializedViewsSearchQuery}
                                                        onChange={handleMaterializedViewsSearchInputChange}
                                                        className={clsx(styles.usersSearchInput)}
                                                    />
                                                    {materializedViewsSearchQuery && (
                                                        <button type="button" onClick={handleMaterializedViewsSearchClear} className={clsx(styles.usersSearchClear)} title={t('views.search_clear')}>
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                        </button>
                                                    )}
                                                </div>
                                                <button type="submit" className={clsx(styles.usersSearchButton)} title={t('views.search')}>{t('views.search')}</button>
                                                <button
                                                    type="button"
                                                    className={clsx(styles.refreshButton)}
                                                    onClick={refreshViews}
                                                    disabled={loadingViews || loadingMaterializedViews}
                                                    aria-label={t('views.refresh')}
                                                    title={t('views.refresh')}
                                                >
                                                    <FontAwesomeIcon icon={faArrowsRotate} spin={loadingViews || loadingMaterializedViews}/>
                                                </button>
                                            </form>
                                        )}
                                    </div>

                                    {viewsFilterType === 'views' ? (
                                        loadingViews ? (
                                            <div className={clsx(styles.usersLoading)}>
                                                <div className={clsx(styles.spinner)}>
                                                    <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                                </div>
                                                <p>{t('views.loading')}</p>
                                            </div>
                                        ) : (
                                            <>
                                                {views && views.length > 0 ? (
                                                    <div className={clsx(styles.usersList)}>
                                                        {views.map((view) => (
                                                            <div key={`${view.schema_name}.${view.view_name}`} className={clsx(styles.userItem)}>
                                                                <div className={clsx(styles.userItemHeader)}>
                                                                    <div className={clsx(styles.userItemHeaderLeft)}>
                                                                        <h3 className={clsx(styles.userItemTitle)}>{view.schema_name}.{view.view_name}</h3>
                                                                    </div>
                                                                    <div className={clsx(styles.userItemHeaderRight)}>
                                                                        <div className={clsx(styles.userItemInfo)}>
                                                                            <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>Описание:</span>
                                                                            <span className={clsx(styles.userItemInfoValue)}>{view.description || '—'}</span>
                                                                        </div>
                                                                        <button
                                                                            className={clsx(styles.userActionButton)}
                                                                            onClick={() => {
                                                                                const match = viewPrivileges.find((item) => item.schema_name === view.schema_name && item.view_name === view.view_name);
                                                                                if (match) openViewEditModal(match, 'views');
                                                                            }}
                                                                            disabled={loadingViewsPrivileges}
                                                                            title={`Изменить права для ${view.view_name}`}
                                                                        >
                                                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className={clsx(styles.usersEmpty)}>
                                                        <FontAwesomeIcon icon={faEye} size="3x"/>
                                                        <p>{t('views.not_found')}</p>
                                                        {viewsError && <p className={clsx(styles.errorMessage)}>{viewsError}</p>}
                                                        {viewsPrivilegesError && <p className={clsx(styles.errorMessage)}>{viewsPrivilegesError}</p>}
                                                    </div>
                                                )}
                                                {resolvedViewsTotal > 0 && (
                                                    <div className={clsx(styles.pagination)}>
                                                        <div className={clsx(styles.paginationInfo)}>
                                                            <span className={clsx(styles.paginationText)}>
                                                                {t('views.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((viewsPage - 1) * viewsPageSize) + 1}</span>–
                                                                <span className={clsx(styles.paginationHighlight)}>{Math.min(viewsPage * viewsPageSize, resolvedViewsTotal)}</span> {t('views.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{resolvedViewsTotal}</span> {t('views.pagination.views')}
                                                            </span>
                                                        </div>
                                                        <div className={clsx(styles.paginationControls)}>
                                                            <select value={viewsPageSize} onChange={handleViewsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                                {PAGE_SIZES.map((size) => (
                                                                    <option key={size} value={size}>{size} {t('views.pagination.per_page')}</option>
                                                                ))}
                                                            </select>
                                                            <div className={clsx(styles.paginationButtons)}>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_first)} onClick={handleViewsFirstPage} disabled={viewsPage === 1 || !viewsHasPrev} title={t('views.pagination.first')}>
                                                                    <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleViewsPageChange(viewsPage - 1)} disabled={viewsPage === 1 || !viewsHasPrev} title={t('views.pagination.prev')}>
                                                                    <FontAwesomeIcon icon={faChevronLeft}/>
                                                                </button>
                                                                <span className={clsx(styles.pageInfo)}>{t('views.pagination.page')} {viewsPage} {t('views.pagination.of')} {resolvedViewsPages}</span>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleViewsPageChange(viewsPage + 1)} disabled={viewsPage === resolvedViewsPages || !viewsHasNext} title={t('views.pagination.next')}>
                                                                    <FontAwesomeIcon icon={faChevronRight}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_last)} onClick={handleViewsLastPage} disabled={viewsPage === resolvedViewsPages || !viewsHasNext} title={t('views.pagination.last')}>
                                                                    <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )
                                    ) : (
                                        loadingMaterializedViews ? (
                                            <div className={clsx(styles.usersLoading)}>
                                                <div className={clsx(styles.spinner)}>
                                                    <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                                </div>
                                                <p>{t('views.loading_materialized')}</p>
                                            </div>
                                        ) : (
                                            <>
                                                {materializedViews && materializedViews.length > 0 ? (
                                                    <div className={clsx(styles.usersList)}>
                                                        {materializedViews.map((view) => (
                                                            <div key={`mat-${view.schema_name}.${view.view_name}`} className={clsx(styles.userItem)}>
                                                                <div className={clsx(styles.userItemHeader)}>
                                                                    <div className={clsx(styles.userItemHeaderLeft)}>
                                                                        <h3 className={clsx(styles.userItemTitle)}>{view.schema_name}.{view.view_name}</h3>
                                                                    </div>
                                                                    <div className={clsx(styles.userItemHeaderRight)}>
                                                                        <div className={clsx(styles.userItemInfo)}>
                                                                            <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>Описание:</span>
                                                                            <span className={clsx(styles.userItemInfoValue)}>{view.description || '—'}</span>
                                                                        </div>
                                                                        <button
                                                                            className={clsx(styles.userActionButton)}
                                                                            onClick={() => {
                                                                                const match = materializedViewPrivileges.find((item) => item.schema_name === view.schema_name && item.view_name === view.view_name);
                                                                                if (match) openViewEditModal(match, 'materialized_views');
                                                                            }}
                                                                            disabled={loadingMaterializedViewsPrivileges}
                                                                            title={`Изменить права для ${view.view_name}`}
                                                                        >
                                                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className={clsx(styles.usersEmpty)}>
                                                        <FontAwesomeIcon icon={faEye} size="3x"/>
                                                        <p>{t('views.not_found_materialized')}</p>
                                                        {materializedViewsError && <p className={clsx(styles.errorMessage)}>{materializedViewsError}</p>}
                                                        {materializedViewsPrivilegesError && <p className={clsx(styles.errorMessage)}>{materializedViewsPrivilegesError}</p>}
                                                    </div>
                                                )}
                                                {resolvedMaterializedViewsTotal > 0 && (
                                                    <div className={clsx(styles.pagination)}>
                                                        <div className={clsx(styles.paginationInfo)}>
                                                            <span className={clsx(styles.paginationText)}>
                                                                {t('views.materialized.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((materializedViewsPage - 1) * materializedViewsPageSize) + 1}</span>–
                                                                <span className={clsx(styles.paginationHighlight)}>{Math.min(materializedViewsPage * materializedViewsPageSize, resolvedMaterializedViewsTotal)}</span> {t('views.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{resolvedMaterializedViewsTotal}</span> {t('views.materialized.pagination.views')}
                                                            </span>
                                                        </div>
                                                        <div className={clsx(styles.paginationControls)}>
                                                            <select value={materializedViewsPageSize} onChange={handleMaterializedViewsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                                {PAGE_SIZES.map((size) => (
                                                                    <option key={size} value={size}>{size} {t('views.pagination.per_page')}</option>
                                                                ))}
                                                            </select>
                                                            <div className={clsx(styles.paginationButtons)}>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_first)} onClick={handleMaterializedViewsFirstPage} disabled={materializedViewsPage === 1 || !materializedViewsHasPrev} title={t('views.pagination.first')}>
                                                                    <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleMaterializedViewsPageChange(materializedViewsPage - 1)} disabled={materializedViewsPage === 1 || !materializedViewsHasPrev} title={t('views.pagination.prev')}>
                                                                    <FontAwesomeIcon icon={faChevronLeft}/>
                                                                </button>
                                                                <span className={clsx(styles.pageInfo)}>{t('views.pagination.page')} {materializedViewsPage} {t('views.pagination.of')} {resolvedMaterializedViewsPages}</span>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleMaterializedViewsPageChange(materializedViewsPage + 1)} disabled={materializedViewsPage === resolvedMaterializedViewsPages || !materializedViewsHasNext} title={t('views.pagination.next')}>
                                                                    <FontAwesomeIcon icon={faChevronRight}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_last)} onClick={handleMaterializedViewsLastPage} disabled={materializedViewsPage === resolvedMaterializedViewsPages || !materializedViewsHasNext} title={t('views.pagination.last')}>
                                                                    <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )
                                    )}
                                </div>
                            )}

                            {visibleTabs.indexes && activeTab === 'indexes' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleIndexesSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.indexes')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {resolvedIndexesTotal}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('indexes.search')}
                                                    value={indexesSearchQuery}
                                                    onChange={handleIndexesSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {indexesSearchQuery && (
                                                    <button type="button" onClick={handleIndexesSearchClear} className={clsx(styles.usersSearchClear)} title={t('indexes.search_clear')}>
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title={t('indexes.search')}>{t('indexes.search')}</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshIndexes}
                                                disabled={loadingIndexes}
                                                aria-label={t('indexes.refresh')}
                                                title={t('indexes.refresh')}
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingIndexes}/>
                                            </button>
                                        </form>
                                    </div>

                                    {loadingIndexes ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('indexes.loading')}</p>
                                        </div>
                                    ) : indexes && indexes.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {indexes.map((index) => (
                                                    <div key={`${index.schema_name}.${index.index_name}`} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{index.schema_name}.{index.index_name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Таблица:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{index.table_name}</span>
                                                                </div>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>Описание:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{index.description || '—'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {resolvedIndexesTotal > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('indexes.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((indexesPage - 1) * indexesPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(indexesPage * indexesPageSize, resolvedIndexesTotal)}</span> {t('indexes.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{resolvedIndexesTotal}</span> {t('indexes.pagination.indexes')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={indexesPageSize} onChange={handleIndexesPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('indexes.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleIndexesFirstPage}
                                                                disabled={indexesPage === 1 || !indexesHasPrev}
                                                                title={t('indexes.pagination.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleIndexesPageChange(indexesPage - 1)}
                                                                disabled={indexesPage === 1 || !indexesHasPrev}
                                                                title={t('indexes.pagination.prev')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('indexes.pagination.page')} {indexesPage} {t('indexes.pagination.of')} {resolvedIndexesPages}</span>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleIndexesPageChange(indexesPage + 1)}
                                                                disabled={indexesPage === resolvedIndexesPages || !indexesHasNext}
                                                                title={t('indexes.pagination.next')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleIndexesLastPage}
                                                                disabled={indexesPage === resolvedIndexesPages || !indexesHasNext}
                                                                title={t('indexes.pagination.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faNetworkWired} size="3x"/>
                                            <p>{t('indexes.not_found')}</p>
                                            {indexesError && <p className={clsx(styles.errorMessage)}>{indexesError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.functions && activeTab === 'functions' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleFunctionsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.functions')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {resolvedFunctionsTotal}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('functions.search')}
                                                    value={functionsSearchQuery}
                                                    onChange={handleFunctionsSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {functionsSearchQuery && (
                                                    <button type="button" onClick={handleFunctionsSearchClear} className={clsx(styles.usersSearchClear)} title={t('functions.search_clear')}>
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title={t('functions.search')}>{t('functions.search')}</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshFunctions}
                                                disabled={loadingFunctions}
                                                aria-label={t('functions.refresh')}
                                                title={t('functions.refresh')}
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingFunctions}/>
                                            </button>
                                        </form>
                                    </div>

                                    {loadingFunctions ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('functions.loading')}</p>
                                        </div>
                                    ) : functions && functions.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {functions.map((dbFunction) => (
                                                    <div key={`${dbFunction.schema_name}.${dbFunction.function_name}`} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{dbFunction.schema_name}.{dbFunction.function_name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>Описание:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{dbFunction.description || '—'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {resolvedFunctionsTotal > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('functions.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((functionsPage - 1) * functionsPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(functionsPage * functionsPageSize, resolvedFunctionsTotal)}</span> {t('functions.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{resolvedFunctionsTotal}</span> {t('functions.pagination.functions')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={functionsPageSize} onChange={handleFunctionsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('functions.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleFunctionsFirstPage}
                                                                disabled={functionsPage === 1 || !functionsHasPrev}
                                                                title={t('functions.pagination.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleFunctionsPageChange(functionsPage - 1)} disabled={functionsPage === 1 || !functionsHasPrev} title={t('functions.pagination.prev')}>
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('functions.pagination.page')} {functionsPage} {t('functions.pagination.of')} {resolvedFunctionsPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleFunctionsPageChange(functionsPage + 1)} disabled={functionsPage === resolvedFunctionsPages || !functionsHasNext} title={t('functions.pagination.next')}>
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleFunctionsLastPage}
                                                                disabled={functionsPage === resolvedFunctionsPages || !functionsHasNext}
                                                                title={t('functions.pagination.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faCogs} size="3x"/>
                                            <p>{t('functions.not_found')}</p>
                                            {functionsError && <p className={clsx(styles.errorMessage)}>{functionsError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.procedures && activeTab === 'procedures' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleProceduresSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.procedures')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {resolvedProceduresTotal}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('procedures.search')}
                                                    value={proceduresSearchQuery}
                                                    onChange={handleProceduresSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {proceduresSearchQuery && (
                                                    <button type="button" onClick={handleProceduresSearchClear} className={clsx(styles.usersSearchClear)} title={t('procedures.search_clear')}>
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title={t('procedures.search')}>{t('procedures.search')}</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshProcedures}
                                                disabled={loadingProcedures}
                                                aria-label={t('procedures.refresh')}
                                                title={t('procedures.refresh')}
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingProcedures}/>
                                            </button>
                                        </form>
                                    </div>

                                    {loadingProcedures ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('procedures.loading')}</p>
                                        </div>
                                    ) : procedures && procedures.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {procedures.map((procedure) => (
                                                    <div key={`${procedure.schema_name}.${procedure.procedure_name}`} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>{procedure.schema_name}.{procedure.procedure_name}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>Описание:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{procedure.description || '—'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {resolvedProceduresTotal > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
<span className={clsx(styles.paginationText)}>
{t('procedures.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((proceduresPage - 1) * proceduresPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(proceduresPage * proceduresPageSize, resolvedProceduresTotal)}</span> {t('procedures.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{resolvedProceduresTotal}</span> {t('procedures.pagination.procedures')}
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={proceduresPageSize} onChange={handleProceduresPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('procedures.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleProceduresFirstPage}
                                                                disabled={proceduresPage === 1 || !proceduresHasPrev}
                                                                title={t('procedures.pagination.first')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleProceduresPageChange(proceduresPage - 1)} disabled={proceduresPage === 1 || !proceduresHasPrev} title={t('procedures.pagination.prev')}>
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('procedures.pagination.page')} {proceduresPage} {t('procedures.pagination.of')} {resolvedProceduresPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleProceduresPageChange(proceduresPage + 1)} disabled={proceduresPage === resolvedProceduresPages || !proceduresHasNext} title={t('procedures.pagination.next')}>
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleProceduresLastPage}
                                                                disabled={proceduresPage === resolvedProceduresPages || !proceduresHasNext}
                                                                title={t('procedures.pagination.last')}
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faCogs} size="3x"/>
                                            <p>{t('procedures.not_found')}</p>
                                            {proceduresError && <p className={clsx(styles.errorMessage)}>{proceduresError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.sql_query && activeTab === 'sql_query' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.sqlQueryPanel)}>
                                        <div className={clsx(styles.sqlQueryPanelHeader)}>
                                            <h3 className={clsx(styles.sqlQueryPanelTitle)}>{t('sql_query.title')}</h3>
                                            <div className={clsx(styles.sqlQueryTemplates)}>
                                                <button type="button" className={clsx(styles.sqlTemplateButton)} onClick={() => applySqlTemplate('SELECT 1 AS test;')} disabled={sqlQueryLoading}>{t('sql_query.template.test')}</button>
                                                <button type="button" className={clsx(styles.sqlTemplateButton)} onClick={() => applySqlTemplate('SELECT * FROM information_schema.tables;')} disabled={sqlQueryLoading}>{t('sql_query.template.tables')}</button>
                                                <button type="button" className={clsx(styles.sqlTemplateButton)} onClick={() => applySqlTemplate('SELECT * FROM pg_catalog.pg_stat_activity;')} disabled={sqlQueryLoading}>{t('sql_query.template.sessions')}</button>
                                            </div>
                                        </div>

                                        <form onSubmit={executeSqlQuery} className={clsx(styles.sqlQueryForm)}>
                                            <textarea
                                                value={sqlQueryText}
                                                onChange={(e) => setSqlQueryText(e.target.value)}
                                                rows={10}
                                                className={clsx(styles.sqlQueryTextarea)}
                                                placeholder={t('sql_query.placeholder')}
                                                disabled={sqlQueryLoading}
                                            />
                                            <div className={clsx(styles.sqlQueryActions)}>
                                                <label className={clsx(styles.sqlQueryLimitLabel)} htmlFor="sqlQueryLimit">{t('sql_query.limit')}</label>
                                                <input
                                                    id="sqlQueryLimit"
                                                    type="number"
                                                    min={1}
                                                    max={1000}
                                                    value={sqlQueryLimit}
                                                    onChange={(e) => setSqlQueryLimit(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                                                    className={clsx(styles.sqlQueryLimitInput)}
                                                    disabled={sqlQueryLoading}
                                                />
                                                <button type="button" className={clsx(styles.sqlSecondaryButton)} onClick={() => setSqlQueryText('')} disabled={sqlQueryLoading}>{t('sql_query.clear')}</button>
                                                <button type="submit" className={clsx(styles.usersSearchButton)} disabled={sqlQueryLoading}>
                                                    {sqlQueryLoading ? t('sql_query.running') : t('sql_query.run')}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {sqlQueryError && <p className={clsx(styles.errorMessage)}>{sqlQueryError}</p>}
                                    {sqlQueryTruncated && <p className={clsx(styles.errorMessage)}>{t('sql_query.truncated')}</p>}

                                    {sqlQueryRows.length > 0 ? (
                                        <div className={clsx(styles.sqlResultCard)}>
                                            <div className={clsx(styles.sqlResultTableWrapper)}>
                                                <table className={clsx(styles.sqlResultTable)}>
                                                    <thead>
                                                    <tr>
                                                        {sqlQueryColumns.map((col) => (
                                                            <th key={col}>{col}</th>
                                                        ))}
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {sqlQueryRows.map((row, i) => (
                                                        <tr key={i}>
                                                            {sqlQueryColumns.map((col) => (
                                                                <td key={`${i}-${col}`}>{String(row[col] ?? '—')}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faDatabase} size="3x"/>
                                            <p>{t('sql_query.empty')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {visibleTabs.active_sql && activeTab === 'active_sql' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleActiveSqlFilterSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchTitle)}>
                                                {t('tabs.transactions')}
                                                <span className={clsx(styles.usersCountBadge)}>
                                                    {totalActiveQueries}
                                                </span>
                                            </div>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder={t('active_sql.filter.user')}
                                                    value={activeSqlUsernameQuery}
                                                    onChange={(e) => setActiveSqlUsernameQuery(e.target.value)}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                placeholder={t('active_sql.filter.min_duration')}
                                                value={activeSqlMinDuration}
                                                onChange={(e) => setActiveSqlMinDuration(e.target.value)}
                                                className={clsx(styles.activeSqlDurationInput)}
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                placeholder={t('active_sql.filter.max_duration')}
                                                value={activeSqlMaxDuration}
                                                onChange={(e) => setActiveSqlMaxDuration(e.target.value)}
                                                className={clsx(styles.activeSqlDurationInput)}
                                            />
                                            <button type="submit" className={clsx(styles.usersSearchButton)}>{t('active_sql.filter.apply')}</button>
                                            <button type="button" className={clsx(styles.usersSearchButton, styles.usersSearchButton_secondary)} onClick={handleActiveSqlFilterClear}>{t('active_sql.filter.reset')}</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshActiveTransactions}
                                                disabled={loadingActiveQueries}
                                                aria-label={t('active_sql.refresh')}
                                                title={t('active_sql.refresh')}
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingActiveQueries}/>
                                            </button>
                                        </form>
                                    </div>

                                    {loadingActiveQueries ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>{t('active_sql.loading')}</p>
                                        </div>
                                    ) : activeQueries.length > 0 ? (
                                        <>
                                            <div className={clsx(styles.usersList)}>
                                                {activeQueries.map((item) => (
                                                    <div key={item.pid} className={clsx(styles.userItem)}>
                                                        <div className={clsx(styles.userItemHeader)}>
                                                            <div className={clsx(styles.userItemHeaderLeft)}>
                                                                <h3 className={clsx(styles.userItemTitle)}>PID {item.pid} — {item.username || '—'}</h3>
                                                            </div>
                                                            <div className={clsx(styles.userItemHeaderRight)}>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>{t('active_sql.duration')}</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{item.duration_ms ?? '—'} мс</span>
                                                                </div>
                                                                <div className={clsx(styles.userActions)}>
                                                                    <button
                                                                        className={clsx(styles.userActionButton, styles.userActionButton_delete)}
                                                                        onClick={() => terminateActiveSqlQuery(item.pid)}
                                                                        disabled={terminatingPid === item.pid}
                                                                        title={t('active_sql.terminate')}
                                                                    >
                                                                        {terminatingPid === item.pid ? <FontAwesomeIcon icon={faSpinner} spin/> : <FontAwesomeIcon icon={faTrashAlt}/>}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={clsx(styles.userItemContent)}>
                                                            <pre className={clsx(styles.userItemQuery)}>
                                                                <code>{formatSqlForDisplay(item.query)}</code>
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {totalActiveQueries > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
                                                        <span className={clsx(styles.paginationText)}>
                                                            {t('active_sql.pagination.shown')} <span className={clsx(styles.paginationHighlight)}>{((activeSqlPage - 1) * activeSqlPageSize) + 1}</span>–
                                                            <span className={clsx(styles.paginationHighlight)}>{Math.min(activeSqlPage * activeSqlPageSize, totalActiveQueries)}</span> {t('active_sql.pagination.of')} <span className={clsx(styles.paginationHighlight)}>{totalActiveQueries}</span> {t('active_sql.pagination.queries')}
                                                        </span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={activeSqlPageSize} onChange={handleActiveSqlPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} {t('active_sql.pagination.per_page')}</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleActiveSqlPageChange(activeSqlPage - 1)} disabled={activeSqlPage === 1 || !activeQueriesHasPrev} title={t('active_sql.pagination.prev')}>
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>{t('active_sql.pagination.page')} {activeSqlPage} {t('active_sql.pagination.of')} {totalActiveQueriesPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleActiveSqlPageChange(activeSqlPage + 1)} disabled={activeSqlPage === totalActiveQueriesPages || !activeQueriesHasNext} title={t('active_sql.pagination.next')}>
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={clsx(styles.usersEmpty)}>
                                            <FontAwesomeIcon icon={faDatabase} size="3x"/>
                                            <p>{t('active_sql.not_found')}</p>
                                            {(activeQueriesError || error) && <p className={clsx(styles.errorMessage)}>{activeQueriesError || error}</p>}
                                        </div>
                                    )}
                                </div>

                            )}
                            {visibleTabs.monitoring && activeTab === 'monitoring' && (
                                <div className={clsx(styles.usersContent, styles.monitoringCards)}>
                                    <div className={clsx(styles.metricsWideCard)}>
                                        <div className={clsx(styles.metricsCardHeader)}>
                                            <FontAwesomeIcon icon={faChartLine} className={clsx(styles.metricsCardIcon)}/>
                                            <h3 className={clsx(styles.metricsCardTitle)}>Транзакционная активность</h3>
                                            <button type="button" className={clsx(styles.metricsInlineRefresh)} onClick={refreshMonitoringSessionActivity} title="Обновить график">
                                                <FontAwesomeIcon icon={faArrowsRotate}/> Обновить
                                            </button>
                                            <label className={clsx(styles.metricsRefreshControl)}>
                                                Интервал:
                                                <select
                                                    className={clsx(styles.metricsRefreshSelect)}
                                                    value={sessionMonitoringRefreshIntervalMs}
                                                    onChange={(event) => setSessionMonitoringRefreshIntervalMs(Number(event.target.value))}
                                                    aria-label="Интервал автообновления графика транзакционной активности"
                                                >
                                                    <option value={1000}>1 сек</option>
                                                    <option value={2000}>2 сек</option>
                                                    <option value={5000}>5 сек</option>
                                                    <option value={10000}>10 сек</option>
                                                </select>
                                            </label>
                                            <button type="button" className={clsx(styles.metricsCollapseButton)} onClick={() => setIsSessionActivityCollapsed((prev) => !prev)}>
                                                {isSessionActivityCollapsed ? 'Развернуть' : 'Свернуть'}
                                            </button>
                                        </div>
                                        {!isSessionActivityCollapsed && (
                                            <div className={clsx(styles.metricsCardContent)}>
                                                {loadingSessionActivity && sessionActivityPoints.length === 0 ? (
                                                    <div className={clsx(styles.metricsSmallMuted)}>Загрузка данных активности...</div>
                                                ) : sessionActivityError ? (
                                                    <div className={clsx(styles.errorMessage)}>{sessionActivityError}</div>
                                                ) : (
                                                    <>
                                                        <div className={clsx(styles.metricsChartLegend)}>
                                                            <button type="button" className={clsx(styles.legendToggle, !sessionSeriesVisibility.totalSessions && styles.legendToggle_inactive)} onClick={() => setSessionSeriesVisibility((prev) => ({ ...prev, totalSessions: !prev.totalSessions }))}>
                                                                <i className={clsx(styles.legendDot, styles.legendDotTotal)}/>Все сессии: {sessionActivitySnapshot?.sessions_total ?? 0}
                                                            </button>
                                                            <button type="button" className={clsx(styles.legendToggle, !sessionSeriesVisibility.activeSessions && styles.legendToggle_inactive)} onClick={() => setSessionSeriesVisibility((prev) => ({ ...prev, activeSessions: !prev.activeSessions }))}>
                                                                <i className={clsx(styles.legendDot, styles.legendDotActive)}/>Активные сессии: {sessionActivitySnapshot?.active_sessions ?? 0}
                                                            </button>
                                                            <button type="button" className={clsx(styles.legendToggle, !sessionSeriesVisibility.activeTransactions && styles.legendToggle_inactive)} onClick={() => setSessionSeriesVisibility((prev) => ({ ...prev, activeTransactions: !prev.activeTransactions }))}>
                                                                <i className={clsx(styles.legendDot, styles.legendDotTx)}/>Активные транзакции: {sessionActivitySnapshot?.users.reduce((sum, user) => sum + user.active_transactions, 0) ?? 0}
                                                            </button>
                                                        </div>
                                                        <div className={clsx(styles.metricsLineChartWrap)}>
                                                            <svg
                                                                viewBox={`0 0 ${sessionActivityChartModel.width} ${sessionActivityChartModel.height}`}
                                                                className={clsx(styles.metricsLineChart)}
                                                                role="img"
                                                                aria-label="График активности сессий и транзакций"
                                                                onMouseLeave={() => setSessionChartHoverIndex(null)}
                                                                onMouseMove={(event) => {
                                                                    if (visibleSessionActivityPoints.length === 0) return;
                                                                    const rect = event.currentTarget.getBoundingClientRect();
                                                                    const relativeX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * sessionActivityChartModel.width;
                                                                    const chartInnerWidth = sessionActivityChartModel.width - sessionActivityChartModel.axis.left - sessionActivityChartModel.axis.right;
                                                                    const normalizedX = Math.max(0, Math.min(relativeX - sessionActivityChartModel.axis.left, chartInnerWidth));
                                                                    const idx = Math.round((normalizedX / Math.max(chartInnerWidth, 1)) * Math.max(visibleSessionActivityPoints.length - 1, 1));
                                                                    setSessionChartHoverIndex(Math.max(0, Math.min(idx, visibleSessionActivityPoints.length - 1)));
                                                                }}
                                                            >
                                                                {sessionActivityChartModel.yTicks.map((tick) => {
                                                                    const y = sessionActivityChartModel.axis.top + (sessionActivityChartModel.height - sessionActivityChartModel.axis.top - sessionActivityChartModel.axis.bottom) - (tick / Math.max(sessionActivityChartModel.maxValue, 1)) * (sessionActivityChartModel.height - sessionActivityChartModel.axis.top - sessionActivityChartModel.axis.bottom);
                                                                    return (
                                                                        <g key={`session-y-${tick}`}>
                                                                            <line x1={sessionActivityChartModel.axis.left} y1={y} x2={sessionActivityChartModel.width - sessionActivityChartModel.axis.right} y2={y} className={clsx(styles.chartGridLine)} />
                                                                            <text x={sessionActivityChartModel.axis.left - 8} y={y + 4} className={clsx(styles.chartAxisLabel)}>{tick}</text>
                                                                        </g>
                                                                    );
                                                                })}
                                                            <defs>
                                                                <linearGradient id="session-area-gradient" x1="0" x2="0" y1="0" y2="1">
                                                                    <stop offset="0%" stopColor="rgba(47, 128, 237, 0.28)" />
                                                                    <stop offset="100%" stopColor="rgba(47, 128, 237, 0.02)" />
                                                                </linearGradient>
                                                            </defs>
                                                            {sessionSeriesVisibility.totalSessions && (
                                                                <polygon
                                                                    points={`${sessionActivityChartModel.axis.left},${sessionActivityChartModel.height - sessionActivityChartModel.axis.bottom} ${sessionActivityChartModel.lines.totalSessions} ${sessionActivityChartModel.width - sessionActivityChartModel.axis.right},${sessionActivityChartModel.height - sessionActivityChartModel.axis.bottom}`}
                                                                    className={clsx(styles.chartAreaFill)}
                                                                />
                                                            )}
                                                            {sessionSeriesVisibility.totalSessions && <polyline points={sessionActivityChartModel.lines.totalSessions} className={clsx(styles.chartLineTotal)} />}
                                                            {sessionSeriesVisibility.activeSessions && <polyline points={sessionActivityChartModel.lines.activeSessions} className={clsx(styles.chartLineActive)} />}
                                                            {sessionSeriesVisibility.activeTransactions && <polyline points={sessionActivityChartModel.lines.activeTransactions} className={clsx(styles.chartLineTransactions)} />}
                                                                {hoveredSessionPointX !== null && (
                                                                    <line
                                                                        x1={hoveredSessionPointX}
                                                                        y1={sessionActivityChartModel.axis.top}
                                                                        x2={hoveredSessionPointX}
                                                                        y2={sessionActivityChartModel.height - sessionActivityChartModel.axis.bottom}
                                                                        className={clsx(styles.chartHoverGuide)}
                                                                    />
                                                                )}
                                                                {sessionActivityChartModel.xTickLabels.map((tick) => (
                                                                    <text key={`session-x-${tick.label}`} x={tick.x} y={sessionActivityChartModel.height - 12} className={clsx(styles.chartAxisLabel, styles.chartTimeLabel)} textAnchor="middle">{tick.label}</text>
                                                                ))}
                                                            </svg>
                                                            {hoveredSessionPoint && (
                                                                <div className={clsx(styles.metricsChartTooltip)} role="status" aria-live="polite">
                                                                    <div className={clsx(styles.metricsChartTooltipTitle)}>{hoveredSessionPoint.timestamp}</div>
                                                                    <div>Все сессии: <b>{hoveredSessionPoint.totalSessions}</b></div>
                                                                    <div>Активные сессии: <b>{hoveredSessionPoint.activeSessions}</b></div>
                                                                    <div>Активные транзакции: <b>{hoveredSessionPoint.activeTransactions}</b></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={clsx(styles.metricsTimelineScale)}>
                                                        <div className={clsx(styles.metricsTimelineScaleHeader)}>
                                                            <span>Временная линия масштаба</span>
                                                            <div className={clsx(styles.metricsTimelineActions)}>
                                                                <span>
                                                                    Диапазон: {sessionChartWindowBoundaries.startIndex + 1}–{sessionChartWindowBoundaries.endIndex + 1}
                                                                    {' '}из {Math.max(sessionActivityPoints.length, 1)} точек · колесо — прокрутка, Shift+колесо — масштаб
                                                                </span>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={() => zoomSessionChartWindow(true)}>+</button>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={() => zoomSessionChartWindow(false)}>−</button>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={showLiveSessionChartWindow}>Live</button>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={showAllSessionChartWindow}>Весь период</button>
                                                            </div>
                                                        </div>
                                                            <div
                                                                ref={sessionTimelineRangeShellRef}
                                                                className={clsx(styles.metricsTimelineRangeShell)}
                                                                onWheel={handleTimelineScaleWheel}
                                                                onPointerDown={handleTimelineScalePointerDown}
                                                            >
                                                                <div className={clsx(styles.metricsTimelineRangeTrack)} />
                                                                <div
                                                                    className={clsx(styles.metricsTimelineRangeSelection)}
                                                                    style={{
                                                                        left: `${sessionChartWindowStartPercent}%`,
                                                                        width: `${Math.max(sessionChartWindowEndPercent - sessionChartWindowStartPercent, 0)}%`,
                                                                    }}
                                                                />
                                                                <input
                                                                    type="range"
                                                                    min={0}
                                                                    max={100}
                                                                    step={1}
                                                                    value={sessionChartWindowStartPercent}
                                                                    onChange={(event) => {
                                                                        const nextStart = Number(event.target.value);
                                                                        applySessionChartWindow(nextStart, sessionChartWindowEndPercent);
                                                                    }}
                                                                    className={clsx(styles.metricsTimelineRange, styles.metricsTimelineRangeStart)}
                                                                    aria-label="Начало временного диапазона графика"
                                                                />
                                                                <input
                                                                    type="range"
                                                                    min={0}
                                                                    max={100}
                                                                    step={1}
                                                                    value={sessionChartWindowEndPercent}
                                                                    onChange={(event) => {
                                                                        const nextEnd = Number(event.target.value);
                                                                        applySessionChartWindow(sessionChartWindowStartPercent, nextEnd);
                                                                    }}
                                                                    className={clsx(styles.metricsTimelineRange, styles.metricsTimelineRangeEnd)}
                                                                    aria-label="Конец временного диапазона графика"
                                                                />
                                                            </div>
                                                            <div className={clsx(styles.metricsTimelineTicks)}>
                                                                {['История', '25%', '50%', '75%', 'Live'].map((tick) => (
                                                                    <span key={`timeline-tick-${tick}`}>{tick}</span>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className={clsx(styles.metricsUsersTable)}>
                                                            <div className={clsx(styles.metricsUsersHeader)}>Top пользователей по транзакциям</div>
                                                            {(sessionActivitySnapshot?.users ?? []).map((item) => (
                                                                <div key={item.username} className={clsx(styles.metricsUsersRow)}>
                                                                    <span className={clsx(styles.metricsUsersName)}>{item.username}</span>
                                                                    <span>Сессий: {item.sessions_total}</span>
                                                                    <span>Активных: {item.active_sessions}</span>
                                                                    <span>Tx: {item.active_transactions}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className={clsx(styles.metricsWideCard)}>
                                        <div className={clsx(styles.metricsCardHeader)}>
                                            <FontAwesomeIcon icon={faChartLine} className={clsx(styles.metricsCardIcon)}/>
                                            <h3 className={clsx(styles.metricsCardTitle)}>График активности</h3>
                                            <button type="button" className={clsx(styles.metricsInlineRefresh)} onClick={refreshMonitoringSqlActivity} title="Обновить график">
                                                <FontAwesomeIcon icon={faArrowsRotate}/> Обновить
                                            </button>
                                            <label className={clsx(styles.metricsRefreshControl)}>
                                                Интервал:
                                                <select
                                                    className={clsx(styles.metricsRefreshSelect)}
                                                    value={activityChartRefreshIntervalMs}
                                                    onChange={(event) => setActivityChartRefreshIntervalMs(Number(event.target.value))}
                                                    aria-label="Интервал автообновления графика SQL-активности"
                                                >
                                                    <option value={1000}>1 сек</option>
                                                    <option value={2000}>2 сек</option>
                                                    <option value={5000}>5 сек</option>
                                                    <option value={10000}>10 сек</option>
                                                </select>
                                            </label>
                                            <button type="button" className={clsx(styles.metricsCollapseButton)} onClick={() => setIsSqlActivityCollapsed((prev) => !prev)}>
                                                {isSqlActivityCollapsed ? 'Развернуть' : 'Свернуть'}
                                            </button>
                                        </div>
                                        {!isSqlActivityCollapsed && (
                                            <div className={clsx(styles.metricsCardContent)}>
                                                <div className={clsx(styles.metricsChartLegend)}>
                                                    <button type="button" className={clsx(styles.legendToggle, !sqlSeriesVisibility.total && styles.legendToggle_inactive)} onClick={() => setSqlSeriesVisibility((prev) => ({ ...prev, total: !prev.total }))}>
                                                        <i className={clsx(styles.legendDot, styles.legendDotSqlTotal)}/>Всего: {activityChartPoints[activityChartPoints.length - 1]?.total ?? 0}
                                                    </button>
                                                    <button type="button" className={clsx(styles.legendToggle, !sqlSeriesVisibility.select && styles.legendToggle_inactive)} onClick={() => setSqlSeriesVisibility((prev) => ({ ...prev, select: !prev.select }))}>
                                                        <i className={clsx(styles.legendDot, styles.legendDotSqlSelect)}/>SELECT: {activityChartPoints[activityChartPoints.length - 1]?.select ?? 0}
                                                    </button>
                                                    <button type="button" className={clsx(styles.legendToggle, !sqlSeriesVisibility.insert && styles.legendToggle_inactive)} onClick={() => setSqlSeriesVisibility((prev) => ({ ...prev, insert: !prev.insert }))}>
                                                        <i className={clsx(styles.legendDot, styles.legendDotSqlInsert)}/>INSERT: {activityChartPoints[activityChartPoints.length - 1]?.insert ?? 0}
                                                    </button>
                                                    <button type="button" className={clsx(styles.legendToggle, !sqlSeriesVisibility.update && styles.legendToggle_inactive)} onClick={() => setSqlSeriesVisibility((prev) => ({ ...prev, update: !prev.update }))}>
                                                        <i className={clsx(styles.legendDot, styles.legendDotSqlUpdate)}/>UPDATE: {activityChartPoints[activityChartPoints.length - 1]?.update ?? 0}
                                                    </button>
                                                    <button type="button" className={clsx(styles.legendToggle, !sqlSeriesVisibility.delete && styles.legendToggle_inactive)} onClick={() => setSqlSeriesVisibility((prev) => ({ ...prev, delete: !prev.delete }))}>
                                                        <i className={clsx(styles.legendDot, styles.legendDotSqlDelete)}/>DELETE: {activityChartPoints[activityChartPoints.length - 1]?.delete ?? 0}
                                                    </button>
                                                    <button type="button" className={clsx(styles.legendToggle, !sqlSeriesVisibility.other && styles.legendToggle_inactive)} onClick={() => setSqlSeriesVisibility((prev) => ({ ...prev, other: !prev.other }))}>
                                                        <i className={clsx(styles.legendDot, styles.legendDotSqlOther)}/>OTHER: {activityChartPoints[activityChartPoints.length - 1]?.other ?? 0}
                                                    </button>
                                                </div>
                                                {chartActiveQueriesError ? (
                                                    <div className={clsx(styles.errorMessage)}>{chartActiveQueriesError}</div>
                                                ) : activityChartPoints.length > 1 ? (
                                                    <>
                                                        <div className={clsx(styles.metricsLineChartWrap)}>
                                                            <svg
                                                                viewBox={`0 0 ${activityChartModel.width} ${activityChartModel.height}`}
                                                                className={clsx(styles.metricsLineChart)}
                                                                role="img"
                                                                aria-label={t('chart.aria')}
                                                                onMouseLeave={() => setSqlChartHoverIndex(null)}
                                                                onMouseMove={(event) => {
                                                                    if (visibleSqlActivityPoints.length === 0) return;
                                                                    const rect = event.currentTarget.getBoundingClientRect();
                                                                    const relativeX = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * activityChartModel.width;
                                                                    const chartInnerWidth = activityChartModel.width - activityChartModel.axis.left - activityChartModel.axis.right;
                                                                    const normalizedX = Math.max(0, Math.min(relativeX - activityChartModel.axis.left, chartInnerWidth));
                                                                    const idx = Math.round((normalizedX / Math.max(chartInnerWidth, 1)) * Math.max(visibleSqlActivityPoints.length - 1, 1));
                                                                    setSqlChartHoverIndex(Math.max(0, Math.min(idx, visibleSqlActivityPoints.length - 1)));
                                                                }}
                                                            >
                                                                {activityChartModel.yTicks.map((tick) => {
                                                                    const y = activityChartModel.axis.top
                                                                        + (activityChartModel.height - activityChartModel.axis.top - activityChartModel.axis.bottom)
                                                                        - (tick / Math.max(activityChartModel.yTicks[activityChartModel.yTicks.length - 1], 1))
                                                                        * (activityChartModel.height - activityChartModel.axis.top - activityChartModel.axis.bottom);
                                                                    return (
                                                                        <g key={`sql-y-${tick}`}>
                                                                            <line x1={activityChartModel.axis.left} y1={y} x2={activityChartModel.width - activityChartModel.axis.right} y2={y} className={clsx(styles.chartGridLine)} />
                                                                            <text x={activityChartModel.axis.left - 8} y={y + 4} className={clsx(styles.chartAxisLabel)}>{tick}</text>
                                                                        </g>
                                                                    );
                                                                })}
                                                                <defs>
                                                                    <linearGradient id="sql-area-gradient" x1="0" x2="0" y1="0" y2="1">
                                                                        <stop offset="0%" stopColor="rgba(79, 70, 229, 0.3)" />
                                                                        <stop offset="100%" stopColor="rgba(79, 70, 229, 0.02)" />
                                                                    </linearGradient>
                                                                </defs>
                                                                {sqlSeriesVisibility.total && (
                                                                    <polygon
                                                                        points={`${activityChartModel.axis.left},${activityChartModel.height - activityChartModel.axis.bottom} ${activityChartModel.lines.total} ${activityChartModel.width - activityChartModel.axis.right},${activityChartModel.height - activityChartModel.axis.bottom}`}
                                                                        className={clsx(styles.chartAreaFillSql)}
                                                                    />
                                                                )}
                                                                {sqlSeriesVisibility.total && <polyline points={activityChartModel.lines.total} className={clsx(styles.chartLineSqlTotal)} />}
                                                                {sqlSeriesVisibility.select && <polyline points={activityChartModel.lines.select} className={clsx(styles.chartLineSqlSelect)} />}
                                                                {sqlSeriesVisibility.insert && <polyline points={activityChartModel.lines.insert} className={clsx(styles.chartLineSqlInsert)} />}
                                                                {sqlSeriesVisibility.update && <polyline points={activityChartModel.lines.update} className={clsx(styles.chartLineSqlUpdate)} />}
                                                                {sqlSeriesVisibility.delete && <polyline points={activityChartModel.lines.delete} className={clsx(styles.chartLineSqlDelete)} />}
                                                                {sqlSeriesVisibility.other && <polyline points={activityChartModel.lines.other} className={clsx(styles.chartLineSqlOther)} />}
                                                                {hoveredSqlPointX !== null && (
                                                                    <line
                                                                        x1={hoveredSqlPointX}
                                                                        y1={activityChartModel.axis.top}
                                                                        x2={hoveredSqlPointX}
                                                                        y2={activityChartModel.height - activityChartModel.axis.bottom}
                                                                        className={clsx(styles.chartHoverGuide)}
                                                                    />
                                                                )}
                                                                {activityChartModel.xTickLabels.map((tick) => (
                                                                    <text key={`sql-x-${tick.label}`} x={tick.x} y={activityChartModel.height - 12} className={clsx(styles.chartAxisLabel, styles.chartTimeLabel)} textAnchor="middle">{tick.label}</text>
                                                                ))}
                                                            </svg>
                                                            {hoveredSqlPoint && (
                                                                <div className={clsx(styles.metricsChartTooltip)} role="status" aria-live="polite">
                                                                    <div className={clsx(styles.metricsChartTooltipTitle)}>{hoveredSqlPoint.timestamp}</div>
                                                                    <div>Всего: <b>{hoveredSqlPoint.total}</b></div>
                                                                    <div>SELECT: <b>{hoveredSqlPoint.select}</b></div>
                                                                    <div>INSERT: <b>{hoveredSqlPoint.insert}</b></div>
                                                                    <div>UPDATE: <b>{hoveredSqlPoint.update}</b></div>
                                                                    <div>DELETE: <b>{hoveredSqlPoint.delete}</b></div>
                                                                    <div>OTHER: <b>{hoveredSqlPoint.other}</b></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={clsx(styles.metricsTimelineScale)}>
                                                        <div className={clsx(styles.metricsTimelineScaleHeader)}>
                                                            <span>Временная линия масштаба</span>
                                                            <div className={clsx(styles.metricsTimelineActions)}>
                                                                <span>
                                                                    Диапазон: {sqlChartWindowBoundaries.startIndex + 1}–{sqlChartWindowBoundaries.endIndex + 1}
                                                                    {' '}из {Math.max(activityChartPoints.length, 1)} точек · колесо — прокрутка, Shift+колесо — масштаб
                                                                </span>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={() => zoomSqlChartWindow(true)}>+</button>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={() => zoomSqlChartWindow(false)}>−</button>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={showLiveSqlChartWindow}>Live</button>
                                                                <button type="button" className={clsx(styles.metricsTimelineActionButton)} onClick={showAllSqlChartWindow}>Весь период</button>
                                                            </div>
                                                        </div>
                                                            <div
                                                                ref={sqlTimelineRangeShellRef}
                                                                className={clsx(styles.metricsTimelineRangeShell)}
                                                                onWheel={handleSqlTimelineScaleWheel}
                                                                onPointerDown={handleSqlTimelineScalePointerDown}
                                                            >
                                                                <div className={clsx(styles.metricsTimelineRangeTrack)} />
                                                                <div
                                                                    className={clsx(styles.metricsTimelineRangeSelection)}
                                                                    style={{
                                                                        left: `${sqlChartWindowStartPercent}%`,
                                                                        width: `${Math.max(sqlChartWindowEndPercent - sqlChartWindowStartPercent, 0)}%`,
                                                                    }}
                                                                />
                                                                <input
                                                                    type="range"
                                                                    min={0}
                                                                    max={100}
                                                                    step={1}
                                                                    value={sqlChartWindowStartPercent}
                                                                    onChange={(event) => {
                                                                        const nextStart = Number(event.target.value);
                                                                        applySqlChartWindow(nextStart, sqlChartWindowEndPercent);
                                                                    }}
                                                                    className={clsx(styles.metricsTimelineRange, styles.metricsTimelineRangeStart)}
                                                                    aria-label="Начало временного диапазона графика SQL-активности"
                                                                />
                                                                <input
                                                                    type="range"
                                                                    min={0}
                                                                    max={100}
                                                                    step={1}
                                                                    value={sqlChartWindowEndPercent}
                                                                    onChange={(event) => {
                                                                        const nextEnd = Number(event.target.value);
                                                                        applySqlChartWindow(sqlChartWindowStartPercent, nextEnd);
                                                                    }}
                                                                    className={clsx(styles.metricsTimelineRange, styles.metricsTimelineRangeEnd)}
                                                                    aria-label="Конец временного диапазона графика SQL-активности"
                                                                />
                                                            </div>
                                                            <div className={clsx(styles.metricsTimelineTicks)}>
                                                                {['История', '25%', '50%', '75%', 'Live'].map((tick) => (
                                                                    <span key={`sql-timeline-tick-${tick}`}>{tick}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {/*<div className={clsx(styles.metricsTimelineTicks)}>*/}
                                                        {/*    <span>Период: {visibleSqlActivityPoints[0]?.timestamp ?? '—'} — {visibleSqlActivityPoints[visibleSqlActivityPoints.length - 1]?.timestamp ?? '—'}</span>*/}
                                                        {/*    <span>Min: {activityChartModel.minValue}</span>*/}
                                                        {/*    <span>Avg: {activityChartModel.avgValue}</span>*/}
                                                        {/*    <span>Max: {activityChartModel.maxValue}</span>*/}
                                                        {/*</div>*/}
                                                    </>
                                                ) : (
                                                    <div className={clsx(styles.metricsSmallMuted)}>
                                                        <FontAwesomeIcon icon={faSpinner} spin={chartLoadingActiveQueries} /> {t('chart.collecting')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно подтверждения удаления */}
            {confirmDeleteId !== null && (
                <div className={clsx(styles.modalOverlay)} onClick={closeDeleteConfirm}>
                    <div
                        className={clsx(styles.modalContent)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon
                                icon={faExclamationCircle}
                                className={clsx(styles.modalIcon)}
                            />
                            <h2 className={clsx(styles.modalTitle)}>
                                {t('users.delete.confirm_title')}
                            </h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>
                                Удалить подключение <strong>{confirmDeleteName}</strong>?
                            </p>
                            <p className={clsx(styles.modalWarning)}>
                                <FontAwesomeIcon icon={faExclamationCircle}/>
                                Все данные будут удалены безвозвратно.
                            </p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button
                                className={clsx(styles.modalCancelButton)}
                                onClick={closeDeleteConfirm}
                                disabled={deletingId !== null}
                            >
                                Отмена
                            </button>
                            <button
                                className={clsx(
                                    styles.modalDeleteButton,
                                    deletingId !== null && styles.modalDeleteButton_loading
                                )}
                                onClick={deleteConnection}
                                disabled={deletingId !== null}
                            >
                                {deletingId !== null ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        Удаление...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faTrashAlt}/>
                                        Удалить
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {terminateProcessModal && (
                <div className={clsx(styles.modalOverlay)} onClick={() => setTerminateProcessModal(null)}>
                    <div
                        className={clsx(styles.modalContent)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon
                                icon={faExclamationCircle}
                                className={clsx(styles.modalIcon)}
                            />
                            <h2 className={clsx(styles.modalTitle)}>
                                {terminateProcessModal.title}
                            </h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>{terminateProcessModal.message}</p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button
                                className={clsx(styles.modalCancelButton)}
                                onClick={() => setTerminateProcessModal(null)}
                            >
                                Понятно
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {userDeleteTarget !== null && (
                <div className={clsx(styles.modalOverlay)} onClick={closeUserDeleteConfirm}>
                    <div
                        className={clsx(styles.modalContent)}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon
                                icon={faExclamationCircle}
                                className={clsx(styles.modalIcon)}
                            />
                            <h2 className={clsx(styles.modalTitle)}>
                                {t('users.delete.confirm_title')}
                            </h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>
                                {t('users.delete.confirm_prefix')} <strong>{userDeleteTarget.name}</strong>?
                            </p>
                            <p className={clsx(styles.modalWarning)}>
                                <FontAwesomeIcon icon={faExclamationCircle}/>
                                {t('users.delete.warning')}
                            </p>
                            {userDeleteError && (
                                <pre className={clsx(styles.modalErrorBox)}>{userDeleteError}</pre>
                            )}
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button
                                className={clsx(styles.modalCancelButton)}
                                onClick={closeUserDeleteConfirm}
                                disabled={deletingUserOid !== null}
                            >
                                {t('users.cancel')}
                            </button>
                            <button
                                className={clsx(
                                    styles.modalDeleteButton,
                                    deletingUserOid !== null && styles.modalDeleteButton_loading
                                )}
                                onClick={deleteUser}
                                disabled={deletingUserOid !== null}
                            >
                                {deletingUserOid !== null ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin/>
                                        {t('users.deleting')}
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faTrashAlt}/>
                                        {t('users.delete')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {groupDeleteTarget !== null && (
                <div className={clsx(styles.modalOverlay)} onClick={closeGroupDeleteConfirm}>
                    <div className={clsx(styles.modalContent)} onClick={(e) => e.stopPropagation()}>
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon icon={faExclamationCircle} className={clsx(styles.modalIcon)}/>
                            <h2 className={clsx(styles.modalTitle)}>{t('groups.delete.confirm_title')}</h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>
                                {t('groups.delete.confirm_prefix')} <strong>{groupDeleteTarget.name}</strong>?
                            </p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button className={clsx(styles.modalCancelButton)} onClick={closeGroupDeleteConfirm} disabled={deletingGroupOid !== null}>{t('groups.cancel')}</button>
                            <button className={clsx(styles.modalDeleteButton)} onClick={deleteGroup} disabled={deletingGroupOid !== null}>
                                {deletingGroupOid !== null ? <>
                                    <FontAwesomeIcon icon={faSpinner} spin/> {t('groups.deleting')}</> : <><FontAwesomeIcon icon={faTrashAlt}/> {t('groups.delete')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {groupDeleteErrorModal !== null && (
                <div className={clsx(styles.modalOverlay)} onClick={() => setGroupDeleteErrorModal(null)}>
                    <div className={clsx(styles.modalContent)} onClick={(e) => e.stopPropagation()}>
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon icon={faExclamationCircle} className={clsx(styles.modalIcon)}/>
                            <h2 className={clsx(styles.modalTitle)}>{t('groups.delete.error_title')}</h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)} style={{whiteSpace: 'pre-line'}}>
                                {groupDeleteErrorModal}
                            </p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button className={clsx(styles.modalCancelButton)} onClick={() => setGroupDeleteErrorModal(null)}>
                                {t('groups.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {isCreateGroupModalOpen && (
                <div className={clsx(groupModalStyles.modal__overlay)} onClick={closeGroupModal}>
                    <div className={clsx(groupModalStyles.modal__content)} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={clsx(groupModalStyles.modal__closeButton)}
                            onClick={closeGroupModal}
                            disabled={groupFormLoading}
                            aria-label={t('groups.modal.close')}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>{editingGroup ? t('groups.edit.title') : t('groups.create.title')}</h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{editingGroup ? editingGroup.name : t('groups.create.new')}</p>
                        </div>
                        <form className={clsx(groupModalStyles.modal__form)} onSubmit={saveGroup}>
                            <div className={clsx(groupModalStyles.modal__formGroup)}>
                                <label className={clsx(groupModalStyles.modal__label)} htmlFor="groupName">{t('groups.form.name')}</label>
                                <input
                                    id="groupName"
                                    className={clsx(groupModalStyles.modal__input)}
                                    value={groupFormName}
                                    onChange={(e) => setGroupFormName(e.target.value)}
                                    disabled={groupFormLoading}
                                    placeholder={t('groups.form.name_placeholder')}
                                />
                            </div>
                            <div className={clsx(groupModalStyles.modal__formGroup)}>
                                <label className={clsx(groupModalStyles.modal__label)} htmlFor="groupDescription">{t('groups.form.description')}</label>
                                <textarea
                                    id="groupDescription"
                                    className={clsx(groupModalStyles.modal__textarea)}
                                    value={groupFormDescription}
                                    onChange={(e) => setGroupFormDescription(e.target.value)}
                                    disabled={groupFormLoading}
                                    rows={3}
                                    placeholder={t('groups.form.description_placeholder')}
                                />
                            </div>
                            <div className={clsx(groupModalStyles.modal__formFooter)}>
                                <button type="button" className={clsx(groupModalStyles.modal__cancelButton)} onClick={closeGroupModal} disabled={groupFormLoading}>{t('groups.cancel')}</button>
                                <button type="submit" className={clsx(groupModalStyles.modal__submitButton)} disabled={groupFormLoading}>
                                    {groupFormLoading ? <><FontAwesomeIcon icon={faSpinner} spin/> {t('groups.saving')}</> : t('groups.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {groupUsersModal !== null && (
                <div className={clsx(groupModalStyles.modal__overlay)} onClick={closeGroupUsersModal}>
                    <div className={clsx(groupModalStyles.modal__content, groupModalStyles.modal__content_wide, styles.groupUsersManagerModal)} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={clsx(groupModalStyles.modal__closeButton)}
                            onClick={closeGroupUsersModal}
                            disabled={groupUsersSaving}
                            aria-label={t('groups.users_manager.close')}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>{t('groups.users_manager.title')}</h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{groupUsersModal.name}</p>
                        </div>
                        <div className={clsx(groupModalStyles.modal__form, styles.groupUsersManager)}>
                            <div className={clsx(groupModalStyles.modal__formGroup, styles.groupUsersManager__controls)}>
                                <div className={clsx(styles.groupUsersManager__toolbar)}>
                                    <div className={clsx(styles.usersSearchWrapper, styles.groupUsersManager__search)}>
                                        <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                        <input
                                            id="groupUserSearch"
                                            type="text"
                                            placeholder={t('groups.users_manager.search_user')}
                                            value={groupUserSearchQuery}
                                            onChange={(e) => setGroupUserSearchQuery(e.target.value)}
                                            className={clsx(styles.usersSearchInput)}
                                            disabled={groupUsersLoading || groupUsersSaving || allUsersForGroup.length === 0}
                                        />
                                        {groupUserSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setGroupUserSearchQuery('')}
                                                className={clsx(styles.usersSearchClear)}
                                                title={t('groups.search_clear')}
                                            >
                                                <FontAwesomeIcon icon={faTimes}/>
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className={clsx(styles.createUserButton, styles.groupUsersManager__addButton)}
                                        onClick={saveGroupUsersSelection}
                                        disabled={groupUsersSaving || groupUsersLoading}
                                    >
                                        {groupUsersSaving ? <><FontAwesomeIcon icon={faSpinner} spin/> {t('groups.saving')}</> : t('groups.save')}
                                    </button>
                                </div>
                                <p className={clsx(styles.groupUsersManager__hint)}>
                                    {t('groups.users_manager.selection_hint')}
                                </p>
                            </div>

                            {groupUsersLoading ? (
                                <div className={clsx(styles.usersLoading)}>
                                    <div className={clsx(styles.spinner)}>
                                        <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                    </div>
                                    <p>{t('groups.users_manager.loading')}</p>
                                </div>
                            ) : (
                                <div className={clsx(styles.groupUsersManager__list)}>
                                    {filteredUsersForGroupManagement.length > 0 ? filteredUsersForGroupManagement.map((user) => (
                                        <div key={user.oid} className={clsx(styles.groupUsersManager__memberRow)}>
                                            <label className={clsx(styles.groupUsersManager__checkboxLabel)}>
                                                <input
                                                    type="checkbox"
                                                    className={clsx(styles.groupUsersManager__checkbox)}
                                                    checked={selectedGroupUserOids.includes(user.oid)}
                                                    onChange={() => toggleGroupUserSelection(user.oid)}
                                                    disabled={groupUsersSaving}
                                                />
                                            </label>
                                            <div className={clsx(styles.groupUsersManager__memberInfo)}>
                                                <h3 className={clsx(styles.groupUsersManager__memberName)}>{user.name}</h3>
                                                <span className={clsx(styles.groupUsersManager__memberMeta)}>OID: {user.oid}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className={clsx(styles.usersEmpty, styles.groupUsersManager__empty)}>
                                            <FontAwesomeIcon icon={faUsers} size="2x"/>
                                            <p>{t('groups.users_manager.empty_filtered')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {editingSchema !== null && (
                <div className={clsx(groupModalStyles.modal__overlay)} onClick={closeSchemaEditModal}>
                    <div className={clsx(groupModalStyles.modal__content, groupModalStyles.modal__content_wide)} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={clsx(groupModalStyles.modal__closeButton)}
                            onClick={closeSchemaEditModal}
                            disabled={schemaModalLoading}
                            aria-label="Закрыть окно редактирования схемы"
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>Редактирование схемы</h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{editingSchema.schema_name}</p>
                        </div>
                        <form className={clsx(groupModalStyles.modal__form)} onSubmit={saveSchemaPrivileges}>
                            <div className={clsx(styles.schemaBulkPrivilegeHeaderRow)}>
                                <div className={clsx(styles.bulkPrivilegeHeaderSpacer)}></div>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getSchemaPrivilegeButtonState('create') === 'all' && styles.bulkPrivilegeButton_all,
                                        getSchemaPrivilegeButtonState('create') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setSchemaPrivilegeForAllRoles('create')}
                                    disabled={schemaModalLoading || schemaRolesForm.length === 0}
                                >
                                    CREATE
                                </button>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getSchemaPrivilegeButtonState('usage') === 'all' && styles.bulkPrivilegeButton_all,
                                        getSchemaPrivilegeButtonState('usage') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setSchemaPrivilegeForAllRoles('usage')}
                                    disabled={schemaModalLoading || schemaRolesForm.length === 0}
                                >
                                    USAGE
                                </button>
                            </div>
                            <div className={clsx(styles.schemasPrivilegesList)}>
                                {schemaRolesForm.map((role) => (
                                    <div key={role.role} className={clsx(styles.schemasPrivilegeRow)}>
                                        <div className={clsx(styles.schemasPrivilegeRole)}>{role.role}</div>
                                        <div className={clsx(styles.schemasPrivilegeCell)}>
                                            <input
                                                type="checkbox"
                                                className={clsx(styles.schemasPrivilegeCheckbox)}
                                                checked={role.create}
                                                onChange={() => toggleSchemaRolePrivilege(role.role, 'create')}
                                                disabled={schemaModalLoading}
                                                aria-label={`Привилегия CREATE для роли ${role.role}`}
                                            />
                                        </div>
                                        <div className={clsx(styles.schemasPrivilegeCell)}>
                                            <input
                                                type="checkbox"
                                                className={clsx(styles.schemasPrivilegeCheckbox)}
                                                checked={role.usage}
                                                onChange={() => toggleSchemaRolePrivilege(role.role, 'usage')}
                                                disabled={schemaModalLoading}
                                                aria-label={`Привилегия USAGE для роли ${role.role}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className={clsx(groupModalStyles.modal__formFooter)}>
                                <button type="button" className={clsx(groupModalStyles.modal__cancelButton)} onClick={closeSchemaEditModal} disabled={schemaModalLoading}>Отмена</button>
                                <button type="submit" className={clsx(groupModalStyles.modal__submitButton)} disabled={schemaModalLoading}>
                                    {schemaModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin/> Сохранение...</> : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {editingView !== null && (
                <div className={clsx(groupModalStyles.modal__overlay)} onClick={closeViewEditModal}>
                    <div className={clsx(groupModalStyles.modal__content, groupModalStyles.modal__content_wide)} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={clsx(groupModalStyles.modal__closeButton)}
                            onClick={closeViewEditModal}
                            disabled={viewModalLoading}
                            aria-label="Закрыть окно редактирования представления"
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>
                                {viewsFilterType === 'materialized_views' ? 'Редактирование материализованного представления' : 'Редактирование представления'}
                            </h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{editingView.schema_name}.{editingView.view_name}</p>
                        </div>
                        <form className={clsx(groupModalStyles.modal__form)} onSubmit={saveViewPrivileges}>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>
                                Привилегии CREATE/USAGE задаются на уровне схемы <b>{editingView.schema_name}</b>.
                                Поэтому изменения автоматически применяются ко всем объектам схемы,
                                включая обычные и материализованные представления.
                            </p>
                            <div className={clsx(styles.schemaBulkPrivilegeHeaderRow)}>
                                <div className={clsx(styles.bulkPrivilegeHeaderSpacer)}></div>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getViewPrivilegeButtonState('create') === 'all' && styles.bulkPrivilegeButton_all,
                                        getViewPrivilegeButtonState('create') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setViewPrivilegeForAllGroups('create')}
                                    disabled={viewModalLoading}
                                >
                                    CREATE
                                </button>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getViewPrivilegeButtonState('usage') === 'all' && styles.bulkPrivilegeButton_all,
                                        getViewPrivilegeButtonState('usage') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setViewPrivilegeForAllGroups('usage')}
                                    disabled={viewModalLoading}
                                >
                                    USAGE
                                </button>
                            </div>
                            <div className={clsx(styles.tableGroupsSearchPanel)}>
                                <div className={clsx(styles.tableGroupsSearchHeader)}>
                                    <label className={clsx(styles.tableGroupsSearchLabel)} htmlFor="viewGroupsSearch">Поиск групп</label>
                                    <span className={clsx(styles.tableGroupsSearchMeta)}>
                                        Найдено: {filteredViewGroupsForm.length} из {viewGroupsForm.length}
                                    </span>
                                </div>
                                <div className={clsx(styles.usersSearchWrapper)}>
                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                    <input
                                        id="viewGroupsSearch"
                                        type="text"
                                        placeholder="Введите название группы"
                                        value={viewGroupSearchQuery}
                                        onChange={(e) => setViewGroupSearchQuery(e.target.value)}
                                        className={clsx(styles.usersSearchInput)}
                                        disabled={viewModalLoading}
                                    />
                                    {viewGroupSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setViewGroupSearchQuery('')}
                                            className={clsx(styles.usersSearchClear)}
                                            title="Очистить поиск групп"
                                            disabled={viewModalLoading}
                                        >
                                            <FontAwesomeIcon icon={faTimes}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className={clsx(styles.schemasPrivilegesList)}>
                                {filteredViewGroupsForm.length > 0 ? (
                                    filteredViewGroupsForm.map((group) => (
                                        <div key={group.role} className={clsx(styles.schemasPrivilegeRow)}>
                                            <div className={clsx(styles.schemasPrivilegeRole)}>{group.role}</div>
                                            <div className={clsx(styles.schemasPrivilegeCell)}>
                                                <input
                                                    type="checkbox"
                                                    className={clsx(styles.schemasPrivilegeCheckbox)}
                                                    checked={group.create}
                                                    onChange={() => toggleViewGroupPrivilege(group.role, 'create')}
                                                    disabled={viewModalLoading}
                                                />
                                            </div>
                                            <div className={clsx(styles.schemasPrivilegeCell)}>
                                                <input
                                                    type="checkbox"
                                                    className={clsx(styles.schemasPrivilegeCheckbox)}
                                                    checked={group.usage}
                                                    onChange={() => toggleViewGroupPrivilege(group.role, 'usage')}
                                                    disabled={viewModalLoading}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={clsx(styles.tableGroupsSearchEmpty)}>
                                        Группы по указанному фильтру не найдены
                                    </div>
                                )}
                            </div>
                            <div className={clsx(groupModalStyles.modal__formFooter)}>
                                <button type="button" className={clsx(groupModalStyles.modal__cancelButton)} onClick={closeViewEditModal} disabled={viewModalLoading}>Отмена</button>
                                <button type="submit" className={clsx(groupModalStyles.modal__submitButton)} disabled={viewModalLoading}>
                                    {viewModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin/> Сохранение...</> : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {editingTable !== null && (
                <div className={clsx(groupModalStyles.modal__overlay)} onClick={closeTableEditModal}>
                    <div className={clsx(groupModalStyles.modal__content, groupModalStyles.modal__content_wide)} onClick={(e) => e.stopPropagation()}>
                        <button
                            className={clsx(groupModalStyles.modal__closeButton)}
                            onClick={closeTableEditModal}
                            disabled={tableModalLoading}
                            aria-label={t('tables.edit.close')}
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>{t('tables.edit.title')}</h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{editingTable.schema_name}.{editingTable.table_name}</p>
                        </div>
                        <form className={clsx(groupModalStyles.modal__form)} onSubmit={saveTablePrivileges}>
                            <div className={clsx(styles.bulkPrivilegeHeaderRow)}>
                                <div className={clsx(styles.bulkPrivilegeHeaderSpacer)}></div>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getTablePrivilegeButtonState('select') === 'all' && styles.bulkPrivilegeButton_all,
                                        getTablePrivilegeButtonState('select') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setTablePrivilegeForAllGroups('select')}
                                    disabled={tableModalLoading}
                                >
                                    SELECT
                                </button>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getTablePrivilegeButtonState('insert') === 'all' && styles.bulkPrivilegeButton_all,
                                        getTablePrivilegeButtonState('insert') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setTablePrivilegeForAllGroups('insert')}
                                    disabled={tableModalLoading}
                                >
                                    INSERT
                                </button>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getTablePrivilegeButtonState('update') === 'all' && styles.bulkPrivilegeButton_all,
                                        getTablePrivilegeButtonState('update') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setTablePrivilegeForAllGroups('update')}
                                    disabled={tableModalLoading}
                                >
                                    UPDATE
                                </button>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getTablePrivilegeButtonState('delete') === 'all' && styles.bulkPrivilegeButton_all,
                                        getTablePrivilegeButtonState('delete') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setTablePrivilegeForAllGroups('delete')}
                                    disabled={tableModalLoading}
                                >
                                    DELETE
                                </button>
                                <button
                                    type="button"
                                    className={clsx(
                                        styles.bulkPrivilegeButton,
                                        getTablePrivilegeButtonState('truncate') === 'all' && styles.bulkPrivilegeButton_all,
                                        getTablePrivilegeButtonState('truncate') === 'partial' && styles.bulkPrivilegeButton_partial,
                                    )}
                                    onClick={() => setTablePrivilegeForAllGroups('truncate')}
                                    disabled={tableModalLoading}
                                >
                                    TRUNCATE
                                </button>
                            </div>
                            <div className={clsx(styles.tableGroupsSearchPanel)}>
                                <div className={clsx(styles.tableGroupsSearchHeader)}>
                                    <label className={clsx(styles.tableGroupsSearchLabel)} htmlFor="tableGroupsSearch">{t('tables.edit.search_groups')}</label>
                                    <span className={clsx(styles.tableGroupsSearchMeta)}>
                                        {t('tables.edit.found')}: {filteredTableGroupsForm.length} {t('tables.pagination.of')} {tableGroupsForm.length}
                                    </span>
                                </div>
                                <div className={clsx(styles.usersSearchWrapper)}>
                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                    <input
                                        id="tableGroupsSearch"
                                        type="text"
                                        placeholder={t('tables.edit.group_name_placeholder')}
                                        value={tableGroupSearchQuery}
                                        onChange={(e) => setTableGroupSearchQuery(e.target.value)}
                                        className={clsx(styles.usersSearchInput)}
                                        disabled={tableModalLoading}
                                    />
                                    {tableGroupSearchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setTableGroupSearchQuery('')}
                                            className={clsx(styles.usersSearchClear)}
                                            title={t('tables.edit.clear_groups_search')}
                                            disabled={tableModalLoading}
                                        >
                                            <FontAwesomeIcon icon={faTimes}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className={clsx(styles.schemasPrivilegesList)}>
                                {filteredTableGroupsForm.length > 0 ? (
                                    filteredTableGroupsForm.map((group) => (
                                        <div key={group.group} className={clsx(styles.tablePrivilegeRow)}>
                                            <div className={clsx(styles.tablePrivilegeRole)}>{group.group}</div>
                                            <label className={clsx(styles.tablePrivilegeCell)}>
                                                <input type="checkbox" checked={group.select} onChange={() => toggleTableGroupPrivilege(group.group, 'select')} disabled={tableModalLoading}/>
                                            </label>
                                            <label className={clsx(styles.tablePrivilegeCell)}>
                                                <input type="checkbox" checked={group.insert} onChange={() => toggleTableGroupPrivilege(group.group, 'insert')} disabled={tableModalLoading}/>
                                            </label>
                                            <label className={clsx(styles.tablePrivilegeCell)}>
                                                <input type="checkbox" checked={group.update} onChange={() => toggleTableGroupPrivilege(group.group, 'update')} disabled={tableModalLoading}/>
                                            </label>
                                            <label className={clsx(styles.tablePrivilegeCell)}>
                                                <input type="checkbox" checked={group.delete} onChange={() => toggleTableGroupPrivilege(group.group, 'delete')} disabled={tableModalLoading}/>
                                            </label>
                                            <label className={clsx(styles.tablePrivilegeCell)}>
                                                <input type="checkbox" checked={group.truncate} onChange={() => toggleTableGroupPrivilege(group.group, 'truncate')} disabled={tableModalLoading}/>
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <div className={clsx(styles.tableGroupsSearchEmpty)}>
                                        {t('tables.edit.groups_not_found')}
                                    </div>
                                )}
                            </div>
                            <div className={clsx(groupModalStyles.modal__formFooter)}>
                                <button type="button" className={clsx(groupModalStyles.modal__cancelButton)} onClick={closeTableEditModal} disabled={tableModalLoading}>{t('tables.edit.cancel')}</button>
                                <button type="submit" className={clsx(groupModalStyles.modal__submitButton)} disabled={tableModalLoading}>
                                    {tableModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin/> {t('tables.edit.saving')}</> : t('tables.edit.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Модальное окно редактирования подключения */}
            {isEditModalOpen && editingConnection && (
                <EditConnectionModal
                    connection={editingConnection}
                    onClose={closeEditModal}
                    onSuccess={handleEditSuccess}
                />
            )}
            {/* Модальное окно редактирования пользователя */}
            {isEditUserModalOpen && editingUser && (
                <EditUserModal
                    connectionId={parseInt(id || '0')}
                    user={editingUser}
                    onClose={closeEditUserModal}
                    onSuccess={handleEditUserSuccess}
                />
            )}
            {/* Модальное окно создания пользователя */}
            {isCreateUserModalOpen && (
                <CreateUserModal
                    connectionId={parseInt(id || '0')}
                    onClose={closeCreateUserModal}
                    onSuccess={handleCreateUserSuccess}
                />
            )}
        </section>
    );
}
