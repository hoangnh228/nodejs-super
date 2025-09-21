import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { TweetType } from '~/constants/enum'
import { TWEET_MESSAGES } from '~/constants/messages'
import { CreateTweetRequestBody, Pagination, TweetParams, TweetQuery } from '~/models/requests/Tweet.requests'
import { TokenPayload } from '~/models/requests/User.requests'
import tweetServices from '~/services/tweet.services'

export const createTweetController = async (req: Request<CreateTweetRequestBody, any, any, any>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const tweet = await tweetServices.createTweet(req.body, user_id)
  return res.json({
    message: TWEET_MESSAGES.TWEET_CREATED_SUCCESS,
    data: tweet
  })
}

export const getTweetController = async (req: Request, res: Response) => {
  const { tweet_id } = req.params
  const { user_id } = req.decoded_authorization as TokenPayload
  const tweet = await tweetServices.increaseView(tweet_id, user_id)
  const result = {
    ...req.tweet,
    guest_views: tweet?.guest_views,
    user_views: tweet?.user_views,
    updatedAt: tweet?.updatedAt
  }
  return res.json({
    message: TWEET_MESSAGES.TWEET_FOUND_SUCCESS,
    data: result
  })
}

export const getTweetChildrenController = async (req: Request<TweetParams, any, any, TweetQuery>, res: Response) => {
  const { tweet_id } = req.params
  const { type, limit, page } = req.query
  const { user_id } = req.decoded_authorization as TokenPayload
  const tweets = await tweetServices.getTweetChildren({
    tweet_id,
    type: Number(type) as TweetType,
    limit: Number(limit),
    page: Number(page),
    user_id
  })

  return res.json({
    message: TWEET_MESSAGES.TWEET_FOUND_SUCCESS,
    data: {
      tweets,
      limit: Number(limit),
      page: Number(page),
      type: Number(type) as TweetType,
      total_pages: Math.ceil(tweets.total / Number(limit))
    }
  })
}

export const getNewFeedsController = async (req: Request<ParamsDictionary, any, any, Pagination>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { limit, page } = req.query
  const result = await tweetServices.getNewFeeds({
    user_id,
    limit: Number(limit),
    page: Number(page)
  })

  return res.json({
    message: TWEET_MESSAGES.TWEET_FOUND_SUCCESS,
    data: {
      tweets: result.tweets,
      limit: limit,
      page: page,
      total_pages: Math.ceil(result.total / Number(limit))
    }
  })
}
