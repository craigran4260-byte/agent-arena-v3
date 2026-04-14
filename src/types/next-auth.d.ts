import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    token_balance?: number;
  }

  interface Session {
    user: User;
    expires: string;
  }

  interface JWT {
    id?: string;
    avatar_url?: string;
    token_balance?: number;
  }
}
