package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.SugaredLogger

func InitLogger(env string) (*zap.SugaredLogger, error) {
	var zapConfig zap.Config
	if env == "production" {
		zapConfig = zap.NewProductionConfig()
		zapConfig.EncoderConfig.TimeKey = "timestamp"
		zapConfig.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		zapConfig = zap.NewDevelopmentConfig()
		zapConfig.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	logger, err := zapConfig.Build()
	if err != nil {
		return nil, err
	}

	Log = logger.Sugar()
	return Log, nil
}
