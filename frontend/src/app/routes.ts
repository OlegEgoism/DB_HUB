// frontend/src/app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { ROUTES } from '../shared/config/routes.ts'

export default [
  route(ROUTES.HOME, "./layout/base-layout.tsx", [
    index("../pages/home/ui/page.tsx"),
    route(ROUTES.CONNECTIONS, "../pages/connections/ui/page.tsx"),
    route(ROUTES.PROFILE, "../pages/profile/ui/page.tsx"),
    route(ROUTES.DOCUMENTATIONS, "../pages/documentations/ui/page.tsx"),
    route(ROUTES.AGREEMENTS, "../pages/agreements/ui/page.tsx"),
  ]),
  // Добавляем отдельный маршрут для логина
  route(ROUTES.LOGIN, "../pages/auth/ui/login-page.tsx"),
  // Добавляем обработчик для системных запросов
  route("/*", "./routes/system-route.tsx"),
] satisfies RouteConfig;