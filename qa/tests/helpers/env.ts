export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env locally, ` +
        'or check that the GitHub Actions secrets and variables are configured (see qa/README.md > CI/CD).',
    );
  }
  return value;
}
