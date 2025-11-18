const { logger } = require('./logger_service');

// 外部からメッセージを受け取ってinfoレベルでログを出力する
function logInfo(message) {
    logger.info(message);
}

module.exports = { logInfo };