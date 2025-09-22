import { checkSchema } from 'express-validator'
import { MediaTypeQuery, PeopleFollow } from '~/constants/enum'
import { validate } from '~/utils/validation'

export const searchValidator = validate(
  checkSchema(
    {
      content: {
        isString: true
      },
      media_type: {
        isIn: {
          options: [Object.values(MediaTypeQuery)],
          errorMessage: 'Media type is invalid'
        },
        optional: true
      },
      limit: {
        isNumeric: true,
        optional: true
      },
      page: {
        isNumeric: true,
        optional: true
      },
      people_follow: {
        isIn: {
          options: [Object.values(PeopleFollow)],
          errorMessage: 'People follow is invalid'
        },
        optional: true
      }
    },
    ['query']
  )
)
