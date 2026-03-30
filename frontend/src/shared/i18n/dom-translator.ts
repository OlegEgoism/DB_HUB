import type { Language } from './translations';

const EXACT_RU_TO_EN: Record<string, string> = {
  'Авторизация': 'Login',
  'Регистрация': 'Sign up',
  'Выход': 'Logout',
  'Подключения': 'Connections',
  'Пользователи': 'Users',
  'Профиль': 'Profile',
  'Настройки': 'Settings',
  'Добро пожаловать в DB HUB': 'Welcome to DB HUB',
  'Производительность': 'Performance',
  'Мониторинг': 'Monitoring',
  'Управление доступом': 'Access management',
  'Интеграции с другими системами.': 'Integrations with other systems.',
  'Минимальная задержка подключения.': 'Minimal connection latency.',
  'Детальная аналитика.': 'Detailed analytics.',
  'Система ролевой модели и доступа.': 'Role-based access control system.',
  'Добро пожаловать!': 'Welcome!',
  'Авторизация успешна!': 'Login successful!',
  'Имя пользователя': 'Username',
  'Пароль': 'Password',
  'Отмена': 'Cancel',
  'Войти': 'Sign in',
  'Вход...': 'Signing in...',
  'Начать работу': 'Start working',
  'Пожалуйста, заполните все поля': 'Please fill in all fields',
  'Ваш аккаунт не активирован в системе. Обратитесь к администратору.': 'Your account is not active yet. Contact an administrator.',
  'Вы сделали слишком много попыток входа. Попробуйте позже.': 'Too many login attempts. Please try again later.',
  'Неверное имя пользователя или пароль.': 'Invalid username or password.',
  'Доступ запрещен. Проверьте ваши права доступа.': 'Access denied. Check your permissions.',
  'Сервер авторизации недоступен.': 'Authorization server is unavailable.',
  'Внутренняя ошибка сервера. Попробуйте позже.': 'Internal server error. Please try again later.',
  'Ошибка сети. Проверьте подключение к интернету.': 'Network error. Check your internet connection.',
  'Регистрация успешна!': 'Registration successful!',
  'Зарегистрироваться': 'Sign up',
  'Регистрация...': 'Signing up...',
  'Пользователь': 'User',
  'Аналитик': 'Analyst',
  'Разработчик': 'Developer',
  'Тестировщик': 'Tester',
  'Роль': 'Role',
  'ФИО': 'Full name',
  'Подтвердите пароль': 'Confirm password',
  'Повторите пароль': 'Repeat password',
  'Минимум 4 символа': 'At least 4 characters',
  'Пароли не совпадают': 'Passwords do not match',
  'Пароль должен быть не менее 4 символов': 'Password must be at least 4 characters',
  'Сбросить по умолчанию': 'Reset to defaults',
  'Выберите, какие вкладки отображать на странице подключения.': 'Choose which tabs are shown on the connection page.',
  'Обзор': 'Overview',
  'Метрики': 'Metrics',
  'Группы': 'Groups',
  'Схемы': 'Schemas',
  'Таблицы': 'Tables',
  'Представления': 'Views',
  'Индексы': 'Indexes',
  'Функции': 'Functions',
  'Процедуры': 'Procedures',
  'Транзакции': 'Transactions',
  'SQL-запрос': 'SQL query',
  'Поиск': 'Search',
  'Очистить поиск': 'Clear search',
  'Обновить список подключений': 'Refresh connections',
  'Создать подключение': 'Create connection',
  'Создать пользователя': 'Create user',
  'Создать': 'Create',
  'Сохранить': 'Save',
  'Сохранение...': 'Saving...',
  'Удалить': 'Delete',
  'Удаление...': 'Deleting...',
  'Редактировать': 'Edit',
  'Редактирование подключения': 'Edit connection',
  'Создание подключения': 'Create connection',
  'Название подключения *': 'Connection name *',
  'Тип базы данных *': 'Database type *',
  'Хост *': 'Host *',
  'Порт *': 'Port *',
  'Имя БД *': 'Database name *',
  'Пользователь *': 'User *',
  'Описание': 'Description',
  'Окружение *': 'Environment *',
  'Разработка': 'Development',
  'Тестирование': 'Testing',
  'Продакшн': 'Production',
  'Поиск подключений...': 'Search connections...',
  'Новая группа': 'New group',
  'Редактирование группы': 'Edit group',
  'Создание группы': 'Create group',
  'Название группы обязательно': 'Group name is required',
  'Создать новую группу': 'Create new group',
  'Создать нового пользователя': 'Create new user',
  'Создать новое подключение к базе данных': 'Create a new database connection',
  'Обновить список групп': 'Refresh groups',
  'Обновить список пользователей': 'Refresh users',
  'Обновить список таблиц': 'Refresh tables',
  'Обновить список представлений': 'Refresh views',
  'Обновить список схем': 'Refresh schemas',
  'Обновить список функций': 'Refresh functions',
  'Обновить список процедур': 'Refresh procedures',
  'Обновить список индексов': 'Refresh indexes',
  'Обновить список транзакций': 'Refresh transactions',
  'Поиск пользователей': 'Search users',
  'Поиск групп': 'Search groups',
  'Поиск таблиц': 'Search tables',
  'Поиск представлений': 'Search views',
  'Поиск схем': 'Search schemas',
  'Поиск функций': 'Search functions',
  'Поиск процедур': 'Search procedures',
  'Поиск индексов': 'Search indexes',
  'Открыть график активности': 'Open activity chart',
  'График активности БД': 'Database activity chart',
  'Завершить запрос': 'Terminate query',
  'Выполнить': 'Run',
  'Выполнение...': 'Running...',
  'Введите SELECT-запрос': 'Enter SELECT query',
  'Введите SQL-запрос перед выполнением.': 'Enter SQL query before execution.',
  'Избранные': 'Favorites',
  'Добавить в избранное': 'Add to favorites',
  'Убрать из избранного': 'Remove from favorites',
  'Следующая страница': 'Next page',
  'Предыдущая страница': 'Previous page',
  'Первая страница': 'First page',
  'Последняя страница': 'Last page',
  'Да': 'Yes',
  'Нет': 'No',
  'Активен': 'Active',
  'Неактивен': 'Inactive',
  'Не указано': 'Not specified',
  'Неизвестная ошибка': 'Unknown error',
  'Ошибка загрузки подключений:': 'Connection loading error:',
  'Ошибка выполнения SQL-запроса:': 'SQL execution error:',
  'Ошибка завершения процесса': 'Process termination error',
  'Не удалось загрузить таблицы': 'Failed to load tables',
  'Не удалось загрузить схемы': 'Failed to load schemas',
  'Не удалось загрузить пользователей': 'Failed to load users',
  'Не удалось загрузить группы': 'Failed to load groups',
  'Не удалось загрузить представления': 'Failed to load views',
  'Не удалось загрузить функции': 'Failed to load functions',
  'Не удалось загрузить процедуры': 'Failed to load procedures',
  'Не удалось загрузить индексы': 'Failed to load indexes',
  'Не удалось загрузить информацию': 'Failed to load information',
};

