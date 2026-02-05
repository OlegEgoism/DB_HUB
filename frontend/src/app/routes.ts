// frontend/src/app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { ROUTES } from '../shared/config/routes.ts'

export default [
  route(ROUTES.HOME, "./layout/base-layout.tsx", [
    index("../pages/home/ui/page.tsx"),
    route(ROUTES.CONNECTIONS, "../pages/connections/ui/page.tsx"),
    route(ROUTES.PROFILE, "../pages/profile/ui/page.tsx"),
    route(`${ROUTES.PROFILE}/edit`, "../pages/profile/ui/edit-page.tsx"), // Новый маршрут
    route(ROUTES.DOCUMENTATIONS, "../pages/documentations/ui/page.tsx"),
    route(ROUTES.AGREEMENTS, "../pages/agreements/ui/page.tsx"),
  ]),
] satisfies RouteConfig;