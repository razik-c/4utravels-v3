import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
   baseURL: "https://4utravels-v3.vercel.app/api/auth",
  fetchOptions: {
    credentials: "include", 
  },
});
