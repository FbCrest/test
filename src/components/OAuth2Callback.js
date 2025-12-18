import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exchangeCodeForTokens } from '../services/googleAuthService';
import '../styles/oauth-callback.css';

const OAuth2Callback = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(t('oauth.processingAuth', 'Processing authentication...'));

  useEffect(() => {
    const processAuthCode = async () => {
      try {
        // Get the authorization code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (!code) {
          setStatus(t('oauth.noAuthCode', 'Error: No authorization code received'));
          return;
        }

        // Exchange code for tokens
        await exchangeCodeForTokens(code);

        setStatus(t('oauth.authSuccess', 'Authentication successful! Redirecting...'));

        // Redirect back to the main page
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus(t('oauth.authFailed', 'Authentication failed: {{error}}', { error: error.message }));
      }
    };

    processAuthCode();
  }, [t]);

  return (
    <div className="oauth-callback-container">
      <div className="oauth-callback-content">
        <h2>{t('oauth.youtubeAuth', 'YouTube Authentication')}</h2>
        <p>{status}</p>
        {status.includes('failed') && (
          <button
            onClick={() => window.location.href = '/'}
            className="primary-button"
          >
            {t('oauth.returnToApp', 'Return to Application')}
          </button>
        )}
      </div>
    </div>
  );
};

export default OAuth2Callback;
