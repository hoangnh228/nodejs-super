import { Router } from 'express'
import { getConversationsController } from '~/controllers/conversations.controllers'
import { accessTokenValidator, getConversationValidator, verifyUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const conversationsRouter = Router()

conversationsRouter.get(
  '/receiver/:receiver_id',
  accessTokenValidator,
  verifyUserValidator,
  getConversationValidator,
  wrapRequestHandler(getConversationsController)
)

export default conversationsRouter
