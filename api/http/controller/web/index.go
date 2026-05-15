package web

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/luoda2023/luoda-api/global"
)

type Index struct {
}

func (i *Index) Index(c *gin.Context) {
	c.Redirect(302, "/_admin/")
}

func (i *Index) ConfigJs(c *gin.Context) {
	apiServer := global.Config.LUODA.ApiServer
	magicQueryonline := global.Config.LUODA.WebclientMagicQueryonline
	tmp := fmt.Sprintf(`localStorage.setItem('api-server', '%v');
const ws2_prefix = 'wc-';
localStorage.setItem(ws2_prefix+'api-server', '%v');

window.webclient_magic_queryonline = %d;
window.ws_host = '%v';
`, apiServer, apiServer, magicQueryonline, global.Config.LUODA.WsHost)
	//	tmp := `
	//localStorage.setItem('api-server', "` + apiServer + `")
	//const ws2_prefix = 'wc-'
	//localStorage.setItem(ws2_prefix+'api-server', "` + apiServer + `")
	//
	//window.webclient_magic_queryonline = ` + magicQueryonline + ``

	c.Header("Content-Type", "application/javascript")
	c.String(200, tmp)
}
