import axios from "axios";

export const BACKEND_BASE = "http://localhost/finalcar/backend";

export function apiUrl(route: string) {
  return `${BACKEND_BASE}/api/index.php?route=${encodeURIComponent(route)}`;
}

axios.defaults.withCredentials = true;

axios.interceptors.request.use((config) => {
  if (
    typeof config.url === "string" &&
    config.url.startsWith("/api/")
  ) {
    const originalUrl = config.url.slice(5);
    const [route, queryString] = originalUrl.split("?");

    const queryParams = Object.fromEntries(
      new URLSearchParams(queryString ?? "")
    );

    config.url = apiUrl(route);

    config.params = {
      ...queryParams,
      ...(config.params ?? {}),
    };
  }

  return config;
});

export default axios;