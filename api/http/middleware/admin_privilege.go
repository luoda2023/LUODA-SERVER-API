package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/luoda2023/luoda-api/http/response"
	"github.com/luoda2023/luoda-api/service"
)

// AdminPrivilege ...
func AdminPrivilege() gin.HandlerFunc {
	return func(c *gin.Context) {
		u := service.AllService.UserService.CurUser(c)

		if !service.AllService.UserService.IsAdmin(u) {
			response.Fail(c, 403, "无权限")
			c.Abort()
			return
		}

		c.Next()
	}
}
