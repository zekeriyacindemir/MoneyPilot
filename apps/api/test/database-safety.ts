const database = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://localhost/moneypilot_test');
if (!database.pathname.endsWith('_test')) throw new Error('Integration tests require a dedicated database whose name ends with _test.');
