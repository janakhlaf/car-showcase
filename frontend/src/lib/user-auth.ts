import axios from "axios";


/* =========================================================
   REFRESH USER ACCESS TOKEN
========================================================= */

export async function refreshUserAccessToken(): Promise<string | null> {
  const refreshToken =
    sessionStorage.getItem("userRefreshToken");

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      "/api/auth/refresh",
      {
        refreshToken,
      }
    );

    const newAccessToken =
      response.data.data.accessToken;

    sessionStorage.setItem(
      "userAccessToken",
      newAccessToken
    );

    return newAccessToken;

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.log(
        "USER REFRESH ERROR:",
        error.response?.data
      );
    } else {
      console.log(
        "USER REFRESH ERROR:",
        error
      );
    }

    return null;
  }
}


/* =========================================================
   USER AXIOS INSTANCE
========================================================= */

const userApi = axios.create();


/* =========================================================
   CONVERT /api/... TO PHP BACKEND ROUTE
========================================================= */

userApi.interceptors.request.use((config) => {
  if (
    typeof config.url === "string" &&
    config.url.startsWith("/api/")
  ) {
    const originalUrl =
      config.url.slice(5);

    const [route, queryString] =
      originalUrl.split("?");

    const queryParams =
      Object.fromEntries(
        new URLSearchParams(
          queryString ?? ""
        )
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
   ADD USER ACCESS TOKEN TO REQUESTS
========================================================= */

userApi.interceptors.request.use((config) => {
  const accessToken =
    sessionStorage.getItem(
      "userAccessToken"
    );

  if (accessToken) {
    config.headers.Authorization =
      `Bearer ${accessToken}`;
  }

  return config;
});


/* =========================================================
   REFRESH USER ACCESS TOKEN ON 401
========================================================= */

userApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest =
      error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const newAccessToken =
        await refreshUserAccessToken();

      if (newAccessToken) {
  originalRequest.headers =
    originalRequest.headers ?? {};

  originalRequest.headers.Authorization =
    `Bearer ${newAccessToken}`;

  return userApi(originalRequest);
}
    }

    console.log(
      "USER API ERROR:",
      error.response?.data
    );

    return Promise.reject(error);
  }
);


export { userApi };