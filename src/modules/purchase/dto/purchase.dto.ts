import { IsString, IsNotEmpty } from 'class-validator';

export class RedeemCodeDto {
  @IsString({ message: 'كود الشراء يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'كود الشراء مطلوب' })
  code: string;
}
