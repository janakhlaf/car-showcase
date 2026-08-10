import axios from "axios";

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken =
    sessionStorage.getItem("adminRefreshToken");

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      "/api/admin/refresh",
      {
        refreshToken,
      }
    );

    const newAccessToken =
      response.data.data.accessToken;

    sessionStorage.setItem(
      "adminAccessToken",
      newAccessToken
    );

    return newAccessToken;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(
        "REFRESH ERROR:",
        error.response?.data
      );
    } else {
      console.log(
        "REFRESH ERROR:",
        error
      );
    }

    return null;
  }
}


/* =========================================================
   ADMIN AXIOS INSTANCE
========================================================= */

const adminApi = axios.create();
adminApi.interceptors.request.use((config) => {
  if (
    typeof config.url === "string" &&
    config.url.startsWith("/api/")
  ) {
    const originalUrl = config.url.slice(5);
    const [route, queryString] = originalUrl.split("?");

    const queryParams = Object.fromEntries(
      new URLSearchParams(queryString ?? "")
    );

    config.url =
      `http://localhost/finalcar/backend/api/index.php?route=${encodeURIComponent(route)}`;

    config.params = {
      ...queryParams,
      ...(config.params ?? {}),
    };
  }

  return config;
});
/* =========================================================
   ADD ACCESS TOKEN TO REQUESTS
========================================================= */

adminApi.interceptors.request.use((config) => {
  const accessToken =
    sessionStorage.getItem("adminAccessToken");

  if (accessToken) {
    config.headers.Authorization =
      `Bearer ${accessToken}`;
  }

  return config;
});


/* =========================================================
   REFRESH ACCESS TOKEN ON 401
========================================================= */

adminApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const newAccessToken =
        await refreshAccessToken();

      if (newAccessToken) {
        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return adminApi(originalRequest);
      }
    }

    console.log(
      "ADMIN API ERROR:",
      error.response?.data
    );

    return Promise.reject(error);
  }
);

export { adminApi };