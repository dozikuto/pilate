export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5433,
    username: process.env.DB_USERNAME || process.env.DB_USER || 'pilates',
    password: process.env.DB_PASSWORD || 'pilates123',
    name: process.env.DB_NAME || 'pilatesms',
    sync: process.env.DB_SYNC === 'true' || true,
    logging: process.env.DB_LOGGING === 'true' || false,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'pilatesms_jwt_secret_dev_2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'pilatesms_refresh_secret_dev_2026',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/v1/auth/google/callback',
  },
  webAdminUrl: process.env.WEB_ADMIN_URL || 'http://localhost:3000',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
});
