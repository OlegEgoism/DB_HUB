// frontend/src/pages/profile/route.ts

import { route } from "@react-router/dev/routes";

// import { ROUTES } from '@shared/routes/routes';


export const profileRoute = route(
    "/profile/",
    "../../pages/profile/ui/page.tsx"
);