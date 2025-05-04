import { type IConfig, type MailManager } from './types';
import { driver as microsoftDriver } from './microsoft';
import { driver as googleDriver } from './google';
import { driver as czlconnectDriver } from './czlconnect';

const SupportedProviders = {
  google: googleDriver,
  microsoft: microsoftDriver,
  czlconnect: czlconnectDriver,
};

export const createDriver = async (
  provider: keyof typeof SupportedProviders | string,
  config: IConfig,
): Promise<MailManager> => {
  const factory = SupportedProviders[provider as keyof typeof SupportedProviders];
  if (!factory) throw new Error('Provider not supported');
  switch (provider) {
    case 'microsoft':
    case 'google':
    case 'czlconnect':
      return factory(config);
    default:
      throw new Error('Provider not supported');
  }
};
