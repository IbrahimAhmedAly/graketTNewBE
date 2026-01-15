import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  access: {
    token: string;
    expires: Date;
  };
}
