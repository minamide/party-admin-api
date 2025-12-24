/**
 * OAuth プロバイダーマネージャー
 * プラグイン式で複数の OAuth プロバイダーを管理
 */

import { BaseOAuthProvider, OAuthConfig } from './base';
import { GoogleOAuthProvider } from './google';
import { GitHubOAuthProvider } from './github';
import { XOAuthProvider } from './x';
import { LineOAuthProvider } from './line';

export type ProviderType = 'google' | 'github' | 'x' | 'line';

export interface ProviderConfigs {
  google?: OAuthConfig;
  github?: OAuthConfig;
  x?: OAuthConfig;
  line?: OAuthConfig;
}

export class OAuthProviderManager {
  private providers: Map<ProviderType, BaseOAuthProvider> = new Map();

  constructor(configs?: ProviderConfigs) {
    if (configs?.google) {
      this.providers.set('google', new GoogleOAuthProvider(configs.google));
    }
    if (configs?.github) {
      this.providers.set('github', new GitHubOAuthProvider(configs.github));
    }
    if (configs?.x) {
      this.providers.set('x', new XOAuthProvider(configs.x));
    }
    if (configs?.line) {
      this.providers.set('line', new LineOAuthProvider(configs.line));
    }
  }

  /**
   * プロバイダーを取得
   */
  getProvider(type: ProviderType): BaseOAuthProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`OAuth provider '${type}' is not configured`);
    }
    return provider;
  }

  /**
   * 有効なプロバイダーのリストを取得
   */
  getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * プロバイダーが有効か確認
   */
  isProviderAvailable(type: ProviderType): boolean {
    return this.providers.has(type);
  }

  /**
   * 動的にプロバイダーを登録
   */
  registerProvider(type: ProviderType, providerOrConfig: BaseOAuthProvider | OAuthConfig): void {
    let provider: BaseOAuthProvider;

    // If it's already a provider instance, use it directly
    if (providerOrConfig instanceof BaseOAuthProvider) {
      provider = providerOrConfig;
    } else {
      // Otherwise, create a new provider from config
      switch (type) {
        case 'google':
          provider = new GoogleOAuthProvider(providerOrConfig);
          break;
        case 'github':
          provider = new GitHubOAuthProvider(providerOrConfig);
          break;
        case 'x':
          provider = new XOAuthProvider(providerOrConfig);
          break;
        case 'line':
          provider = new LineOAuthProvider(providerOrConfig);
          break;
        default:
          throw new Error(`Unknown provider type: ${type}`);
      }
    }

    this.providers.set(type, provider);
  }
}
