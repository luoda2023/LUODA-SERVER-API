package model

// Announcement 系统通知：后台发布，客户端点聊页拉取展示。
type Announcement struct {
	IdModel
	Title     string `json:"title" gorm:"type:varchar(200);default:'';not null;"`
	Content   string `json:"content" gorm:"type:text;"`
	Level     int    `json:"level" gorm:"default:1;not null;"`     // 1=普通 2=重要
	Pinned    int    `json:"pinned" gorm:"default:0;not null;"`    // 1=置顶
	Published int    `json:"published" gorm:"default:0;not null;"` // 1=已发布
	TimeModel
}

type AnnouncementList struct {
	Announcements []*Announcement `json:"list"`
	Pagination
}

const (
	AnnouncementLevelNormal    = 1
	AnnouncementLevelImportant = 2
)
