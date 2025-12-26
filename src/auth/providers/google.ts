/**
 * Google OAuth プロバイダー実装
 */

import { BaseOAuthProvider, OAuthConfig, OAuthTokenResponse, OAuthUserProfile } from './base';

export class GoogleOAuthProvider extends BaseOAuthProvider {
  private readonly AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

  constructor(config: OAuthConfig) {
    super(config, 'google');
  }

  getAuthorizationUrl(state: string, scope: string[]): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scope.join(' '),
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.AUTHORIZATION_URL}?${params.toString()}`;
  }

  async getAccessToken(code: string, redirectUri?: string): Promise<OAuthTokenResponse> {
    const params = {
      code: code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri || this.config.redirectUri,
      grant_type: 'authorization_code',
    };
    
    console.log('Google OAuth token exchange params:', params);
    
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google OAuth token response error:', { status: response.status, body: errorText });
      throw new Error(`Google OAuth token request failed: ${response.statusText}`);
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
    const response = await fetch(this.USER_INFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Google user profile: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.picture,
      provider: this.provider,
    };
  }

  getDefaultScopes(): string[] {
    return ['openid', 'email', 'profile'];
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
    const response = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Google OAuth token refresh failed: ${response.statusText}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }
}
