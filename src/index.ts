import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middleware'
import mediaRouter from '~/routes/media.routes'
import { initFolder } from '~/utils/file'
import dotenv from 'dotenv'
import staticRouter from '~/routes/static.routes'
import { UPLOAD_VIDEO_DIR } from '~/constants/dir'
import cors from 'cors'
import tweetRouter from '~/routes/tweets.routes'
import bookmarkRouter from '~/routes/bookmarks.routes'
import likeRouter from '~/routes/likes.routes'
import searchRouter from '~/routes/search.routes'
import { createServer } from 'http'
import conversationsRouter from '~/routes/conversations.routes'
import initSocket from '~/utils/socket'
// import '~/utils/fake'

dotenv.config()

databaseService.connect().then(() => {
  databaseService.indexUsers()
  databaseService.indexRefreshTokens()
  databaseService.indexVideoStatuses()
  databaseService.indexFollowers()
  databaseService.indexTweets()
})

const app = express()
const httpServer = createServer(app)
app.use(cors())
const port = process.env.PORT || 4000

// create uploads directory if it doesn't exist
initFolder()

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.use(express.json())
app.use('/users', usersRouter)
app.use('/media', mediaRouter)
app.use('/static', staticRouter)
app.use('/tweets', tweetRouter)
app.use('/bookmarks', bookmarkRouter)
app.use('/likes', likeRouter)
app.use('/search', searchRouter)
app.use('/conversations', conversationsRouter)
// app.use('/static', express.static(UPLOAD_IMAGE_DIR))
app.use('/static/video', express.static(UPLOAD_VIDEO_DIR))
app.use(defaultErrorHandler)

initSocket(httpServer)

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
