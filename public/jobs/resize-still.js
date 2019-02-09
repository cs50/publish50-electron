const images = require('../images')

module.exports = function (job) {
  return images.resizeStill(job.data)
}
