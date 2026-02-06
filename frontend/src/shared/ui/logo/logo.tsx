// frontend/src/shared/ui/logo/logo.tsx

import { NavLink} from 'react-router';
import clsx from 'clsx';

import { ROUTES } from '@shared/config';

import styles  from './logo.module.scss';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDatabase } from '@fortawesome/free-solid-svg-icons'

export function Logo() {
    return (
        <NavLink className={clsx(styles.logo, 'link')} to={ROUTES.HOME}>
            <FontAwesomeIcon className={styles.logo__icon} icon={faDatabase}/>
            <span className={styles.logo__title}>DB HUB</span>
        </NavLink>
    )
}