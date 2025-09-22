import { ObjectId } from 'mongodb'
import { MediaType, MediaTypeQuery, PeopleFollow, TweetAudience, TweetType } from '~/constants/enum'
import { SearchQuery } from '~/models/requests/Search.requests'
import databaseServices from '~/services/database.services'

class SearchService {
  async search({
    content,
    limit,
    page,
    user_id,
    media_type,
    people_follow
  }: {
    limit: number
    page: number
    content: string
    user_id: string
    media_type?: MediaTypeQuery
    people_follow?: PeopleFollow
  }) {
    const userIdObject = new ObjectId(user_id)
    const $match: any = {
      $text: {
        $search: content
      }
    }

    if (media_type) {
      if (media_type === MediaTypeQuery.Video) {
        $match['medias.type'] = { $in: [MediaType.Video, MediaType.HLS] }
      } else if (media_type === MediaTypeQuery.Image) {
        $match['medias.type'] = MediaType.Image
      }
    }

    if (people_follow && people_follow === PeopleFollow.Following) {
      const followers = await databaseServices.followers
        .find({ user_id: userIdObject }, { projection: { followed_user_id: 1, _id: 0 } })
        .toArray()

      const followerIds = followers.map((follower) => follower.followed_user_id)
      followerIds.push(userIdObject)
      $match['user_id'] = { $in: followerIds }
    }

    const [tweets, total] = await Promise.all([
      databaseServices.tweets
        .aggregate([
          {
            $match
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
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true
            }
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
          },
          {
            $skip: limit * (page - 1)
          },
          {
            $limit: limit
          }
        ])
        .toArray(),
      databaseServices.tweets
        .aggregate([
          {
            $match
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
            $unwind: {
              path: '$user',
              preserveNullAndEmptyArrays: true
            }
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

export default new SearchService()
