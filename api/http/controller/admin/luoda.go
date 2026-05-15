package admin

import (
	"github.com/gin-gonic/gin"
	"github.com/luoda2023/luoda-api/global"
	"github.com/luoda2023/luoda-api/http/request/admin"
	"github.com/luoda2023/luoda-api/http/response"
	"github.com/luoda2023/luoda-api/model"
	"github.com/luoda2023/luoda-api/service"
)

type LUODA struct {
}

type LUODACmd struct {
	Cmd    string `json:"cmd"`
	Option string `json:"option"`
	Target string `json:"target"`
}

func (r *LUODA) CmdList(c *gin.Context) {
	q := &admin.PageQuery{}
	if err := c.ShouldBindQuery(q); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	res := service.AllService.ServerCmdService.List(q.Page, 9999)
	//在列表前添加系统命令
	list := make([]*model.ServerCmd, 0)
	list = append(list, model.SysIdServerCmds...)
	list = append(list, model.SysRelayServerCmds...)
	list = append(list, res.ServerCmds...)
	res.ServerCmds = list
	response.Success(c, res)
}

func (r *LUODA) CmdDelete(c *gin.Context) {
	f := &model.ServerCmd{}
	if err := c.ShouldBindJSON(f); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	if f.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}

	ex := service.AllService.ServerCmdService.Info(f.Id)
	if ex.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ItemNotFound"))
		return
	}

	err := service.AllService.ServerCmdService.Delete(ex)
	if err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, nil)
}
func (r *LUODA) CmdCreate(c *gin.Context) {
	f := &model.ServerCmd{}
	if err := c.ShouldBindJSON(f); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	errList := global.Validator.ValidStruct(c, f)
	if len(errList) > 0 {
		response.Fail(c, 101, errList[0])
		return
	}
	err := service.AllService.ServerCmdService.Create(f)
	if err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, nil)
}

func (r *LUODA) CmdUpdate(c *gin.Context) {
	f := &model.ServerCmd{}
	if err := c.ShouldBindJSON(f); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	errList := global.Validator.ValidStruct(c, f)
	if len(errList) > 0 {
		response.Fail(c, 101, errList[0])
		return
	}
	ex := service.AllService.ServerCmdService.Info(f.Id)
	if ex.Id == 0 {
		response.Fail(c, 101, response.TranslateMsg(c, "ItemNotFound"))
		return
	}
	err := service.AllService.ServerCmdService.Update(f)
	if err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, nil)
}

func (r *LUODA) SendCmd(c *gin.Context) {
	rc := &LUODACmd{}
	if err := c.ShouldBindJSON(rc); err != nil {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError")+err.Error())
		return
	}
	if rc.Cmd == "" {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}
	if rc.Target == "" {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}
	if rc.Target != model.ServerCmdTargetIdServer && rc.Target != model.ServerCmdTargetRelayServer {
		response.Fail(c, 101, response.TranslateMsg(c, "ParamsError"))
		return
	}

	port := 0
	switch rc.Target {
	case model.ServerCmdTargetIdServer:
		port = global.Config.Admin.IdServerPort - 1
	case model.ServerCmdTargetRelayServer:
		port = global.Config.Admin.RelayServerPort
	}

	res, err := service.AllService.ServerCmdService.SendCmd(port, rc.Cmd, rc.Option)
	if err != nil {
		response.Fail(c, 101, err.Error())
		return
	}
	response.Success(c, res)
}
