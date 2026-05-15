package orm

import (
	"fmt"
	"github.com/glebarez/sqlite"
	"github.com/luoda2023/luoda-api/global"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"time"
)

type SqliteConfig struct {
	MaxIdleConns int
	MaxOpenConns int
}

func NewSqlite(sqliteConf *SqliteConfig) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("./data/LUODAapi.db"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
		Logger: logger.New(
			global.Logger, // io writer
			logger.Config{
				SlowThreshold:             time.Second, // Slow SQL threshold
				LogLevel:                  logger.Warn, // Log level
				IgnoreRecordNotFoundError: true,        // Ignore ErrRecordNotFound error for logger
				ParameterizedQueries:      true,        // Don't include params in the SQL log
				Colorful:                  true,
			},
		),
	})
	if err != nil {
		panic(fmt.Sprintf("failed to open SQLite database: %v", err))
	}
	sqlDB, err2 := db.DB()
	if err2 != nil {
		panic(fmt.Sprintf("failed to get SQLite DB handle: %v", err2))
	}
	sqlDB.SetMaxIdleConns(sqliteConf.MaxIdleConns)
	sqlDB.SetMaxOpenConns(sqliteConf.MaxOpenConns)

	return db
}
