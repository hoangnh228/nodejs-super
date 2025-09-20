import { CreateLikeRequestBody } from '~/models/requests/Like.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import { Request, Response } from 'express'
import likesServices from '~/services/like.services'
import { LIKE_MESSAGES } from '~/constants/messages'

export const likeTweetController = async (req: Request<CreateLikeRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.body
  const result = await likesServices.likeTweet(user_id, tweet_id)
  return res.json({
    message: LIKE_MESSAGES.LIKE_CREATED_SUCCESS,
    data: result
  })
}

export const unlikeTweetController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.params
  const result = await likesServices.unlikeTweet(user_id, tweet_id)
  return res.json({
    message: LIKE_MESSAGES.LIKE_UNCREATED_SUCCESS,
    data: result
  })
}
