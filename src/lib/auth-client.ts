import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
   baseURL: "https://www.4utravelandtours.com/api/auth",
  //  baseURL: "http://localhost:3000/api/auth",
  fetchOptions: {
    credentials: "include", 
  },
});
