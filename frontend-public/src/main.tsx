import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import App from './App';
import theme from './theme';
import './index.css';

// Auth0 configuration
const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const auth0Audience = import.meta.env.VITE_AUTH0_AUDIENCE;

// Check if Auth0 is configured
const isAuth0Configured = auth0Domain && auth0ClientId;

// Handle Auth0 callback redirect
const onRedirectCallback = (appState?: AppState) => {
  console.log('Auth0 redirect callback, appState:', appState);
  // Navigate to the returnTo path or default to /menu
  const returnTo = appState?.returnTo || '/menu';
  window.history.replaceState({}, document.title, returnTo);
};

const AppWithProviders = () => (
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Render with or without Auth0 based on configuration
if (isAuth0Configured) {
  // Build authorization params - only include audience if configured
  const authorizationParams: Record<string, string> = {
    redirect_uri: window.location.origin,
    scope: 'openid profile email',
  };

  // Only add audience if it's configured (for API access tokens)
  if (auth0Audience) {
    authorizationParams.audience = auth0Audience;
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <Auth0Provider
      domain={auth0Domain}
      clientId={auth0ClientId}
      authorizationParams={authorizationParams}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <AppWithProviders />
    </Auth0Provider>
  );
} else {
  // Legacy mode without Auth0
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <AppWithProviders />
  );
}
