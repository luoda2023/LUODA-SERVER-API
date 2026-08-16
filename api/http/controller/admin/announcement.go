package admin

import (
	"github.com/gin-gonic/gin"
	reqadmin "github.com/luoda2023/luoda-api/http/request/admin"
	"github.com/luoda2023/luoda-api/http/response"
	"github.com/luoda2023/luoda-api/model"
	"github.com/luoda2023/luoda-api/service"
)

// Announcement 后台系统通知管理：列表/发布/更新/删除。
type Announcement struct{}

func (r *Announcement) List(c *gin.Context) {
	q := &reqadmin.PageQuery{}
	if err := c.ShouldBindQuery(q); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	res := service.AllService.AnnouncementService.List(q.Page, q.PageSize, false)
	response.Success(c, res)
}

func (r *Announcement) Create(c *gin.Context) {
	f := &model.Announcement{}
	if err := c.ShouldBindJSON(f); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	if f.Title == "" {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}
	if f.Level == 0 {
		f.Level = model.AnnouncementLevelNormal
	}
	if err := service.AllService.AnnouncementService.Create(f); err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, f)
}

func (r *Announcement) Update(c *gin.Context) {
	f := &model.Announcement{}
	if err := c.ShouldBindJSON(f); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	if f.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}
	ex := service.AllService.AnnouncementService.Info(f.Id)
	if ex.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ItemNotFound"))
		return
	}
	if err := service.AllService.AnnouncementService.Update(f); err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, nil)
}

func (r *Announcement) Delete(c *gin.Context) {
	f := &model.Announcement{}
	if err := c.ShouldBindJSON(f); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	if f.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}
	ex := service.AllService.AnnouncementService.Info(f.Id)
	if ex.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ItemNotFound"))
		return
	}
	if err := service.AllService.AnnouncementService.Delete(ex); err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, nil)
}
