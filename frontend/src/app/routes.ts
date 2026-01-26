import { type RouteConfig, relative, index, route, layout } from "@react-router/dev/routes";
import { ROUTES } from '../shared/config/routes.ts'


export default [
    route(ROUTES.HOME, "./layout/base-layout.tsx", [
        index("../pages/home/ui/page.tsx"),

        route(ROUTES.PROFILE, "../pages/profile/ui/page.tsx"),
        route(ROUTES.CONNECTIONS, "../pages/connections/ui/page.tsx"),
    ]),
] satisfies RouteConfig;
