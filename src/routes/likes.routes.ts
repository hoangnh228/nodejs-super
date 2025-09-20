import { Router } from 'express'
import { likeTweetController, unlikeTweetController } from '~/controllers/likes.controllers'
import { accessTokenValidator, verifyUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const likeRouter = Router()

likeRouter.post('/', accessTokenValidator, verifyUserValidator, wrapRequestHandler(likeTweetController))
likeRouter.delete('/:tweet_id', accessTokenValidator, verifyUserValidator, wrapRequestHandler(unlikeTweetController))

export default likeRouter
