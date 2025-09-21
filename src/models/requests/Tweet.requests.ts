import { TweetAudience, TweetType } from '~/constants/enum'
import { Media } from '~/models/Other'
import { ParamsDictionary, Query } from 'express-serve-static-core'

export interface CreateTweetRequestBody {
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: string | null
  hashtags: string[]
  mentions: string[]
  medias: Media[]
}

export interface TweetParams extends ParamsDictionary {
  tweet_id: string
}
export interface TweetQuery extends Pagination, Query {
  type: string
}

export interface Pagination {
  limit: string
  page: string
}
