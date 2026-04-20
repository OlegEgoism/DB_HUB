
import clsx from 'clsx';
import styles from '../detail-page.module.scss';
import { useI18n } from '@shared/i18n';
import type { TabType } from '@pages/connections/model/detail-page-types';
import type { ConnectionTabsVisibility } from '@entities/settings/model';
import { DETAIL_TABS, isTabVisible } from '../model/detail-tabs.config';
import { createTabResetMap, type DetailTabResetters } from '../model/detail-tabs-resetters';
import { DetailTabButton } from './detail-tab-button';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  visibleTabs: ConnectionTabsVisibility;
  resetters: DetailTabResetters;
}

export function DetailTabNavigation({
  activeTab,
  setActiveTab,
  visibleTabs,
  resetters,
}: Props) {
  const { t } = useI18n();

  const resetMap = createTabResetMap(resetters);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    resetMap[tab]?.();
  };

  return (
    <div className={clsx(styles.tabsContainer)}>
      {DETAIL_TABS
        .filter(({ key }) => isTabVisible(visibleTabs, key))
        .map(({ key, labelKey }) => (
          <DetailTabButton
            key={key}
            isActive={activeTab === key}
            onClick={() => handleTabClick(key)}
          >
            {key === 'sql_query' ? 'SQL' : t(labelKey)}
          </DetailTabButton>
        ))}
    </div>
  );
}