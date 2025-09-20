import { TweetAudience, TweetType } from '~/constants/enum'
import { Media } from '~/models/Other'

export interface CreateTweetRequestBody {
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: string | null
  hashtags: string[]
  mentions: string[]
  medias: Media[]
}
