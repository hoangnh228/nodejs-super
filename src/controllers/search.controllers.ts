import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { SearchQuery } from '~/models/requests/Search.requests'
import searchServices from '~/services/search.services'
import { SEARCH_MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/User.requests'
import { MediaTypeQuery, PeopleFollow } from '~/constants/enum'

export const searchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const media_type = req.query.media_type as MediaTypeQuery
  const people_follow = req.query.people_follow as PeopleFollow
  const user_id = req.decoded_authorization?.user_id as string
  const result = await searchServices.search({
    content: req.query.content,
    limit,
    page,
    user_id,
    media_type,
    people_follow
  })

  return res.json({
    message: SEARCH_MESSAGES.SEARCH_SUCCESS,
    data: {
      tweets: result.tweets,
      limit: limit,
      page: page,
      total_pages: Math.ceil(result.total / Number(limit))
    }
  })
}
