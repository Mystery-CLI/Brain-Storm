import { SanitizerConstraint } from 'class-sanitizer';
import * as sanitizeHtml from 'sanitize-html';

@SanitizerConstraint()
export class StripHtmlSanitizer {
  sanitize(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
}
