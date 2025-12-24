/**
 * OAuth プロバイダー基本インターフェース
 */

export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
}

/**
 * OAuth プロバイダーの基本クラス
 */
export abstract class BaseOAuthProvider {
  protected config: OAuthConfig;
  protected provider: string;

  constructor(config: OAuthConfig, provider: string) {
    this.config = config;
    this.provider = provider;
  }

  /**
   * 認可 URL を生成
   */
  abstract getAuthorizationUrl(state: string, scope: string[]): string;

  /**
   * アクセストークンを取得
   */
  abstract getAccessToken(code: string): Promise<OAuthTokenResponse>;

  /**
   * ユーザープロフィールを取得
   */
  abstract getUserProfile(accessToken: string): Promise<OAuthUserProfile>;

  /**
   * プロバイダー固有のスコープデフォルト値
   */
  abstract getDefaultScopes(): string[];

  /**
   * トークンをリフレッシュ
   */
  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    throw new Error('Refresh token is not supported by this provider');
  }
}
