// frontend/src/pages/connections/ui/detail-page.tsx
import React, {useEffect, useMemo, useState} from 'react';
import {useParams, useNavigate} from 'react-router';
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
    faUserMinus,
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
import {CreateUserModal} from "@pages/connections/ui/CreateUserModal.tsx";
import { PAGE_SIZES } from '@pages/connections/model/detail-page-constants';
import type { Connection, EditingUser, GroupUser, TabType, TablesFilterType, ViewsFilterType } from '@pages/connections/model/detail-page-types';
import { formatDateTime, formatStartTime, formatUptime } from '@pages/connections/lib/detail-page/formatters';
import { useConnectionDetailCore } from '@pages/connections/lib/detail-page/useConnectionDetailCore';
import { DetailTabNavigation } from '@pages/connections/ui/detail-page/tab-navigation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

type ActivityChartPoint = {
    timestamp: string;
    total: number;
    select: number;
    insert: number;
    update: number;
    delete: number;
    other: number;
};

const detectQueryOperation = (query: string | null | undefined): keyof Omit<ActivityChartPoint, 'timestamp' | 'total'> => {
    const normalized = (query || '').trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'select';
    if (normalized.startsWith('INSERT')) return 'insert';
    if (normalized.startsWith('UPDATE')) return 'update';
    if (normalized.startsWith('DELETE')) return 'delete';
    return 'other';
};

