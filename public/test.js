const images = require('./images')
const Queue = require('bull')
const queue = new Queue('queue')

queue.process('resize still', 32, (job) => {
  console.log('CALLING RESIZE STILL', typeof(images.resizeStill))
  return images.resieStill(job.data)
})

queue.add('resize still', { imagePath: '/home/kzidane/kareem/stills/week0.png', raster: '4k'})

console.log('GETTING JOBS')
queue.getJobs().then((jobs) => {
  console.log(jobs)
})
