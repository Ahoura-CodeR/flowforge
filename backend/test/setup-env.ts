// Runs before the app is loaded. Tests use their own database so they never touch dev data.
process.env.NODE_ENV = 'test';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'flowforge';
process.env.DB_PASSWORD ??= 'flowforge';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'flowforge_test';
process.env.JWT_SECRET ??= 'test-secret-test-secret-test-secret-12345';
