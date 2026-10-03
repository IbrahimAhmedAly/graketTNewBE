import { IsBase64, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LicenseRequestDto {
  /** The player's single-use X25519 public key (SPKI DER, base64). */
  @IsBase64({}, { message: 'clientPublicKey must be base64' })
  @IsNotEmpty({ message: 'clientPublicKey is required' })
  @MaxLength(200)
  clientPublicKey: string;

  /** The desktop device id, checked against the device bound at login. */
  @IsString({ message: 'الرقم التسلسلي يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'الرقم التسلسلي مطلوب' })
  @MaxLength(200)
  serial: string;
}
