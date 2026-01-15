export interface JwtPayload {
  sub: any;
  type: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  access: {
    token: string;
    expires: Date;
  };
  refresh?: {
    token: string;
    expires: Date;
  };
}

export interface TokenUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface TokenOptions {
  expiresIn: string;
  type: TokenType;
}

export interface TokenVerificationOptions {
  expiredTokenMessage?: string;
  ignoreExpiration?: boolean;
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  EMAIL_VERIFICATION = 'email_verification',
  FORGOT_PASSWORD = 'forgot_password',
}
