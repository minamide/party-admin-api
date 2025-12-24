/**
 * GitHub OAuth プロバイダー実装
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokenResponse, OAuthUserProfile } from './base';

export class GitHubOAuthProvider extends BaseOAuthProvider {
  private readonly AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize';
  private readonly TOKEN_URL = 'https://github.com/login/oauth/access_token';
  private readonly USER_INFO_URL = 'https://api.github.com/user';

  constructor(config: OAuthConfig) {
    super(config, 'github');
  }

  getAuthorizationUrl(state: string, scope: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scope.join(' '),
      state: state,
      allow_signup: 'true',
    });

    return `${this.AUTHORIZATION_URL}?${params.toString()}`;
  }

  async getAccessToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth token request failed: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      tokenType: data.token_type,
      expiresIn: data.expires_in,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch(this.USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GitHub user profile: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      id: data.id.toString(),
      email: data.email || `${data.login}@github.com`,
      name: data.name || data.login,
      avatar: data.avatar_url,
      provider: this.provider,
    };
  }

  getDefaultScopes(): string[] {
    return ['read:user', 'user:email'];
  }
}
