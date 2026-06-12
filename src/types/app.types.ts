export type AppBindings = {
  Bindings: {
    DB_URL: string;
    JWT_ACCESS_SECRET: string;
    JWT_REFRESH_SECRET: string;
    ENVIRONMENT: string;
    API_VERSION: string;
  };
  Variables: {
    userId: string;
    userRole: string;
    userName: string;
  };
};
