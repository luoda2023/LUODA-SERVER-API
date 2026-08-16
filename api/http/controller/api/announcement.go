package api

import (
	"github.com/gin-gonic/gin"
	"github.com/luoda2023/luoda-api/http/response"
	"github.com/luoda2023/luoda-api/service"
)

// Announcement 客户端公开拉取已发布的系统通知。
type Announcement struct{}

// List GET /api/announcements —— 无需登录，只返回 published=1 的通知（置顶优先）。
func (r *Announcement) List(c *gin.Context) {
	res := service.AllService.AnnouncementService.List(1, 50, true)
	response.Success(c, res)
}
