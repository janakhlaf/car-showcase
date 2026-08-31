import axios from "axios";


/* =========================================================
   REFRESH PROMISE

   Prevent multiple refresh requests from running
   at the same time.
========================================================= */

let refreshPromise: Promise<string | null> | null = null;


/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

export async function refreshAccessToken(): Promise<string | null> {
  /*
   * إذا في refresh شغال حاليًا،
   * كل requests تستنى نفس العملية.
   */
  if (refreshPromise) {
    return refreshPromise;
  }


  refreshPromise = (async () => {
    const refreshToken =
      sessionStorage.getItem("adminRefreshToken");

    if (!refreshToken) {
      return null;
    }


    try {
      const response = await axios.post(
        "http://localhost/finalcar/backend/api/index.php?route=admin%2Frefresh",
        {
          refreshToken,
        }
      );


      const newAccessToken =
        response.data?.data?.accessToken;


      if (!newAccessToken) {
        console.log(
          "REFRESH ERROR: No access token returned"
        );

        return null;
      }


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

    } finally {

      /*
       * بعد انتهاء refresh،
       * نسمح بعملية refresh جديدة مستقبلًا.
       */
      refreshPromise = null;
    }
  })();


  return refreshPromise;
}


/* =========================================================
   ADMIN AXIOS INSTANCE
========================================================= */

const adminApi = axios.create();


/* =========================================================
   CONVERT /api/... TO PHP ROUTE
========================================================= */

adminApi.interceptors.request.use(
  (config) => {

    if (
      typeof config.url === "string" &&
      config.url.startsWith("/api/")
    ) {

      const originalUrl =
        config.url.slice(5);


      const [
        route,
        queryString,
      ] =
        originalUrl.split("?");


      const queryParams =
        Object.fromEntries(
          new URLSearchParams(
            queryString ?? ""
          )
        );


      config.url =
        `http://localhost/finalcar/backend/api/index.php?route=${encodeURIComponent(
          route
        )}`;


      config.params = {
        ...queryParams,
        ...(config.params ?? {}),
      };
    }


    return config;
  }
);


/* =========================================================
   ADD ACCESS TOKEN
========================================================= */

adminApi.interceptors.request.use(
  (config) => {

    const accessToken =
      sessionStorage.getItem(
        "adminAccessToken"
      );


    if (accessToken) {

      config.headers.Authorization =
        `Bearer ${accessToken}`;
    }


    return config;
  }
);


/* =========================================================
   REFRESH ACCESS TOKEN ON 401
========================================================= */

adminApi.interceptors.response.use(

  /*
   * Successful response
   */
  (response) => response,


  /*
   * Failed response
   */
  async (error) => {

    const originalRequest =
      error.config;


    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {

      /*
       * منع loop لا نهائي.
       */
      originalRequest._retry = true;


      /*
       * Refresh واحد فقط حتى لو عدة
       * requests أخذوا 401 بنفس الوقت.
       */
      const newAccessToken =
        await refreshAccessToken();


      if (newAccessToken) {

        originalRequest.headers =
          originalRequest.headers ?? {};


        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;


        /*
         * إعادة نفس الطلب بعد تحديث الـtoken.
         */
        return adminApi(
          originalRequest
        );
      }


      /*
       * إذا حتى الـrefresh فشل،
       * الجلسة لم تعد صالحة.
       */
      sessionStorage.removeItem(
        "adminAccessToken"
      );

      sessionStorage.removeItem(
        "adminRefreshToken"
      );
    }


    console.log(
      "ADMIN API ERROR:",
      error.response?.data
    );


    return Promise.reject(error);
  }
);


export { adminApi };