export default function ConnectionDetailPage() {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
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
    const [activeTab, setActiveTab] = useState<TabType>('metrics');
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
    const [selectedUserOid, setSelectedUserOid] = useState('');
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
    const [isActivityChartModalOpen, setIsActivityChartModalOpen] = useState(false);
    const [activityChartReloadTrigger, setActivityChartReloadTrigger] = useState(0);
    const [activityChartPoints, setActivityChartPoints] = useState<ActivityChartPoint[]>([]);
    const [terminatingPid, setTerminatingPid] = useState<number | null>(null);
    const [terminateProcessModal, setTerminateProcessModal] = useState<{ title: string; message: string } | null>(null);

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
    } = useConnectionActiveQueries(
        id ? parseInt(id) : 0,
        1,
        200,
        null,
        null,
        null,
        activityChartReloadTrigger,
    );

    useEffect(() => {
        if (activeTab === 'metrics' && !metrics) {
            loadMetrics();
        }
    }, [activeTab, metrics, loadMetrics]);

    useEffect(() => {
        if (!isActivityChartModalOpen) return;

        setActivityChartReloadTrigger((prev) => prev + 1);
        const intervalId = window.setInterval(() => {
            setActivityChartReloadTrigger((prev) => prev + 1);
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [isActivityChartModalOpen]);

    useEffect(() => {
        if (!isActivityChartModalOpen || chartLoadingActiveQueries) return;

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
    }, [chartTotalActiveQueries, chartLoadingActiveQueries, isActivityChartModalOpen, chartActiveQueries]);

    const activityChartModel = useMemo(() => {
        const width = 860;
        const height = 280;
        const axis = {left: 56, right: 24, top: 20, bottom: 44};
        const innerWidth = width - axis.left - axis.right;
        const innerHeight = height - axis.top - axis.bottom;

        if (activityChartPoints.length === 0) {
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
                topValue: 1,
                latestPoint: null as ActivityChartPoint | null,
            };
        }

        const values = activityChartPoints.flatMap((p) => [p.total, p.select, p.insert, p.update, p.delete, p.other]);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const avgValue = Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 10) / 10;
        const topValue = Math.max(maxValue, 1);

        const buildPolyline = (key: keyof Omit<ActivityChartPoint, 'timestamp'>) =>
            activityChartPoints
                .map((point, index) => {
                    const x = axis.left + (index / Math.max(activityChartPoints.length - 1, 1)) * innerWidth;
                    const y = axis.top + innerHeight - ((point[key] as number) / topValue) * innerHeight;
                    return `${x},${y}`;
                })
                .join(' ');

        const yTicks = [0, 0.25, 0.5, 0.75, 1].map((part) => Math.round(topValue * part));

        const xTickIndexes = [0, 0.5, 1]
            .map((part) => Math.round((activityChartPoints.length - 1) * part))
            .filter((idx, pos, arr) => arr.indexOf(idx) === pos);

        const xTickLabels = xTickIndexes.map((idx) => ({
            x: axis.left + (idx / Math.max(activityChartPoints.length - 1, 1)) * innerWidth,
            label: activityChartPoints[idx]?.timestamp ?? '',
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
            topValue,
            latestPoint: activityChartPoints[activityChartPoints.length - 1],
        };
    }, [activityChartPoints]);

    const closeActivityChartModal = () => {
        setIsActivityChartModalOpen(false);
        setActivityChartPoints([]);
    };

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
            setError('Название группы обязательно');
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

            setGroupUsers(groupData.users || []);
            setAllUsersForGroup(usersData.items || []);
        } catch (err) {
            console.error('Ошибка при загрузке пользователей группы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей группы');
        } finally {
            setGroupUsersLoading(false);
        }
    };

    const openGroupUsersModal = async (group: { oid: number; name: string; user_count: number }) => {
        setGroupUsersModal({oid: group.oid, name: group.name, userCount: groupUserCountOverrides[group.oid] ?? group.user_count});
        setSelectedUserOid('');
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
        setSelectedUserOid('');
        setGroupUserSearchQuery('');
    };

    const addUserToGroup = async () => {
        if (!groupUsersModal || !selectedUserOid) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setGroupUsersSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/groups/${groupUsersModal.oid}/add_user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({user_oid: Number(selectedUserOid)}),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось добавить пользователя в группу');
            }

            const addedUserOid = Number(selectedUserOid);
            const alreadyInGroup = groupUsers.some((user) => user.oid === addedUserOid);
            const addedUser = allUsersForGroup.find((user) => user.oid === addedUserOid);
            if (addedUser) {
                setGroupUsers((prev) => (prev.some((user) => user.oid === addedUserOid) ? prev : [...prev, addedUser]));
            }
            if (!alreadyInGroup) {
                setGroupUserCountOverrides((prev) => {
                    const currentCount = prev[groupUsersModal.oid] ?? groupUsersModal.userCount;
                    return {...prev, [groupUsersModal.oid]: currentCount + 1};
                });
            }
            setSelectedUserOid('');
        } catch (err) {
            console.error('Ошибка при добавлении пользователя в группу:', err);
            setError(err instanceof Error ? err.message : 'Не удалось добавить пользователя в группу');
        } finally {
            setGroupUsersSaving(false);
        }
    };

    const removeUserFromGroup = async (userOid: number) => {
        if (!groupUsersModal) return;

        const token = localStorage.getItem('access_token');
        if (!token) {
            navigate('/login');
            return;
        }

        setGroupUsersSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/db_connections/${id}/groups/${groupUsersModal.oid}/remove_user`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({user_oid: userOid}),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData?.detail || 'Не удалось удалить пользователя из группы');
            }

            const userExists = groupUsers.some((user) => user.oid === userOid);
            setGroupUsers((prev) => prev.filter((user) => user.oid !== userOid));
            if (userExists) {
                setGroupUserCountOverrides((prev) => {
                    const currentCount = prev[groupUsersModal.oid] ?? groupUsersModal.userCount;
                    return {...prev, [groupUsersModal.oid]: Math.max(0, currentCount - 1)};
                });
            }
        } catch (err) {
            console.error('Ошибка при удалении пользователя из группы:', err);
            setError(err instanceof Error ? err.message : 'Не удалось удалить пользователя из группы');
        } finally {
            setGroupUsersSaving(false);
        }
    };

    const availableUsersForAdd = allUsersForGroup.filter((user) => !groupUsers.some((groupUser) => groupUser.oid === user.oid));
    const filteredAvailableUsersForAdd = availableUsersForAdd.filter((user) => user.name.toLowerCase().includes(groupUserSearchQuery.trim().toLowerCase()));
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
                        </div>
                        <DetailTabNavigation
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
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
                        />
                        <div className={clsx(styles.tabContent)}>
                            {activeTab === 'metrics' && (
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
                                            {/* Кнопки действий - отображаются ТОЛЬКО на вкладке "Информация" */}
                                            {activeTab === 'metrics' && (
                                                <div className={clsx(styles.cardFooter)}>
                                                    <div className={clsx(styles.cardFooterRight)}>
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
                                                </div>
                                            )}
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
                            {activeTab === 'users' && (
                                <div className={clsx(styles.usersContent)}>
                                    {/* Панель поиска */}
                                    <div className={clsx(styles.usersHeader)}>
                                        <form
                                            onSubmit={handleUsersSearchSubmit}
                                            className={clsx(styles.usersSearchContainer)}
                                        >
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
Показано <span className={clsx(styles.paginationHighlight)}>{((usersPage - 1) * usersPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(usersPage * usersPageSize, totalUsers)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalUsers}</span> пользователей
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
                                                                    {size} на странице
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleUsersFirstPage}
                                                                disabled={usersPage === 1 || !usersHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleUsersPageChange(usersPage - 1)}
                                                                disabled={usersPage === 1 || !usersHasPrev}
                                                                title="Предыдущая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>
Страница {usersPage} из {totalUsersPages}
</span>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleUsersPageChange(usersPage + 1)}
                                                                disabled={usersPage === totalUsersPages || !usersHasNext}
                                                                title="Следующая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleUsersLastPage}
                                                                disabled={usersPage === totalUsersPages || !usersHasNext}
                                                                title="Последняя страница"
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
                            {activeTab === 'groups' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleGroupsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск групп"
                                                    value={groupsSearchQuery}
                                                    onChange={handleGroupsSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {groupsSearchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={handleGroupsSearchClear}
                                                        className={clsx(styles.usersSearchClear)}
                                                        title="Очистить поиск"
                                                    >
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">
                                                Поиск
                                            </button>
                                        </form>
                                        <button
                                            className={clsx(styles.createUserButton)}
                                            onClick={openCreateGroupModal}
                                            aria-label="Создать новую группу"
                                        >
                                            Создать группу
                                        </button>
                                        <button
                                            type="button"
                                            className={clsx(styles.refreshButton)}
                                            onClick={refreshGroups}
                                            disabled={loadingGroups}
                                            aria-label="Обновить список групп"
                                            title="Обновить список групп"
                                        >
                                            <FontAwesomeIcon icon={faArrowsRotate} spin={loadingGroups}/>
                                        </button>
                                    </div>

                                    {loadingGroups ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>Загрузка групп...</p>
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
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Пользователей:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{groupUserCountOverrides[group.oid] ?? group.user_count}</span>
                                                                </div>
                                                                {group.description && (
                                                                    <div className={clsx(styles.userItemInfo)}>
                                                                        <span className={clsx(styles.userItemInfoLabel, styles.userItemInfoLabel_aligned)}>Описание:</span>
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
Показано <span className={clsx(styles.paginationHighlight)}>{((groupsPage - 1) * groupsPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(groupsPage * groupsPageSize, totalGroups)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalGroups}</span> групп
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={groupsPageSize} onChange={handleGroupsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleGroupsFirstPage}
                                                                disabled={groupsPage === 1 || !groupsHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleGroupsPageChange(groupsPage - 1)} disabled={groupsPage === 1 || !groupsHasPrev} title="Предыдущая страница">
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {groupsPage} из {totalGroupsPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleGroupsPageChange(groupsPage + 1)} disabled={groupsPage === totalGroupsPages || !groupsHasNext} title="Следующая страница">
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleGroupsLastPage}
                                                                disabled={groupsPage === totalGroupsPages || !groupsHasNext}
                                                                title="Последняя страница"
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
                                            <p>Группы не найдены</p>
                                            {groupsError && <p className={clsx(styles.errorMessage)}>{groupsError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'schemas' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleSchemasSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск схем"
                                                    value={schemasSearchQuery}
                                                    onChange={handleSchemasSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {schemasSearchQuery && (
                                                    <button type="button" onClick={handleSchemasSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshSchemas}
                                                disabled={loadingSchemas}
                                                aria-label="Обновить список схем"
                                                title="Обновить список схем"
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
                                            <p>Загрузка схем...</p>
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
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Владелец:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{schema.owner}</span>
                                                                </div>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Ролей:</span>
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
Показано <span className={clsx(styles.paginationHighlight)}>{((schemasPage - 1) * schemasPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(schemasPage * schemasPageSize, totalSchemas)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalSchemas}</span> схем
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={schemasPageSize} onChange={handleSchemasPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleSchemasFirstPage}
                                                                disabled={schemasPage === 1 || !schemasHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleSchemasPageChange(schemasPage - 1)} disabled={schemasPage === 1 || !schemasHasPrev} title="Предыдущая страница">
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {schemasPage} из {totalSchemasPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleSchemasPageChange(schemasPage + 1)} disabled={schemasPage === totalSchemasPages || !schemasHasNext} title="Следующая страница">
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleSchemasLastPage}
                                                                disabled={schemasPage === totalSchemasPages || !schemasHasNext}
                                                                title="Последняя страница"
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
                            {activeTab === 'tables' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleTablesSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <select value={tablesFilterType} onChange={handleTablesFilterTypeChange} className={clsx(styles.usersFilterSelect)}>
                                                <option value="regular">Обычные таблицы</option>
                                                <option value="temporary">Временные таблицы</option>
                                                <option value="all">Все таблицы</option>
                                            </select>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск по имени таблицы и владельцу"
                                                    value={tablesSearchQuery}
                                                    onChange={handleTablesSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {tablesSearchQuery && (
                                                    <button type="button" onClick={handleTablesSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshTables}
                                                disabled={loadingTables}
                                                aria-label="Обновить список таблиц"
                                                title="Обновить список таблиц"
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
                                            <p>Загрузка таблиц...</p>
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
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Владелец:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{table.owner}</span>
                                                                </div>
                                                                <div className={clsx(styles.userItemInfo)}>
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Групп:</span>
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
Показано <span className={clsx(styles.paginationHighlight)}>{((tablesPage - 1) * tablesPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(tablesPage * tablesPageSize, totalTables)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalTables}</span> таблиц
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={tablesPageSize} onChange={handleTablesPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleTablesFirstPage}
                                                                disabled={tablesPage === 1 || !tablesHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleTablesPageChange(tablesPage - 1)} disabled={tablesPage === 1 || !tablesHasPrev} title="Предыдущая страница">
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {tablesPage} из {totalTablesPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleTablesPageChange(tablesPage + 1)} disabled={tablesPage === totalTablesPages || !tablesHasNext} title="Следующая страница">
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleTablesLastPage}
                                                                disabled={tablesPage === totalTablesPages || !tablesHasNext}
                                                                title="Последняя страница"
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
                                            <p>Таблицы не найдены</p>
                                            {tablesError && <p className={clsx(styles.errorMessage)}>{tablesError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'views' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        {viewsFilterType === 'views' ? (
                                            <form onSubmit={handleViewsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                                <select value={viewsFilterType} onChange={handleViewsFilterTypeChange} className={clsx(styles.usersFilterSelect)}>
                                                    <option value="views">Представления</option>
                                                    <option value="materialized_views">Материализованные представления</option>
                                                </select>
                                                <div className={clsx(styles.usersSearchWrapper)}>
                                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                    <input
                                                        type="text"
                                                        placeholder="Поиск представлений"
                                                        value={viewsSearchQuery}
                                                        onChange={handleViewsSearchInputChange}
                                                        className={clsx(styles.usersSearchInput)}
                                                    />
                                                    {viewsSearchQuery && (
                                                        <button type="button" onClick={handleViewsSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                        </button>
                                                    )}
                                                </div>
                                                <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                                <button
                                                    type="button"
                                                    className={clsx(styles.refreshButton)}
                                                    onClick={refreshViews}
                                                    disabled={loadingViews || loadingMaterializedViews}
                                                    aria-label="Обновить список представлений"
                                                    title="Обновить список представлений"
                                                >
                                                    <FontAwesomeIcon icon={faArrowsRotate} spin={loadingViews || loadingMaterializedViews}/>
                                                </button>
                                            </form>
                                        ) : (
                                            <form onSubmit={handleMaterializedViewsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                                <select value={viewsFilterType} onChange={handleViewsFilterTypeChange} className={clsx(styles.usersFilterSelect)}>
                                                    <option value="views">Представления</option>
                                                    <option value="materialized_views">Материализованные представления</option>
                                                </select>
                                                <div className={clsx(styles.usersSearchWrapper)}>
                                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                    <input
                                                        type="text"
                                                        placeholder="Поиск материализованных представлений..."
                                                        value={materializedViewsSearchQuery}
                                                        onChange={handleMaterializedViewsSearchInputChange}
                                                        className={clsx(styles.usersSearchInput)}
                                                    />
                                                    {materializedViewsSearchQuery && (
                                                        <button type="button" onClick={handleMaterializedViewsSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                            <FontAwesomeIcon icon={faTimes}/>
                                                        </button>
                                                    )}
                                                </div>
                                                <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                                <button
                                                    type="button"
                                                    className={clsx(styles.refreshButton)}
                                                    onClick={refreshViews}
                                                    disabled={loadingViews || loadingMaterializedViews}
                                                    aria-label="Обновить список представлений"
                                                    title="Обновить список представлений"
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
                                                <p>Загрузка представлений...</p>
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
                                                        <p>Представления не найдены</p>
                                                        {viewsError && <p className={clsx(styles.errorMessage)}>{viewsError}</p>}
                                                        {viewsPrivilegesError && <p className={clsx(styles.errorMessage)}>{viewsPrivilegesError}</p>}
                                                    </div>
                                                )}
                                                {resolvedViewsTotal > 0 && (
                                                    <div className={clsx(styles.pagination)}>
                                                        <div className={clsx(styles.paginationInfo)}>
                                                            <span className={clsx(styles.paginationText)}>
                                                                Показано <span className={clsx(styles.paginationHighlight)}>{((viewsPage - 1) * viewsPageSize) + 1}</span>–
                                                                <span className={clsx(styles.paginationHighlight)}>{Math.min(viewsPage * viewsPageSize, resolvedViewsTotal)}</span> из <span className={clsx(styles.paginationHighlight)}>{resolvedViewsTotal}</span> представлений
                                                            </span>
                                                        </div>
                                                        <div className={clsx(styles.paginationControls)}>
                                                            <select value={viewsPageSize} onChange={handleViewsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                                {PAGE_SIZES.map((size) => (
                                                                    <option key={size} value={size}>{size} на странице</option>
                                                                ))}
                                                            </select>
                                                            <div className={clsx(styles.paginationButtons)}>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_first)} onClick={handleViewsFirstPage} disabled={viewsPage === 1 || !viewsHasPrev} title="Первая страница">
                                                                    <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleViewsPageChange(viewsPage - 1)} disabled={viewsPage === 1 || !viewsHasPrev} title="Предыдущая страница">
                                                                    <FontAwesomeIcon icon={faChevronLeft}/>
                                                                </button>
                                                                <span className={clsx(styles.pageInfo)}>Страница {viewsPage} из {resolvedViewsPages}</span>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleViewsPageChange(viewsPage + 1)} disabled={viewsPage === resolvedViewsPages || !viewsHasNext} title="Следующая страница">
                                                                    <FontAwesomeIcon icon={faChevronRight}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_last)} onClick={handleViewsLastPage} disabled={viewsPage === resolvedViewsPages || !viewsHasNext} title="Последняя страница">
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
                                                <p>Загрузка материализованных представлений...</p>
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
                                                        <p>Материализованные представления не найдены</p>
                                                        {materializedViewsError && <p className={clsx(styles.errorMessage)}>{materializedViewsError}</p>}
                                                        {materializedViewsPrivilegesError && <p className={clsx(styles.errorMessage)}>{materializedViewsPrivilegesError}</p>}
                                                    </div>
                                                )}
                                                {resolvedMaterializedViewsTotal > 0 && (
                                                    <div className={clsx(styles.pagination)}>
                                                        <div className={clsx(styles.paginationInfo)}>
                                                            <span className={clsx(styles.paginationText)}>
                                                                Показано <span className={clsx(styles.paginationHighlight)}>{((materializedViewsPage - 1) * materializedViewsPageSize) + 1}</span>–
                                                                <span className={clsx(styles.paginationHighlight)}>{Math.min(materializedViewsPage * materializedViewsPageSize, resolvedMaterializedViewsTotal)}</span> из <span className={clsx(styles.paginationHighlight)}>{resolvedMaterializedViewsTotal}</span> материализованных представлений
                                                            </span>
                                                        </div>
                                                        <div className={clsx(styles.paginationControls)}>
                                                            <select value={materializedViewsPageSize} onChange={handleMaterializedViewsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                                {PAGE_SIZES.map((size) => (
                                                                    <option key={size} value={size}>{size} на странице</option>
                                                                ))}
                                                            </select>
                                                            <div className={clsx(styles.paginationButtons)}>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_first)} onClick={handleMaterializedViewsFirstPage} disabled={materializedViewsPage === 1 || !materializedViewsHasPrev} title="Первая страница">
                                                                    <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleMaterializedViewsPageChange(materializedViewsPage - 1)} disabled={materializedViewsPage === 1 || !materializedViewsHasPrev} title="Предыдущая страница">
                                                                    <FontAwesomeIcon icon={faChevronLeft}/>
                                                                </button>
                                                                <span className={clsx(styles.pageInfo)}>Страница {materializedViewsPage} из {resolvedMaterializedViewsPages}</span>
                                                                <button className={clsx(styles.paginationButton)} onClick={() => handleMaterializedViewsPageChange(materializedViewsPage + 1)} disabled={materializedViewsPage === resolvedMaterializedViewsPages || !materializedViewsHasNext} title="Следующая страница">
                                                                    <FontAwesomeIcon icon={faChevronRight}/>
                                                                </button>
                                                                <button className={clsx(styles.paginationButton, styles.paginationButton_last)} onClick={handleMaterializedViewsLastPage} disabled={materializedViewsPage === resolvedMaterializedViewsPages || !materializedViewsHasNext} title="Последняя страница">
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

                            {activeTab === 'indexes' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleIndexesSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск индексов"
                                                    value={indexesSearchQuery}
                                                    onChange={handleIndexesSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {indexesSearchQuery && (
                                                    <button type="button" onClick={handleIndexesSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshIndexes}
                                                disabled={loadingIndexes}
                                                aria-label="Обновить список индексов"
                                                title="Обновить список индексов"
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
                                            <p>Загрузка индексов...</p>
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
Показано <span className={clsx(styles.paginationHighlight)}>{((indexesPage - 1) * indexesPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(indexesPage * indexesPageSize, resolvedIndexesTotal)}</span> из <span className={clsx(styles.paginationHighlight)}>{resolvedIndexesTotal}</span> индексов
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={indexesPageSize} onChange={handleIndexesPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleIndexesFirstPage}
                                                                disabled={indexesPage === 1 || !indexesHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleIndexesPageChange(indexesPage - 1)}
                                                                disabled={indexesPage === 1 || !indexesHasPrev}
                                                                title="Предыдущая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {indexesPage} из {resolvedIndexesPages}</span>
                                                            <button
                                                                className={clsx(styles.paginationButton)}
                                                                onClick={() => handleIndexesPageChange(indexesPage + 1)}
                                                                disabled={indexesPage === resolvedIndexesPages || !indexesHasNext}
                                                                title="Следующая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleIndexesLastPage}
                                                                disabled={indexesPage === resolvedIndexesPages || !indexesHasNext}
                                                                title="Последняя страница"
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
                                            <p>Индексы не найдены</p>
                                            {indexesError && <p className={clsx(styles.errorMessage)}>{indexesError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'functions' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleFunctionsSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск функций"
                                                    value={functionsSearchQuery}
                                                    onChange={handleFunctionsSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {functionsSearchQuery && (
                                                    <button type="button" onClick={handleFunctionsSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshFunctions}
                                                disabled={loadingFunctions}
                                                aria-label="Обновить список функций"
                                                title="Обновить список функций"
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
                                            <p>Загрузка функций...</p>
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
Показано <span className={clsx(styles.paginationHighlight)}>{((functionsPage - 1) * functionsPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(functionsPage * functionsPageSize, resolvedFunctionsTotal)}</span> из <span className={clsx(styles.paginationHighlight)}>{resolvedFunctionsTotal}</span> функций
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={functionsPageSize} onChange={handleFunctionsPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleFunctionsFirstPage}
                                                                disabled={functionsPage === 1 || !functionsHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleFunctionsPageChange(functionsPage - 1)} disabled={functionsPage === 1 || !functionsHasPrev} title="Предыдущая страница">
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {functionsPage} из {resolvedFunctionsPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleFunctionsPageChange(functionsPage + 1)} disabled={functionsPage === resolvedFunctionsPages || !functionsHasNext} title="Следующая страница">
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleFunctionsLastPage}
                                                                disabled={functionsPage === resolvedFunctionsPages || !functionsHasNext}
                                                                title="Последняя страница"
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
                                            <p>Функции не найдены</p>
                                            {functionsError && <p className={clsx(styles.errorMessage)}>{functionsError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'procedures' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleProceduresSearchSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Поиск процедур"
                                                    value={proceduresSearchQuery}
                                                    onChange={handleProceduresSearchInputChange}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                                {proceduresSearchQuery && (
                                                    <button type="button" onClick={handleProceduresSearchClear} className={clsx(styles.usersSearchClear)} title="Очистить поиск">
                                                        <FontAwesomeIcon icon={faTimes}/>
                                                    </button>
                                                )}
                                            </div>
                                            <button type="submit" className={clsx(styles.usersSearchButton)} title="Найти">Поиск</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshProcedures}
                                                disabled={loadingProcedures}
                                                aria-label="Обновить список процедур"
                                                title="Обновить список процедур"
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
                                            <p>Загрузка процедур...</p>
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
Показано <span className={clsx(styles.paginationHighlight)}>{((proceduresPage - 1) * proceduresPageSize) + 1}</span>–
<span className={clsx(styles.paginationHighlight)}>{Math.min(proceduresPage * proceduresPageSize, resolvedProceduresTotal)}</span> из <span className={clsx(styles.paginationHighlight)}>{resolvedProceduresTotal}</span> процедур
</span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={proceduresPageSize} onChange={handleProceduresPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_first)}
                                                                onClick={handleProceduresFirstPage}
                                                                disabled={proceduresPage === 1 || !proceduresHasPrev}
                                                                title="Первая страница"
                                                            >
                                                                <FontAwesomeIcon icon={faChevronCircleLeft}/>
                                                            </button>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleProceduresPageChange(proceduresPage - 1)} disabled={proceduresPage === 1 || !proceduresHasPrev} title="Предыдущая страница">
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {proceduresPage} из {resolvedProceduresPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleProceduresPageChange(proceduresPage + 1)} disabled={proceduresPage === resolvedProceduresPages || !proceduresHasNext} title="Следующая страница">
                                                                <FontAwesomeIcon icon={faChevronRight}/>
                                                            </button>
                                                            <button
                                                                className={clsx(styles.paginationButton, styles.paginationButton_last)}
                                                                onClick={handleProceduresLastPage}
                                                                disabled={proceduresPage === resolvedProceduresPages || !proceduresHasNext}
                                                                title="Последняя страница"
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
                                            <p>Процедуры не найдены</p>
                                            {proceduresError && <p className={clsx(styles.errorMessage)}>{proceduresError}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'sql_query' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.sqlQueryPanel)}>
                                        <div className={clsx(styles.sqlQueryPanelHeader)}>
                                            <h3 className={clsx(styles.sqlQueryPanelTitle)}>SQL запрос (только SELECT, максимальный LIMIT 1000)</h3>
                                            <div className={clsx(styles.sqlQueryTemplates)}>
                                                <button type="button" className={clsx(styles.sqlTemplateButton)} onClick={() => applySqlTemplate('SELECT 1 AS test;')} disabled={sqlQueryLoading}>Тест</button>
                                                <button type="button" className={clsx(styles.sqlTemplateButton)} onClick={() => applySqlTemplate('SELECT * FROM information_schema.tables;')} disabled={sqlQueryLoading}>Таблицы</button>
                                                <button type="button" className={clsx(styles.sqlTemplateButton)} onClick={() => applySqlTemplate('SELECT * FROM pg_catalog.pg_stat_activity;')} disabled={sqlQueryLoading}>Сессии</button>
                                            </div>
                                        </div>

                                        <form onSubmit={executeSqlQuery} className={clsx(styles.sqlQueryForm)}>
                                            <textarea
                                                value={sqlQueryText}
                                                onChange={(e) => setSqlQueryText(e.target.value)}
                                                rows={10}
                                                className={clsx(styles.sqlQueryTextarea)}
                                                placeholder="Введите SELECT-запрос"
                                                disabled={sqlQueryLoading}
                                            />
                                            <div className={clsx(styles.sqlQueryActions)}>
                                                <label className={clsx(styles.sqlQueryLimitLabel)} htmlFor="sqlQueryLimit">Лимит строк</label>
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
                                                <button type="button" className={clsx(styles.sqlSecondaryButton)} onClick={() => setSqlQueryText('')} disabled={sqlQueryLoading}>Очистить</button>
                                                <button type="submit" className={clsx(styles.usersSearchButton)} disabled={sqlQueryLoading}>
                                                    {sqlQueryLoading ? 'Выполнение...' : 'Выполнить'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {sqlQueryError && <p className={clsx(styles.errorMessage)}>{sqlQueryError}</p>}
                                    {sqlQueryTruncated && <p className={clsx(styles.errorMessage)}>Результат ограничен выбранным лимитом.</p>}

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
                                            <p>Введите SELECT-запрос и нажмите «Выполнить»</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'active_sql' && (
                                <div className={clsx(styles.usersContent)}>
                                    <div className={clsx(styles.usersHeader)}>
                                        <form onSubmit={handleActiveSqlFilterSubmit} className={clsx(styles.usersSearchContainer)}>
                                            <div className={clsx(styles.usersSearchWrapper)}>
                                                <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                                <input
                                                    type="text"
                                                    placeholder="Фильтр по пользователю..."
                                                    value={activeSqlUsernameQuery}
                                                    onChange={(e) => setActiveSqlUsernameQuery(e.target.value)}
                                                    className={clsx(styles.usersSearchInput)}
                                                />
                                            </div>
                                            <input
                                                type="number"
                                                min={0}
                                                placeholder="Мин. длительность"
                                                value={activeSqlMinDuration}
                                                onChange={(e) => setActiveSqlMinDuration(e.target.value)}
                                                className={clsx(styles.activeSqlDurationInput)}
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                placeholder="Макс. длительность"
                                                value={activeSqlMaxDuration}
                                                onChange={(e) => setActiveSqlMaxDuration(e.target.value)}
                                                className={clsx(styles.activeSqlDurationInput)}
                                            />
                                            <button type="submit" className={clsx(styles.usersSearchButton)}>Применить</button>
                                            <button type="button" className={clsx(styles.usersSearchButton, styles.usersSearchButton_secondary)} onClick={handleActiveSqlFilterClear}>Сброс</button>
                                            <button
                                                type="button"
                                                className={clsx(styles.refreshButton)}
                                                onClick={refreshActiveTransactions}
                                                disabled={loadingActiveQueries}
                                                aria-label="Обновить список транзакций"
                                                title="Обновить список транзакций"
                                            >
                                                <FontAwesomeIcon icon={faArrowsRotate} spin={loadingActiveQueries}/>
                                            </button>
                                            <button
                                                type="button"
                                                className={clsx(styles.usersSearchButton, styles.usersSearchButton_secondary)}
                                                onClick={() => setIsActivityChartModalOpen(true)}
                                                title="Открыть график активности"
                                            >
                                                <FontAwesomeIcon icon={faChartLine}/> График активности
                                            </button>
                                        </form>
                                    </div>

                                    {loadingActiveQueries ? (
                                        <div className={clsx(styles.usersLoading)}>
                                            <div className={clsx(styles.spinner)}>
                                                <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                            </div>
                                            <p>Загрузка активных SQL-запросов...</p>
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
                                                                    <span className={clsx(styles.userItemInfoLabel)}>Длительность:</span>
                                                                    <span className={clsx(styles.userItemInfoValue)}>{item.duration_ms ?? '—'} мс</span>
                                                                </div>
                                                                <div className={clsx(styles.userActions)}>
                                                                    <button
                                                                        className={clsx(styles.userActionButton, styles.userActionButton_delete)}
                                                                        onClick={() => terminateActiveSqlQuery(item.pid)}
                                                                        disabled={terminatingPid === item.pid}
                                                                        title="Завершить запрос"
                                                                    >
                                                                        {terminatingPid === item.pid ? <FontAwesomeIcon icon={faSpinner} spin/> : <FontAwesomeIcon icon={faTrashAlt}/>}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={clsx(styles.userItemContent)}>
                                                            <code>{item.query || '—'}</code>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {totalActiveQueries > 0 && (
                                                <div className={clsx(styles.pagination)}>
                                                    <div className={clsx(styles.paginationInfo)}>
                                                        <span className={clsx(styles.paginationText)}>
                                                            Показано <span className={clsx(styles.paginationHighlight)}>{((activeSqlPage - 1) * activeSqlPageSize) + 1}</span>–
                                                            <span className={clsx(styles.paginationHighlight)}>{Math.min(activeSqlPage * activeSqlPageSize, totalActiveQueries)}</span> из <span className={clsx(styles.paginationHighlight)}>{totalActiveQueries}</span> активных запросов
                                                        </span>
                                                    </div>
                                                    <div className={clsx(styles.paginationControls)}>
                                                        <select value={activeSqlPageSize} onChange={handleActiveSqlPageSizeChange} className={clsx(styles.paginationSelect)}>
                                                            {PAGE_SIZES.map((size) => (
                                                                <option key={size} value={size}>{size} на странице</option>
                                                            ))}
                                                        </select>
                                                        <div className={clsx(styles.paginationButtons)}>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleActiveSqlPageChange(activeSqlPage - 1)} disabled={activeSqlPage === 1 || !activeQueriesHasPrev} title="Предыдущая страница">
                                                                <FontAwesomeIcon icon={faChevronLeft}/>
                                                            </button>
                                                            <span className={clsx(styles.pageInfo)}>Страница {activeSqlPage} из {totalActiveQueriesPages}</span>
                                                            <button className={clsx(styles.paginationButton)} onClick={() => handleActiveSqlPageChange(activeSqlPage + 1)} disabled={activeSqlPage === totalActiveQueriesPages || !activeQueriesHasNext} title="Следующая страница">
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
                                            <p>Активные SQL запросы не найдены</p>
                                            {(activeQueriesError || error) && <p className={clsx(styles.errorMessage)}>{activeQueriesError || error}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isActivityChartModalOpen && (
                <div className={clsx(styles.modalOverlay)} onClick={closeActivityChartModal}>
                    <div className={clsx(styles.activityChartModal)} onClick={(e) => e.stopPropagation()}>
                        <div className={clsx(styles.activityChartHeader)}>
                            <h2 className={clsx(styles.activityChartTitle)}>График активности БД (обновление 1 сек)</h2>
                            <button
                                type="button"
                                className={clsx(styles.modalCancelButton)}
                                onClick={closeActivityChartModal}
                            >
                                Закрыть
                            </button>
                        </div>
                        <div className={clsx(styles.activityChartBody)}>
                            <p className={clsx(styles.activityChartMeta)}>
                                Текущее количество активных пользовательских транзакций: <b>{chartTotalActiveQueries}</b>
                            </p>
                            <div className={clsx(styles.activityChartLegend)}>
                                <span><i className={clsx(styles.activityChartLine_total)}/> Всего</span>
                                <span><i className={clsx(styles.activityChartLine_select)}/> SELECT</span>
                                <span><i className={clsx(styles.activityChartLine_insert)}/> INSERT</span>
                                <span><i className={clsx(styles.activityChartLine_update)}/> UPDATE</span>
                                <span><i className={clsx(styles.activityChartLine_delete)}/> DELETE</span>
                                <span><i className={clsx(styles.activityChartLine_other)}/> Прочее</span>
                            </div>
                            <div className={clsx(styles.activityChartSvgWrap)}>
                                {activityChartPoints.length > 1 ? (
                                    <svg
                                        viewBox={`0 0 ${activityChartModel.width} ${activityChartModel.height}`}
                                        className={clsx(styles.activityChartSvg)}
                                        role="img"
                                        aria-label="График активности БД"
                                    >
                                        {activityChartModel.yTicks.map((tick) => {
                                            const y = activityChartModel.axis.top
                                                + (activityChartModel.height - activityChartModel.axis.top - activityChartModel.axis.bottom)
                                                - (tick / Math.max(activityChartModel.yTicks[activityChartModel.yTicks.length - 1], 1))
                                                * (activityChartModel.height - activityChartModel.axis.top - activityChartModel.axis.bottom);
                                            return (
                                                <g key={`y-${tick}`}>
                                                    <line
                                                        x1={activityChartModel.axis.left}
                                                        y1={y}
                                                        x2={activityChartModel.width - activityChartModel.axis.right}
                                                        y2={y}
                                                        className={clsx(styles.activityChartGridLine)}
                                                    />
                                                    <text
                                                        x={activityChartModel.axis.left - 10}
                                                        y={y + 4}
                                                        textAnchor="end"
                                                        className={clsx(styles.activityChartAxisText)}
                                                    >
                                                        {tick}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        <line
                                            x1={activityChartModel.axis.left}
                                            y1={activityChartModel.axis.top}
                                            x2={activityChartModel.axis.left}
                                            y2={activityChartModel.height - activityChartModel.axis.bottom}
                                            className={clsx(styles.activityChartAxisLine)}
                                        />
                                        <line
                                            x1={activityChartModel.axis.left}
                                            y1={activityChartModel.height - activityChartModel.axis.bottom}
                                            x2={activityChartModel.width - activityChartModel.axis.right}
                                            y2={activityChartModel.height - activityChartModel.axis.bottom}
                                            className={clsx(styles.activityChartAxisLine)}
                                        />

                                        <polyline points={activityChartModel.lines.total} className={clsx(styles.activityChartPolyline, styles.activityChartLine_total)}/>
                                        <polyline points={activityChartModel.lines.select} className={clsx(styles.activityChartPolyline, styles.activityChartLine_select)}/>
                                        <polyline points={activityChartModel.lines.insert} className={clsx(styles.activityChartPolyline, styles.activityChartLine_insert)}/>
                                        <polyline points={activityChartModel.lines.update} className={clsx(styles.activityChartPolyline, styles.activityChartLine_update)}/>
                                        <polyline points={activityChartModel.lines.delete} className={clsx(styles.activityChartPolyline, styles.activityChartLine_delete)}/>
                                        <polyline points={activityChartModel.lines.other} className={clsx(styles.activityChartPolyline, styles.activityChartLine_other)}/>

                                        {activityChartModel.latestPoint && (
                                            <>
                                                {[
                                                    {key: 'total', label: 'Всего', className: styles.activityChartLine_total},
                                                    {key: 'select', label: 'SELECT', className: styles.activityChartLine_select},
                                                    {key: 'insert', label: 'INSERT', className: styles.activityChartLine_insert},
                                                    {key: 'update', label: 'UPDATE', className: styles.activityChartLine_update},
                                                    {key: 'delete', label: 'DELETE', className: styles.activityChartLine_delete},
                                                    {key: 'other', label: 'Прочее', className: styles.activityChartLine_other},
                                                ].map((line, index) => {
                                                    const value = activityChartModel.latestPoint?.[line.key as keyof Omit<ActivityChartPoint, 'timestamp'>] as number;
                                                    const y = activityChartModel.axis.top
                                                        + (activityChartModel.height - activityChartModel.axis.top - activityChartModel.axis.bottom)
                                                        - (value / Math.max(activityChartModel.topValue, 1))
                                                        * (activityChartModel.height - activityChartModel.axis.top - activityChartModel.axis.bottom);
                                                    return (
                                                        <text
                                                            key={`line-label-${line.key}`}
                                                            x={activityChartModel.width - activityChartModel.axis.right - 2}
                                                            y={y - (index % 2 === 0 ? 4 : -8)}
                                                            textAnchor="end"
                                                            className={clsx(styles.activityChartSeriesLabel, line.className)}
                                                        >
                                                            {line.label}
                                                        </text>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {activityChartModel.xTickLabels.map((tick) => (
                                            <text
                                                key={`x-${tick.x}`}
                                                x={tick.x}
                                                y={activityChartModel.height - 10}
                                                textAnchor="middle"
                                                className={clsx(styles.activityChartAxisText)}
                                            >
                                                {tick.label}
                                            </text>
                                        ))}

                                        <text
                                            x={activityChartModel.width / 2}
                                            y={activityChartModel.height - 28}
                                            textAnchor="middle"
                                            className={clsx(styles.activityChartAxisTitle)}
                                        >
                                            Время
                                        </text>
                                        <text
                                            x={16}
                                            y={activityChartModel.height / 2}
                                            textAnchor="middle"
                                            transform={`rotate(-90 16 ${activityChartModel.height / 2})`}
                                            className={clsx(styles.activityChartAxisTitle)}
                                        >
                                            Количество транзакций
                                        </text>
                                    </svg>
                                ) : (
                                    <div className={clsx(styles.usersEmpty)}>
                                        <FontAwesomeIcon icon={faSpinner} spin={chartLoadingActiveQueries} size="2x"/>
                                        <p>Собираем данные для графика...</p>
                                    </div>
                                )}
                            </div>
                            {activityChartPoints.length > 0 && (
                                <div className={clsx(styles.activityChartTicks)}>
                                    <span>Период: {activityChartPoints[0].timestamp} — {activityChartPoints[activityChartPoints.length - 1].timestamp}</span>
                                    <span>Мин: {activityChartModel.minValue}</span>
                                    <span>Среднее: {activityChartModel.avgValue}</span>
                                    <span>Пик: {activityChartModel.maxValue}</span>
                                    <span>SELECT: {activityChartPoints[activityChartPoints.length - 1].select}</span>
                                    <span>INSERT: {activityChartPoints[activityChartPoints.length - 1].insert}</span>
                                    <span>UPDATE: {activityChartPoints[activityChartPoints.length - 1].update}</span>
                                    <span>DELETE: {activityChartPoints[activityChartPoints.length - 1].delete}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                Подтверждение удаления
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
                                Подтверждение удаления
                            </h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>
                                Удалить пользователя <strong>{userDeleteTarget.name}</strong>?
                            </p>
                            <p className={clsx(styles.modalWarning)}>
                                <FontAwesomeIcon icon={faExclamationCircle}/>
                                Пользователь будет удален безвозвратно.
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
                                Отмена
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
            {groupDeleteTarget !== null && (
                <div className={clsx(styles.modalOverlay)} onClick={closeGroupDeleteConfirm}>
                    <div className={clsx(styles.modalContent)} onClick={(e) => e.stopPropagation()}>
                        <div className={clsx(styles.modalHeader)}>
                            <FontAwesomeIcon icon={faExclamationCircle} className={clsx(styles.modalIcon)}/>
                            <h2 className={clsx(styles.modalTitle)}>Подтверждение удаления</h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)}>
                                Удалить группу <strong>{groupDeleteTarget.name}</strong>?
                            </p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button className={clsx(styles.modalCancelButton)} onClick={closeGroupDeleteConfirm} disabled={deletingGroupOid !== null}>Отмена</button>
                            <button className={clsx(styles.modalDeleteButton)} onClick={deleteGroup} disabled={deletingGroupOid !== null}>
                                {deletingGroupOid !== null ? <>
                                    <FontAwesomeIcon icon={faSpinner} spin/> Удаление...</> : <><FontAwesomeIcon icon={faTrashAlt}/> Удалить</>}
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
                            <h2 className={clsx(styles.modalTitle)}>Ошибка удаления группы</h2>
                        </div>
                        <div className={clsx(styles.modalBody)}>
                            <p className={clsx(styles.modalText)} style={{whiteSpace: 'pre-line'}}>
                                {groupDeleteErrorModal}
                            </p>
                        </div>
                        <div className={clsx(styles.modalFooter)}>
                            <button className={clsx(styles.modalCancelButton)} onClick={() => setGroupDeleteErrorModal(null)}>
                                Закрыть
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
                            aria-label="Закрыть окно редактирования группы"
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>{editingGroup ? 'Редактирование группы' : 'Создание группы'}</h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{editingGroup ? editingGroup.name : 'Новая группа'}</p>
                        </div>
                        <form className={clsx(groupModalStyles.modal__form)} onSubmit={saveGroup}>
                            <div className={clsx(groupModalStyles.modal__formGroup)}>
                                <label className={clsx(groupModalStyles.modal__label)} htmlFor="groupName">Название группы</label>
                                <input
                                    id="groupName"
                                    className={clsx(groupModalStyles.modal__input)}
                                    value={groupFormName}
                                    onChange={(e) => setGroupFormName(e.target.value)}
                                    disabled={groupFormLoading}
                                    placeholder="Введите название группы"
                                />
                            </div>
                            <div className={clsx(groupModalStyles.modal__formGroup)}>
                                <label className={clsx(groupModalStyles.modal__label)} htmlFor="groupDescription">Описание</label>
                                <textarea
                                    id="groupDescription"
                                    className={clsx(groupModalStyles.modal__textarea)}
                                    value={groupFormDescription}
                                    onChange={(e) => setGroupFormDescription(e.target.value)}
                                    disabled={groupFormLoading}
                                    rows={3}
                                    placeholder="Описание группы"
                                />
                            </div>
                            <div className={clsx(groupModalStyles.modal__formFooter)}>
                                <button type="button" className={clsx(groupModalStyles.modal__cancelButton)} onClick={closeGroupModal} disabled={groupFormLoading}>Отмена</button>
                                <button type="submit" className={clsx(groupModalStyles.modal__submitButton)} disabled={groupFormLoading}>
                                    {groupFormLoading ? <><FontAwesomeIcon icon={faSpinner} spin/> Сохранение...</> : 'Сохранить'}
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
                            aria-label="Закрыть окно управления пользователями"
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>Управление пользователями группы</h2>
                            <p className={clsx(groupModalStyles.modal__subtitle)}>{groupUsersModal.name}</p>
                        </div>
                        <div className={clsx(groupModalStyles.modal__form, styles.groupUsersManager)}>
                            <div className={clsx(groupModalStyles.modal__formGroup, styles.groupUsersManager__controls)}>
                                <div className={clsx(styles.groupUsersManager__toolbar)}>
                                    <label className={clsx(groupModalStyles.modal__label, styles.groupUsersManager__label)} htmlFor="groupUserSearch">Добавить пользователя</label>
                                    <div className={clsx(styles.usersSearchWrapper, styles.groupUsersManager__search)}>
                                        <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                        <input
                                            id="groupUserSearch"
                                            type="text"
                                            placeholder="Поиск пользователя..."
                                            value={groupUserSearchQuery}
                                            onChange={(e) => setGroupUserSearchQuery(e.target.value)}
                                            className={clsx(styles.usersSearchInput)}
                                            disabled={groupUsersLoading || groupUsersSaving || availableUsersForAdd.length === 0}
                                        />
                                        {groupUserSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setGroupUserSearchQuery('')}
                                                className={clsx(styles.usersSearchClear)}
                                                title="Очистить поиск"
                                            >
                                                <FontAwesomeIcon icon={faTimes}/>
                                            </button>
                                        )}
                                    </div>
                                    <select
                                        id="groupUserSelect"
                                        className={clsx(styles.usersFilterSelect, styles.groupUsersManager__select)}
                                        value={selectedUserOid}
                                        onChange={(e) => setSelectedUserOid(e.target.value)}
                                        disabled={groupUsersLoading || groupUsersSaving || filteredAvailableUsersForAdd.length === 0}
                                    >
                                        <option value="">Выберите пользователя</option>
                                        {filteredAvailableUsersForAdd.map((user) => (
                                            <option key={user.oid} value={user.oid}>{user.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className={clsx(styles.createUserButton, styles.groupUsersManager__addButton)}
                                        onClick={addUserToGroup}
                                        disabled={!selectedUserOid || groupUsersSaving || groupUsersLoading}
                                    >
                                        Добавить в группу
                                    </button>
                                </div>
                            </div>

                            {groupUsersLoading ? (
                                <div className={clsx(styles.usersLoading)}>
                                    <div className={clsx(styles.spinner)}>
                                        <FontAwesomeIcon icon={faSpinner} spin size="2x"/>
                                    </div>
                                    <p>Загрузка пользователей группы...</p>
                                </div>
                            ) : (
                                <div className={clsx(styles.groupUsersManager__list)}>
                                    {groupUsers.length > 0 ? groupUsers.map((user) => (
                                        <div key={user.oid} className={clsx(styles.groupUsersManager__memberRow)}>
                                            <div className={clsx(styles.groupUsersManager__memberInfo)}>
                                                <h3 className={clsx(styles.groupUsersManager__memberName)}>{user.name}</h3>
                                                <span className={clsx(styles.groupUsersManager__memberMeta)}>OID: {user.oid}</span>
                                            </div>
                                            <button
                                                type="button"
                                                className={clsx(styles.userActionButton, styles.userActionButton_delete, styles.groupUsersManager__memberRemove)}
                                                onClick={() => removeUserFromGroup(user.oid)}
                                                disabled={groupUsersSaving}
                                                title={`Удалить ${user.name} из группы`}
                                            >
                                                <FontAwesomeIcon icon={faUserMinus}/>
                                            </button>
                                        </div>
                                    )) : (
                                        <div className={clsx(styles.usersEmpty, styles.groupUsersManager__empty)}>
                                            <FontAwesomeIcon icon={faUsers} size="2x"/>
                                            <p>В группе пока нет пользователей</p>
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
                            aria-label="Закрыть окно редактирования таблицы"
                        >
                            <FontAwesomeIcon icon={faTimes}/>
                        </button>
                        <div className={clsx(groupModalStyles.modal__header)}>
                            <h2 className={clsx(groupModalStyles.modal__title)}>Редактирование таблицы</h2>
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
                                    <label className={clsx(styles.tableGroupsSearchLabel)} htmlFor="tableGroupsSearch">Поиск групп</label>
                                    <span className={clsx(styles.tableGroupsSearchMeta)}>
                                        Найдено: {filteredTableGroupsForm.length} из {tableGroupsForm.length}
                                    </span>
                                </div>
                                <div className={clsx(styles.usersSearchWrapper)}>
                                    <FontAwesomeIcon icon={faSearch} className={clsx(styles.usersSearchIcon)}/>
                                    <input
                                        id="tableGroupsSearch"
                                        type="text"
                                        placeholder="Введите название группы"
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
                                            title="Очистить поиск групп"
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
                                        Группы по указанному фильтру не найдены
                                    </div>
                                )}
                            </div>
                            <div className={clsx(groupModalStyles.modal__formFooter)}>
                                <button type="button" className={clsx(groupModalStyles.modal__cancelButton)} onClick={closeTableEditModal} disabled={tableModalLoading}>Отмена</button>
                                <button type="submit" className={clsx(groupModalStyles.modal__submitButton)} disabled={tableModalLoading}>
                                    {tableModalLoading ? <><FontAwesomeIcon icon={faSpinner} spin/> Сохранение...</> : 'Сохранить'}
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
