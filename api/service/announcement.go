package service

import "github.com/luoda2023/luoda-api/model"

type AnnouncementService struct{}

// List 分页查询系统通知。onlyPublished=true 时只返回已发布的通知（客户端拉取用）。
func (s *AnnouncementService) List(page, pageSize uint, onlyPublished bool) *model.AnnouncementList {
	res := &model.AnnouncementList{}
	res.Page = int64(page)
	res.PageSize = int64(pageSize)
	tx := DB.Model(&model.Announcement{})
	if onlyPublished {
		tx = tx.Where("published = 1")
	}
	tx.Count(&res.Total)
	tx.Order("pinned desc, id desc")
	tx.Scopes(Paginate(page, pageSize))
	tx.Find(&res.Announcements)
	return res
}

func (s *AnnouncementService) Info(id uint) *model.Announcement {
	u := &model.Announcement{}
	DB.Where("id = ?", id).First(u)
	return u
}

func (s *AnnouncementService) Create(u *model.Announcement) error {
	return DB.Create(u).Error
}

// Update 全量更新：controller 已把缺失字段合并自原记录，因此
// 发布/取消发布（published 0/1）、置顶、改标题、改内容都可生效。
func (s *AnnouncementService) Update(u *model.Announcement) error {
	return DB.Model(&model.Announcement{}).Where("id = ?", u.Id).Updates(map[string]interface{}{
		"title":     u.Title,
		"content":   u.Content,
		"level":     u.Level,
		"pinned":    u.Pinned,
		"published": u.Published,
	}).Error
}

func (s *AnnouncementService) Delete(u *model.Announcement) error {
	return DB.Delete(u).Error
}
