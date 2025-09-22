import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType } from '~/constants/enum'
import { CreateTweetRequestBody } from '~/models/requests/Tweet.requests'
import Hashtag from '~/models/schemas/Hashtag.schema'
import Tweet from '~/models/schemas/Tweet.schema'
import databaseServices from '~/services/database.services'

class TweetService {
  async checkAndCreateHashtags(hashtags: string[]) {
    const result = await Promise.all(
      hashtags.map((hashtag) => {
        return databaseServices.hashtags.findOneAndUpdate(
          { name: hashtag },
          { $setOnInsert: new Hashtag({ name: hashtag }) },
          { upsert: true, returnDocument: 'after' }
        )
      })
    )
    return result.map((doc) => doc!._id!)
  }

  async createTweet(body: CreateTweetRequestBody, user_id: string) {
    const hashtags = await this.checkAndCreateHashtags(body.hashtags)
    const insertTweet = await databaseServices.tweets.insertOne(
      new Tweet({
        user_id: new ObjectId(user_id),
        audience: body.audience,
        content: body.content,
        guest_views: 0,
        user_views: 0,
        hashtags,
        mentions: body.mentions,
        medias: body.medias,
        type: body.type,
        parent_id: body.parent_id
      })
    )

    return databaseServices.tweets.findOne({ _id: insertTweet.insertedId })
  }

  async increaseView(tweet_id: string, user_id: string) {
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const tweet = await databaseServices.tweets.findOneAndUpdate(
      { _id: new ObjectId(tweet_id) },
      { $inc: inc, $currentDate: { updatedAt: true } },
      { returnDocument: 'after', projection: { user_views: 1, guest_views: 1, updatedAt: 1 } }
    )
    return tweet
  }

  async getTweetChildren({
    tweet_id,
    type,
    limit,
    page,
    user_id
  }: {
    tweet_id: string
    type: TweetType
    limit: number
    page: number
    user_id?: string
  }) {
    const tweets = await databaseServices.tweets
      .aggregate<Tweet>([
        {
          $match: {
            _id: new ObjectId(tweet_id),
            type
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
        },
        {
          $skip: limit * (page - 1)
        },
        {
          $limit: limit
        }
      ])
      .toArray()

    const ids = tweets.map((tweet) => tweet._id as ObjectId)
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const date = new Date()
    const [total] = await Promise.all([
      databaseServices.tweets.countDocuments({ _id: new ObjectId(tweet_id), type }),
      databaseServices.tweets.updateMany({ _id: { $in: ids } }, { $inc: inc, $set: { updatedAt: date } })
    ])

    tweets.forEach((tweet) => {
      tweet.updatedAt = date
      if (user_id) {
        tweet.user_views = (tweet.user_views ?? 0) + 1
      } else {
        tweet.guest_views = (tweet.guest_views ?? 0) + 1
      }
    })

    return {
      tweets,
      total
    }
  }

  async getNewFeeds({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    const userIdObject = new ObjectId(user_id)
    const followers = await databaseServices.followers
      .find({ user_id: userIdObject }, { projection: { followed_user_id: 1, _id: 0 } })
      .toArray()

    const followerIds = followers.map((follower) => follower.followed_user_id)
    followerIds.push(userIdObject)

    const [tweets, total] = await Promise.all([
      databaseServices.tweets
        .aggregate([
          {
            $match: {
              user_id: { $in: followerIds }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
          },
          {
            $match: {
              $or: [
                { audience: TweetAudience.Everyone },
                {
                  $and: [{ audience: TweetAudience.TwitterCircle }, { 'user.twitter_circle': { $in: [userIdObject] } }]
                }
              ]
            }
          },
          {
            $skip: limit * (page - 1)
          },
          {
            $limit: limit
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
            }
          },
          {
            $project: {
              tweet_children: 0,
              user: {
                password: 0,
                email_verify_token: 0,
                forgot_password_token: 0,
                twitter_circle: 0,
                date_of_birth: 0
              }
            }
          }
        ])
        .toArray(),
      databaseServices.tweets
        .aggregate([
          {
            $match: {
              user_id: { $in: followerIds }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          {
            $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
          },
          {
            $match: {
              $or: [
                { audience: TweetAudience.Everyone },
                {
                  $and: [{ audience: TweetAudience.TwitterCircle }, { 'user.twitter_circle': { $in: [userIdObject] } }]
                }
              ]
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])

    const tweetIds = tweets.map((tweet) => tweet._id as ObjectId)
    const date = new Date()
    await databaseServices.tweets.updateMany(
      { _id: { $in: tweetIds } },
      { $inc: { user_views: 1 }, $set: { updatedAt: date } }
    )

    tweets.forEach((tweet) => {
      tweet.updatedAt = date
      tweet.user_views = (tweet.user_views ?? 0) + 1
    })

    return { tweets, total: total[0]?.total ?? 0 }
  }
}

export default new TweetService()
