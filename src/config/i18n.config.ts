import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nOptions,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';

export const i18nConfig: I18nOptions = {
  fallbackLanguage: 'ar',
  loaderOptions: {
    path: path.join(__dirname, '../i18n/'),
    watch: true,
  },
  resolvers: [
    // This reads from Accept-Language header - IMPORTANT for validation
    { use: HeaderResolver, options: ['accept-language'] },
    new AcceptLanguageResolver(),
    new QueryResolver(['lang', 'language']),
  ],
  typesOutputPath: path.join(__dirname, '../generated/i18n.generated.ts'),
};
