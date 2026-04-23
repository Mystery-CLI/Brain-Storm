import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { sanitize } from 'class-sanitizer';

type Constructor = new (...args: unknown[]) => unknown;

@Injectable()
export class SanitizationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    sanitize(value);
    return value;
  }

  private toValidate(metatype: Constructor): boolean {
    const types: Constructor[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
