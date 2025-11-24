
const logger = {
    info: function(msg) {
        console.log(`[INFO] ${msg}`);
    },
    error: function(msg) {
        console.error(`[ERROR] ${msg}`);
    }
};
module.exports = { logger };