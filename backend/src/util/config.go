package util

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/spf13/viper"
)

type ConfigReader struct {
	Server  Server
	Corteza CortezaConfig
}

func NewConfigReader() *ConfigReader {
	return &ConfigReader{Server: Server{}, Corteza: CortezaConfig{}}
}

func (c *ConfigReader) Setup() {
	config := os.Getenv("CONFIG_YAML_AUTH")
	// config = "a"

	configPath := filepath.Join("configs", "config.yaml")

	fmt.Println("Making the directory for config")
	err := os.MkdirAll(filepath.Dir(configPath), 0755)
	if err != nil {
		log.Fatal(err)
	}

	// err = os.WriteFile(configPath, []byte(config), 0600)
	// if err != nil {
	// 	log.Fatal(err)
	// }

	if config != "" {
		fmt.Println("CONFIG_YAML environment variable is set. Writing to config.yaml.")
		err := os.WriteFile(configPath, []byte(config), 0600)
		if err != nil {
			fmt.Println("Error writing file.")
			panic(err)
		}
		fmt.Println("Wrote to config")
	} else {
		fmt.Println("CONFIG_YAML environment variable is not set. Using existing config.yaml.")
	}

	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath("configs") // current directory

	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("failed to read config: %v", err)
	}

	fmt.Println("config read successfully")

	// -----------------------
	// Extract values
	// -----------------------
	c.Server.Address = viper.GetString("server.address")
	c.Server.Port = viper.GetString("server.port")

	c.Corteza.ClientID = viper.GetString("corteza.client_id")
	c.Corteza.ClientSecret = viper.GetString("corteza.client_secret")
	c.Corteza.AuthBaseURL = viper.GetString("corteza.auth_base_url")
	c.Corteza.RedirectURI = viper.GetString("corteza.redirect_uri")
}

type Server struct {
	Address string
	Port    string
}

func (s *Server) ConstructUrl() string {
	return s.Address + ":" + s.Port
}

type CortezaConfig struct {
	ClientID     string
	ClientSecret string
	AuthBaseURL  string // e.g. http://localhost:18080/auth
	RedirectURI  string // e.g. http://localhost:5173/callback
}
