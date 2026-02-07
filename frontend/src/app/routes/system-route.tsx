// frontend/src/app/routes/system-route.tsx
import { useLocation } from "react-router";
import { isSystemRequest } from "../../middleware/systemRequests";

export default function SystemRoute() {
  const location = useLocation();

  // Если это системный запрос - возвращаем пустой ответ
  if (isSystemRequest(location.pathname)) {
    return null;
  }

  // Иначе можно показать 404 страницу
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>404 - Страница не найдена</h1>
      <p>Запрашиваемая страница не существует</p>
    </div>
  );
}