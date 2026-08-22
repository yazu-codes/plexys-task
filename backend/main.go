package main

import (
	"log/slog"
	"os"
	"plexys-auth/src/api"
	"plexys-auth/src/api/handlers"
	"plexys-auth/src/api/middleware"
	"plexys-auth/src/services"
	"plexys-auth/src/util"
)

func main() {
	logger := slog.New(
		slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}),
	)
	logger = logger.With(slog.String("component", "auth_service"))

	var config *util.ConfigReader = util.NewConfigReader()
	config.Setup()

	server := api.NewServer(config.Server.ConstructUrl(), logger)
	server.SetupDefaultConfig()

	// Initialize services and repositories
	cortezaAuthService := services.NewCortezaAuthService(config.Corteza.ClientID, config.Corteza.ClientSecret, config.Corteza.AuthBaseURL, config.Corteza.RedirectURI, logger)
	authHandler := handlers.NewCortezaAuthHandler(cortezaAuthService)

	server.Router.POST(
		"/api/auth/exchange",
		middleware.RateLimit(0.5, 5),
		authHandler.Exchange)

	server.Run()
}
