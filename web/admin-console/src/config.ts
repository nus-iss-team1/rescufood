export const config = {
  region: import.meta.env.VITE_AWS_REGION ?? "ap-southeast-1",
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? "",
  apiBase: import.meta.env.VITE_API_BASE ?? "http://localhost:3001",
};
