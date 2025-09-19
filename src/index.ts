import express from 'express'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middleware'
import mediaRouter from '~/routes/media.routes'
import { initFolder } from '~/utils/file'
import dotenv from 'dotenv'
import staticRouter from '~/routes/static.routes'
import { UPLOAD_VIDEO_DIR } from '~/constants/dir'
dotenv.config()

databaseService.connect()
const app = express()
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
// app.use('/static', express.static(UPLOAD_IMAGE_DIR))
app.use('/static/video', express.static(UPLOAD_VIDEO_DIR))

app.use(defaultErrorHandler)
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
