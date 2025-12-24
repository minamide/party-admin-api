/**
 * LINE OAuth プロバイダー実装
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokenResponse, OAuthUserProfile } from './base';

export class LineOAuthProvider extends BaseOAuthProvider {
  private readonly AUTHORIZATION_URL = 'https://web.line.biz/web/login';
  private readonly TOKEN_URL = 'https://api.line.biz/v1/oauth/accessToken';
  private readonly USER_INFO_URL = 'https://api.line.biz/v1/userprofile';

  constructor(config: OAuthConfig) {
    super(config, 'line');
  }

  getAuthorizationUrl(state: string, scope: string[]): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: state,
      scope: scope.join(' '),
    });

    return `${this.AUTHORIZATION_URL}?${params.toString()}`;
  }

  async getAccessToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`LINE OAuth token request failed: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch(this.USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LINE user profile: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      id: data.userId,
      email: data.email || `${data.userId}@line.me`,
      name: data.displayName,
      avatar: data.pictureUrl,
      provider: this.provider,
    };
  }

  getDefaultScopes(): string[] {
    return ['profile', 'email'];
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`LINE OAuth token refresh failed: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || 'Bearer',
    };
  }
}
