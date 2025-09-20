import { Router } from 'express'
import { createTweetController } from '~/controllers/tweets.controller'
import { accessTokenValidator, verifyUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'
import { createTweetValidator } from '~/middlewares/tweets.middleware'
const tweetRouter = Router()

tweetRouter.post(
  '/',
  accessTokenValidator,
  verifyUserValidator,
  createTweetValidator,
  wrapRequestHandler(createTweetController)
)

export default tweetRouter
