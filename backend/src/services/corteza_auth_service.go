package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
)

type CortezaAuthService struct {
	ClientID     string
	ClientSecret string
	AuthBaseURL  string
	RedirectURI  string
	logger       *slog.Logger
}

func NewCortezaAuthService(clientID, clientSecret, authBaseURL, redirectURI string, logger *slog.Logger) *CortezaAuthService {
	return &CortezaAuthService{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		AuthBaseURL:  authBaseURL,
		RedirectURI:  redirectURI,
		logger:       logger,
	}
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	TokenType    string `json:"token_type,omitempty"`
	ExpiresIn    int    `json:"expires_in,omitempty"`
}

// ExchangeCode swaps an authorization_code for tokens, using the
// client secret server-side — this is the entire reason this service
// exists: the secret never touches the browser.
func (s *CortezaAuthService) ExchangeCode(code string) (*TokenResponse, error) {
	form := url.Values{}
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", s.RedirectURI)

	// TEMP DEBUG
	s.logger.Info(fmt.Sprintf("=== TOKEN EXCHANGE DEBUG ===\n"))
	s.logger.Info(fmt.Sprintf("ClientID:    %q\n", s.ClientID))
	s.logger.Info(fmt.Sprintf("Secret len:  %d\n", len(s.ClientSecret)))
	s.logger.Info(fmt.Sprintf("Code:        %q\n", code))
	s.logger.Info(fmt.Sprintf("RedirectURI: %q\n", s.RedirectURI))
	s.logger.Info(fmt.Sprintf("AuthBaseURL: %q\n", s.AuthBaseURL))
	s.logger.Info(fmt.Sprintf("Form body:   %s\n", form.Encode()))

	req, err := http.NewRequest(
		http.MethodPost,
		s.AuthBaseURL+"/oauth2/token",
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(s.ClientID, s.ClientSecret)

	s.logger.Info(fmt.Sprintf("Target URL:  %s\n", req.URL.String()))
	s.logger.Info(fmt.Sprintf("Auth header: %s\n", req.Header.Get("Authorization")))
	s.logger.Info(fmt.Sprintf("============================\n"))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	s.logger.Info(fmt.Sprintf("Response status: %d\n", resp.StatusCode))
	s.logger.Info(fmt.Sprintf("Response body:   %s\n", string(body)))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("corteza token exchange failed: %d %s", resp.StatusCode, string(body))
	}

	var tokenResp TokenResponse
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return nil, err
	}

	return &tokenResp, nil
}
