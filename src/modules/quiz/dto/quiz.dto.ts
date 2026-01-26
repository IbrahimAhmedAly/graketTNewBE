import {
  IsUUID,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @IsUUID('4', { message: 'معرف السؤال غير صالح' })
  @IsNotEmpty({ message: 'معرف السؤال مطلوب' })
  questionId: string;

  @IsUUID('4', { message: 'معرف الإجابة غير صالح' })
  @IsNotEmpty({ message: 'معرف الإجابة مطلوب' })
  selectedOptionId: string;
}

export class SubmitQuizDto {
  @IsUUID('4', { message: 'معرف الاختبار غير صالح' })
  @IsNotEmpty({ message: 'معرف الاختبار مطلوب' })
  quizId: string;

  @IsArray({ message: 'الإجابات يجب أن تكون مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  timeTaken?: number; // Time taken in seconds
}

export class StartQuizDto {
  @IsUUID('4', { message: 'معرف الاختبار غير صالح' })
  @IsNotEmpty({ message: 'معرف الاختبار مطلوب' })
  quizId: string;
}