const PREFIX_RU_TO_EN: Array<[string, string]> = [
  ['Ошибка при удалении пользователя:', 'Error while deleting user:'],
  ['Ошибка при удалении группы:', 'Error while deleting group:'],
  ['Ошибка при удалении подключения:', 'Error while deleting connection:'],
  ['Ошибка при сохранении группы:', 'Error while saving group:'],
  ['Ошибка при загрузке пользователей группы:', 'Error while loading group users:'],
  ['Ошибка при изменении статуса избранного:', 'Error while updating favorite status:'],
  ['Ошибка обновления привилегий таблицы:', 'Table privileges update error:'],
  ['Ошибка обновления привилегий схемы:', 'Schema privileges update error:'],
  ['Ошибка обновления привилегий представления:', 'View privileges update error:'],
  ['Не удалось ', 'Failed to '],
];

const textOriginalMap = new WeakMap<Text, string>();
const attrOriginalMap = new WeakMap<Element, Record<string, string>>();

const EXACT_EN_TO_RU = Object.fromEntries(Object.entries(EXACT_RU_TO_EN).map(([ru, en]) => [en, ru]));
const PREFIX_EN_TO_RU = PREFIX_RU_TO_EN.map(([ru, en]) => [en, ru] as const);

function translateValue(value: string, language: Language): string {
  if (!value.trim()) {
    return value;
  }

  if (language === 'ru') {
    if (EXACT_EN_TO_RU[value]) {
      return EXACT_EN_TO_RU[value];
    }

    for (const [enPrefix, ruPrefix] of PREFIX_EN_TO_RU) {
      if (value.startsWith(enPrefix)) {
        return `${ruPrefix}${value.slice(enPrefix.length)}`;
      }
    }

    return value;
  }

  if (EXACT_RU_TO_EN[value]) {
    return EXACT_RU_TO_EN[value];
  }

  for (const [ruPrefix, enPrefix] of PREFIX_RU_TO_EN) {
    if (value.startsWith(ruPrefix)) {
      return `${enPrefix}${value.slice(ruPrefix.length)}`;
    }
  }

  return value;
}

function translateTextNode(node: Text, language: Language) {
  const original = textOriginalMap.get(node) ?? node.textContent ?? '';
  if (!textOriginalMap.has(node)) {
    textOriginalMap.set(node, original);
  }

  const next = language === 'ru' ? original : translateValue(original, 'en');
  if (node.textContent !== next) {
    node.textContent = next;
  }
}

function translateElementAttributes(element: Element, language: Language) {
  const attrs = ['placeholder', 'title', 'aria-label'];
  const originalAttrs = attrOriginalMap.get(element) ?? {};

  for (const attr of attrs) {
    const current = element.getAttribute(attr);
    if (!current) continue;

    if (!(attr in originalAttrs)) {
      originalAttrs[attr] = current;
    }

    const source = originalAttrs[attr];
    const next = language === 'ru' ? source : translateValue(source, 'en');
    if (current !== next) {
      element.setAttribute(attr, next);
    }
  }

  if (Object.keys(originalAttrs).length > 0) {
    attrOriginalMap.set(element, originalAttrs);
  }
}

function processSubtree(root: Node, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode) {
    translateTextNode(textNode as Text, language);
    textNode = walker.nextNode();
  }

  if (root instanceof Element) {
    translateElementAttributes(root, language);
    root.querySelectorAll('*').forEach((element) => translateElementAttributes(element, language));
  }
}

let observer: MutationObserver | null = null;

export function startDomTranslation(language: Language) {
  if (typeof document === 'undefined') {
    return () => {};
  }

  processSubtree(document.body, language);

  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => processSubtree(node, language));
      }
      if (mutation.type === 'attributes' && mutation.target instanceof Element) {
        translateElementAttributes(mutation.target, language);
      }
      if (mutation.type === 'characterData' && mutation.target instanceof Text) {
        translateTextNode(mutation.target, language);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['placeholder', 'title', 'aria-label'],
  });

  return () => {
    observer?.disconnect();
    observer = null;
  };
}
