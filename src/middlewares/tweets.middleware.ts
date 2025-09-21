import { validate } from '~/utils/validation'
import { checkSchema } from 'express-validator'
import { MediaType, TweetType, UserVerifyStatus } from '~/constants/enum'
import { TweetAudience } from '~/constants/enum'
import { numberEnumToArray } from '~/utils/commons'
import { TWEET_MESSAGES, USER_MESSAGES } from '~/constants/messages'
import { ObjectId } from 'mongodb'
import { isEmpty } from 'lodash'
import databaseServices from '~/services/database.services'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { NextFunction, Request, Response } from 'express'
import Tweet from '~/models/schemas/Tweet.schema'
import { TokenPayload } from '~/models/requests/User.requests'
import { wrapRequestHandler } from '~/utils/handlers'

const tweetType = numberEnumToArray(TweetType)
const tweetAudience = numberEnumToArray(TweetAudience)
const mediaType = numberEnumToArray(MediaType)

export const createTweetValidator = validate(
  checkSchema(
    {
      type: { isIn: { options: [tweetType] }, errorMessage: TWEET_MESSAGES.INVALID_TYPE },
      audience: { isIn: { options: [tweetAudience] }, errorMessage: TWEET_MESSAGES.INVALID_AUDIENCE },
      parent_id: {
        custom: {
          options: (value, { req }) => {
            const type = req.body.type
            if (
              [TweetType.Retweet, TweetType.QuoteTweet, TweetType.QuoteTweet].includes(type) &&
              !ObjectId.isValid(value)
            ) {
              throw new Error(TWEET_MESSAGES.INVALID_PARENT_ID)
            }

            if (type === TweetType.Comment && value !== null) {
              throw new Error(TWEET_MESSAGES.PARENT_ID_MUST_BE_NULL)
            }

            return true
          }
        }
      },
      content: {
        isString: true,
        custom: {
          options: (value, { req }) => {
            const type = req.body.type
            const hashtags = req.body.hashtags
            const mentions = req.body.mentions

            if (
              [TweetType.Comment, TweetType.QuoteTweet, TweetType.Tweet].includes(type) &&
              isEmpty(hashtags) &&
              isEmpty(mentions) &&
              value === ''
            ) {
              throw new Error(TWEET_MESSAGES.TWEET_CONTENT_IS_REQUIRED)
            }

            if (type === TweetType.Retweet && value !== '') {
              throw new Error(TWEET_MESSAGES.TWEET_CONTENT_MUST_BE_EMPTY)
            }

            return true
          }
        }
      },
      hashtags: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (value.some((hashtag: any) => typeof hashtag !== 'string')) {
              throw new Error(TWEET_MESSAGES.HASHTAG_MUST_BE_A_STRING)
            }
            return true
          }
        }
      },
      mentions: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (value.some((mention: any) => !ObjectId.isValid(mention))) {
              throw new Error(TWEET_MESSAGES.INVALID_MENTION_ID)
            }
            return true
          }
        }
      },
      medias: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (
              value.some((media: any) => {
                return typeof media.url !== 'string' || !mediaType.includes(media.type)
              })
            ) {
              throw new Error(TWEET_MESSAGES.INVALID_MEDIA)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const tweetIdValidator = validate(
  checkSchema(
    {
      tweet_id: {
        custom: {
          options: async (value, { req }) => {
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: TWEET_MESSAGES.INVALID_TWEET_ID,
                status: HTTP_STATUS.BAD_REQUEST
              })
            }

            const [tweet] = await databaseServices.tweets
              .aggregate<Tweet>([
                {
                  $match: {
                    _id: new ObjectId(value as ObjectId)
                  }
                },
                {
                  $lookup: {
                    from: 'hashtags',
                    localField: 'hashtags',
                    foreignField: '_id',
                    as: 'hashtags'
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'mentions',
                    foreignField: '_id',
                    as: 'mentions'
                  }
                },
                {
                  $addFields: {
                    mentions: {
                      $map: {
                        input: '$mentions',
                        as: 'mention',
                        in: {
                          _id: '$$mention._id',
                          name: '$$mention.name',
                          username: '$$mention.username',
                          email: '$$mention.email'
                        }
                      }
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'bookmarks',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'bookmarks'
                  }
                },
                {
                  $lookup: {
                    from: 'likes',
                    localField: '_id',
                    foreignField: 'tweet_id',
                    as: 'likes'
                  }
                },
                {
                  $lookup: {
                    from: 'tweets',
                    localField: '_id',
                    foreignField: 'parent_id',
                    as: 'tweet_children'
                  }
                },
                {
                  $addFields: {
                    bookmarks: {
                      $size: '$bookmarks'
                    },
                    likes: {
                      $size: '$likes'
                    },
                    retweet_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', TweetType.Retweet]
                          }
                        }
                      }
                    },
                    comment_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', TweetType.Comment]
                          }
                        }
                      }
                    },
                    quote_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: {
                            $eq: ['$$item.type', TweetType.QuoteTweet]
                          }
                        }
                      }
                    }
                    // views: {
                    //   $add: ['$user_views', '$guest_views']
                    // }
                  }
                },
                {
                  $project: {
                    tweet_children: 0
                  }
                }
              ])
              .toArray()

            if (!tweet) {
              throw new ErrorWithStatus({
                message: TWEET_MESSAGES.INVALID_TWEET_ID,
                status: HTTP_STATUS.NOT_FOUND
              })
            }

            req.tweet = tweet
            return true
          }
        }
      }
    },
    ['params', 'body']
  )
)

// if use async await in handler express, must be use try catch
// unless use wrapRequestHandler
export const audienceValidator = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweet
  if (tweet.audience === TweetAudience.TwitterCircle) {
    if (!req.decoded_authorization) {
      throw new ErrorWithStatus({ message: USER_MESSAGES.ACCESS_TOKEN_IS_REQUIRED, status: HTTP_STATUS.UNAUTHORIZED })
    }

    const author = await databaseServices.users.findOne({ _id: tweet.user_id })
    if (!author || author.verify === UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({ message: USER_MESSAGES.USER_NOT_FOUND, status: HTTP_STATUS.NOT_FOUND })
    }

    const { user_id } = req.decoded_authorization as TokenPayload
    const isInTwitterCircle = author.twitter_circle?.some((user_circle_id) => user_circle_id.equals(user_id))
    if (!author._id.equals(user_id) && !isInTwitterCircle) {
      throw new ErrorWithStatus({ message: USER_MESSAGES.USER_NOT_IN_TWITTER_CIRCLE, status: HTTP_STATUS.FORBIDDEN })
    }
  }

  return next()
})

export const getTweetChildrenValidator = validate(
  checkSchema(
    {
      type: { isIn: { options: [tweetType] }, errorMessage: TWEET_MESSAGES.INVALID_TYPE }
    },
    ['query']
  )
)

export const paginationValidator = validate(
  checkSchema(
    {
      limit: {
        isNumeric: true,
        custom: {
          options: (value) => {
            const valueNumber = Number(value)
            if (value < 1 || value > 100) {
              throw new Error(TWEET_MESSAGES.INVALID_LIMIT)
            }
            return true
          }
        }
      },
      page: {
        isNumeric: true,
        custom: {
          options: (value) => {
            const valueNumber = Number(value)
            if (valueNumber < 1) {
              throw new Error(TWEET_MESSAGES.INVALID_PAGE)
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)
