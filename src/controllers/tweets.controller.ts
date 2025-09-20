import { Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import { TWEET_MESSAGES } from '~/constants/messages'
import { CreateTweetRequestBody } from '~/models/requests/Tweet.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import tweetServices from '~/services/tweet.services'

export const createTweetController = async (req: Request<CreateTweetRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const tweet = await tweetServices.createTweet(req.body, user_id)
  return res.status(HTTP_STATUS.OK).json({
    message: TWEET_MESSAGES.TWEET_CREATED_SUCCESS,
    data: tweet
  })
}

export const getTweetController = async (req: Request, res: Response) => {
  const { tweet_id } = req.params
  const tweet = await tweetServices.getTweet(tweet_id)
  return res.status(HTTP_STATUS.OK).json({
    message: TWEET_MESSAGES.TWEET_FOUND_SUCCESS,
    data: tweet
  })
}
