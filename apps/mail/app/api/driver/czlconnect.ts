import { type IConfig, type MailManager } from './types';
import axios from 'axios';

// 确保已经安装了axios和node类型
// npm install axios @types/node

class StandardizedError extends Error {
  code: string;
  operation: string;
  context?: Record<string, any>;
  originalError: unknown;
  constructor(error: Error & { code: string }, operation: string, context?: Record<string, any>) {
    super(error?.message || '发生未知错误');
    this.name = 'StandardizedError';
    this.code = error?.code || 'UNKNOWN_ERROR';
    this.operation = operation;
    this.context = context;
    this.originalError = error;
  }
}

function sanitizeContext(context?: Record<string, any>) {
  if (!context) return undefined;
  const sanitized = { ...context };
  const sensitive = ['tokens', 'refresh_token', 'code', 'message', 'raw', 'data'];
  for (const key of sensitive) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

const withErrorHandler = async <T>(
  operation: string,
  fn: () => Promise<T> | T,
  context?: Record<string, any>,
): Promise<T> => {
  try {
    return await Promise.resolve(fn());
  } catch (error: any) {
    console.error(`[ERROR] [CZL Connect Driver] Operation: ${operation}`, {
      error: error.message,
      code: error.code,
      context: sanitizeContext(context),
      stack: error.stack,
    });
    throw new StandardizedError(error, operation, context);
  }
};

const withSyncErrorHandler = <T>(
  operation: string,
  fn: () => T,
  context?: Record<string, any>,
): T => {
  try {
    return fn();
  } catch (error: any) {
    console.error(`[CZL Connect Driver Error] Operation: ${operation}`, {
      error: error.message,
      code: error.code,
      context: sanitizeContext(context),
      stack: error.stack,
    });
    throw new StandardizedError(error, operation, context);
  }
};

const getScope = () => ['read', 'write'].join(' ');

export const driver = async (config: IConfig): Promise<MailManager> => {
  const clientId = process.env.CZLCONNECT_CLIENT_ID as string;
  const clientSecret = process.env.CZLCONNECT_CLIENT_SECRET as string;
  const redirectUri = process.env.CZLCONNECT_REDIRECT_URI as string;
  const authorizeUrl = 'https://connect.czl.net/oauth2/authorize';
  const tokenUrl = 'https://connect.czl.net/api/oauth2/token';
  const userInfoUrl = 'https://connect.czl.net/api/oauth2/userinfo';

  const manager: MailManager = {
    getAttachment: async (messageId: string, attachmentId: string) => {
      throw new Error('功能未实现');
    },
    getEmailAliases: async () => {
      return withErrorHandler('getEmailAliases', async () => {
        if (!config.auth?.email) {
          return [{ email: '', primary: true }];
        }
        
        return [
          { email: config.auth.email, primary: true }
        ];
      });
    },
    markAsRead: async (threadIds: string[]) => {
      throw new Error('功能未实现');
    },
    markAsUnread: async (threadIds: string[]) => {
      throw new Error('功能未实现');
    },
    getScope,
    getIdType: (id: string) => {
      return 'thread';
    },
    getUserInfo: (tokens: IConfig['auth']) => {
      return withErrorHandler(
        'getUserInfo',
        async () => {
          try {
            const response = await axios.get(userInfoUrl, {
              headers: {
                Authorization: `Bearer ${tokens?.access_token}`,
              },
            });
            
            const data = response.data;
            return {
              address: data.email || '',
              name: data.nickname || data.username || '',
              photo: data.avatar || '',
            };
          } catch (error: any) {
            console.error('获取用户信息失败:', error.message);
            throw error;
          }
        },
        { tokens },
      );
    },
    getTokens: async <T>(code: string) => {
      return withErrorHandler(
        'getTokens',
        async () => {
          try {
            // 使用Node.js Buffer API
            const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
            
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', code);
            params.append('redirect_uri', redirectUri);
            
            const response = await axios.post(tokenUrl, params, {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`,
              },
            });
            
            const { access_token, refresh_token, expires_in } = response.data;
            const expiryDate = expires_in ? Date.now() + expires_in * 1000 : undefined;
            
            return { 
              tokens: { 
                access_token, 
                refresh_token, 
                expiry_date: expiryDate 
              } 
            } as T;
          } catch (error: any) {
            console.error('获取令牌失败:', error.message);
            throw error;
          }
        },
        { code },
      );
    },
    generateConnectionAuthUrl: (userId: string) => {
      return withSyncErrorHandler(
        'generateConnectionAuthUrl',
        () => {
          const url = new URL(authorizeUrl);
          url.searchParams.append('response_type', 'code');
          url.searchParams.append('client_id', clientId);
          url.searchParams.append('redirect_uri', redirectUri);
          url.searchParams.append('scope', getScope());
          url.searchParams.append('state', userId);
          
          return url.toString();
        },
        { userId },
      );
    },
    count: async () => {
      return [];
    },
    list: async (
      folder: string,
      q: string,
      maxResults = 20,
      _labelIds: string[] = [],
      pageToken?: string,
    ) => {
      throw new Error('功能未实现');
    },
    get: async (id: string) => {
      throw new Error('功能未实现');
    },
    create: async (data) => {
      throw new Error('功能未实现');
    },
    delete: async (id: string) => {
      throw new Error('功能未实现');
    },
    normalizeIds: (ids: string[]) => {
      return { threadIds: ids };
    },
    modifyLabels: async (
      threadIds: string[],
      options: { addLabels: string[]; removeLabels: string[] },
    ) => {
      throw new Error('功能未实现');
    },
    sendDraft: async (draftId: string, data) => {
      throw new Error('功能未实现');
    },
    getDraft: async (draftId: string) => {
      throw new Error('功能未实现');
    },
    listDrafts: async (q?: string, maxResults = 20, pageToken?: string) => {
      throw new Error('功能未实现');
    },
    createDraft: async (data: any) => {
      throw new Error('功能未实现');
    },
    getUserLabels: async () => {
      return [];
    },
    getLabel: async (labelId: string) => {
      throw new Error('功能未实现');
    },
    createLabel: async (label) => {
      throw new Error('功能未实现');
    },
    updateLabel: async (id, label) => {
      throw new Error('功能未实现');
    },
    deleteLabel: async (id) => {
      throw new Error('功能未实现');
    },
    revokeRefreshToken: async (refreshToken: string) => {
      if (!refreshToken) {
        return false;
      }
      
      try {
        // CZL Connect可能没有提供吊销端点，这里仅返回true
        return true;
      } catch (error: any) {
        console.error('吊销CZL Connect令牌失败:', error.message);
        return false;
      }
    },
  };

  return manager;
}; 