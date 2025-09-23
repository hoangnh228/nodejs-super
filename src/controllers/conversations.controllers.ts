import { Request, Response } from 'express'
import { TokenPayload } from '~/models/requests/User.requests'
import conversationsServices from '~/services/conversations.services'
import { GetConversationParams } from '~/models/requests/Conversation.requests'

export const getConversationsController = async (req: Request<GetConversationParams>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { receiver_id } = req.params
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const conversations = await conversationsServices.getConversations({
    senderId: user_id,
    receiverId: receiver_id,
    limit,
    page
  })

  return res.json({
    message: 'Get conversations successfully',
    data: {
      conversations,
      limit,
      page,
      total_pages: Math.ceil(conversations.total / limit)
    }
  })
}
