import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ArrayOrSinglePipe implements PipeTransform {
  constructor(private readonly dtoClass: new () => any) {}

  async transform(value: any) {
    const items = Array.isArray(value) ? value : [value];

    const validated: any[] = [];
    for (const item of items) {
      const dto = plainToInstance(this.dtoClass, item);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          property: error.property,
          value: error.value,
          constraints: error.constraints,
          children: error.children,
        }));
        throw new BadRequestException(formattedErrors);
      }

      validated.push(dto);
    }

    return validated;
  }
}
