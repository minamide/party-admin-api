/**
 * メール送信ユーティリティ
 * Cloudflare Workers環境でのメール送信機能
 */

/**
 * メール送信設定
 */
export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * メール送信結果
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * メール送信サービス（MailGun、SendGrid、Resend等に対応）
 * 環境変数でサービスを選択
 */
export async function sendEmail(config: EmailConfig, env: CloudflareBindings): Promise<EmailResult> {
  try {
    // Resendを使用する場合
    if (env.EMAIL_SERVICE === 'resend' && env.RESEND_API_KEY) {
      return await sendWithResend(config, env);
    }
    
    // MailGunを使用する場合
    if (env.EMAIL_SERVICE === 'mailgun' && env.MAILGUN_API_KEY) {
      return await sendWithMailgun(config, env);
    }
    
    // 開発環境では console.log で出力
    if (env.NODE_ENV === 'development') {
      console.log('📧 Email would be sent:', config);
      return { success: true, messageId: 'dev-' + Date.now() };
    }
    
    throw new Error('No email service configured');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    console.error('Email sending failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Resend API でメール送信
 */
async function sendWithResend(config: EmailConfig, env: CloudflareBindings): Promise<EmailResult> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: config.subject,
      html: config.html,
      text: config.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

/**
 * MailGun API でメール送信
 */
async function sendWithMailgun(config: EmailConfig, env: CloudflareBindings): Promise<EmailResult> {
  const domain = env.MAILGUN_DOMAIN;
  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  
  const formData = new FormData();
  formData.append('from', config.from);
  formData.append('to', config.to);
  formData.append('subject', config.subject);
  formData.append('html', config.html);
  if (config.text) {
    formData.append('text', config.text);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MailGun API error: ${error}`);
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

/**
 * 認証メールのHTMLテンプレート生成
 */
export function generateVerificationEmailHtml(
  userName: string,
  verificationUrl: string,
  appName: string = 'Party Admin'
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>メール認証 - ${appName}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background-color: #f9fafb; }
    .button { 
      display: inline-block; 
      background-color: #4f46e5; 
      color: white; 
      text-decoration: none; 
      padding: 12px 24px; 
      border-radius: 6px; 
      margin: 20px 0; 
    }
    .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${appName}</h1>
    </div>
    <div class="content">
      <h2>メールアドレスの認証をお願いします</h2>
      <p>こんにちは、${userName}さん</p>
      <p>${appName}にご登録いただき、ありがとうございます。</p>
      <p>アカウントの登録を完了するため、下のボタンをクリックしてメールアドレスの認証を行ってください：</p>
      
      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">メールアドレスを認証する</a>
      </div>
      
      <p>ボタンが機能しない場合は、以下のURLを直接ブラウザにコピー＆ペーストしてください：</p>
      <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 4px;">
        ${verificationUrl}
      </p>
      
      <p><strong>注意：</strong> このリンクは24時間で期限切れになります。</p>
      <p>このメールに覚えがない場合は、このメールを無視してください。</p>
    </div>
    <div class="footer">
      <p>&copy; 2024 ${appName}. All rights reserved.</p>
      <p>このメールは自動送信されています。返信しないでください。</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 認証メールのプレーンテキスト版
 */
export function generateVerificationEmailText(
  userName: string,
  verificationUrl: string,
  appName: string = 'Party Admin'
): string {
  return `
${appName} - メールアドレス認証

こんにちは、${userName}さん

${appName}にご登録いただき、ありがとうございます。

アカウントの登録を完了するため、以下のURLにアクセスしてメールアドレスの認証を行ってください：

${verificationUrl}

注意: このリンクは24時間で期限切れになります。

このメールに覚えがない場合は、このメールを無視してください。

--
${appName} チーム
このメールは自動送信されています。返信しないでください。
  `;
}