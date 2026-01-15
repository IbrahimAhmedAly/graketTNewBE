export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    name: string;
    roles: {
      id: string;
      name: string;
      description: string | null;
      permissions: {
        id: string;
        name: string;
        description: string | null;
        module: string;
      }[];
    }[];
  };
  tokens: {
    access: {
      token: string;
      expires: Date;
    };
    refresh?: {
      token: string;
      expires: Date;
    };
  };
}
