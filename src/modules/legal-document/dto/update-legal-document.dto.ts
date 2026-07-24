import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Body used to create/update a legal document (privacy policy or terms).
 * The document type is taken from the route param, not the body.
 * Both language bodies are required so a document is never half-translated.
 */
export class UpdateLegalDocumentDto {
  @IsString({ message: 'المحتوى بالعربية يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'المحتوى بالعربية مطلوب' })
  contentAr: string;

  @IsString({ message: 'المحتوى بالإنجليزية يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'المحتوى بالإنجليزية مطلوب' })
  contentEn: string;
}
