package handlers

import (
	"net/http"
	"plexys-auth/src/services"

	"github.com/gin-gonic/gin"
)

type CortezaAuthHandler struct {
	authService *services.CortezaAuthService
}

func NewCortezaAuthHandler(authService *services.CortezaAuthService) *CortezaAuthHandler {
	return &CortezaAuthHandler{authService: authService}
}

type exchangeRequest struct {
	Code string `json:"code" binding:"required"`
}

func (h *CortezaAuthHandler) Exchange(c *gin.Context) {
	var req exchangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code is required"})
		return
	}

	tokenResp, err := h.authService.ExchangeCode(req.Code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tokenResp)
}
