import { IsUUID, IsNotEmpty } from 'class-validator';

export class AddToBasketDto {
  @IsUUID('4', { message: 'معرف الدورة غير صالح' })
  @IsNotEmpty({ message: 'معرف الدورة مطلوب' })
  courseId: string;
}

export class RemoveFromBasketDto {
  @IsUUID('4', { message: 'معرف الدورة غير صالح' })
  @IsNotEmpty({ message: 'معرف الدورة مطلوب' })
  courseId: string;
}
