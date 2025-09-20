import { validate } from '~/utils/validation'
import { checkSchema } from 'express-validator'
import { MediaType, TweetType } from '~/constants/enum'
import { TweetAudience } from '~/constants/enum'
import { numberEnumToArray } from '~/utils/commons'
import { TWEET_MESSAGES } from '~/constants/messages'
import { ObjectId } from 'mongodb'
import { isEmpty } from 'lodash'

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
