# DB HUB — frontend

React 19, Vite 7, React Router 7, TypeScript. Структура — **Feature-Sliced Design** (`app`, `pages`, `widgets`, `features`, `entities`, `shared`).

## Требования

Node.js **v22.x** (как в Docker-образе; см. корневой `README.md`).

## Команды

```bash
npm install
npm run dev      # разработка (Vite)
npm run build    # production-сборка в каталог build/ (не коммитится)
npm run lint
npm run preview  # просмотр собранного клиента
```

`build/`, `.vite/`, `.react-router/` генерируются локально и перечислены в `.gitignore`.
