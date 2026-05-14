export interface JwtPayload {
  userId: string;
  email: string;
  jti: string; // unique per login — ensures each session token is distinct
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  token: string;
}
