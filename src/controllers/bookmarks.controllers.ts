import { BookmarkRequestBody } from '~/models/requests/Bookmark.requests'
import { Request, Response } from 'express'
import { TokenPayload } from '~/models/requests/User.requests'
import bookmarksServices from '~/services/bookmarks.services'
import { BOOKMARK_MESSAGES } from '~/constants/messages'

export const bookmarkTweetController = async (req: Request<BookmarkRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.body
  const result = await bookmarksServices.bookmarkTweet(user_id, tweet_id)
  return res.json({
    message: BOOKMARK_MESSAGES.BOOKMARK_CREATED_SUCCESS,
    data: result
  })
}

export const unbookmarkTweetController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.params
  const result = await bookmarksServices.unbookmarkTweet(user_id, tweet_id)
  return res.json({
    message: BOOKMARK_MESSAGES.BOOKMARK_UNCREATED_SUCCESS,
    data: result
  })
}
