/**
 * X (Twitter) OAuth プロバイダー実装
 * OAuth 2.0 PKCE フロー対応
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokenResponse, OAuthUserProfile } from './base';

export class XOAuthProvider extends BaseOAuthProvider {
  private readonly AUTHORIZATION_URL = 'https://twitter.com/i/oauth2/authorize';
  private readonly TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
  private readonly USER_INFO_URL = 'https://api.twitter.com/2/users/me';

  constructor(config: OAuthConfig) {
    super(config, 'x');
  }

  getAuthorizationUrl(state: string, scope: string[], codeChallenge?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scope.join(' '),
      state: state,
      code_challenge: codeChallenge || 'challenge',
      code_challenge_method: 'plain',
    });

    return `${this.AUTHORIZATION_URL}?${params.toString()}`;
  }

  async getAccessToken(code: string, codeVerifier?: string): Promise<OAuthTokenResponse> {
    const body: Record<string, string> = {
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
    };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams(body).toString(),
    });

    if (!response.ok) {
      throw new Error(`X OAuth token request failed: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    const response = await fetch(`${this.USER_INFO_URL}?user.fields=id,name,username,profile_image_url,created_at`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch X user profile: ${response.statusText}`);
    }

    const data = await response.json() as any;
    const user = data.data;

    return {
      id: user.id,
      email: `${user.username}@twitter.com`,
      name: user.name,
      avatar: user.profile_image_url,
      provider: this.provider,
    };
  }

  getDefaultScopes(): string[] {
    return ['tweet.read', 'users.read'];
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`X OAuth token refresh failed: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }
}
