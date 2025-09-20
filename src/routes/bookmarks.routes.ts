import { Router } from 'express'
import { bookmarkTweetController, unbookmarkTweetController } from '~/controllers/bookmarks.controllers'
import { accessTokenValidator, verifyUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const bookmarkRouter = Router()

bookmarkRouter.post('/', accessTokenValidator, verifyUserValidator, wrapRequestHandler(bookmarkTweetController))
bookmarkRouter.delete(
  '/:tweet_id',
  accessTokenValidator,
  verifyUserValidator,
  wrapRequestHandler(unbookmarkTweetController)
)

export default bookmarkRouter
