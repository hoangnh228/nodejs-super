import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { searchValidator } from '~/middlewares/search.middleware'
import { accessTokenValidator, verifyUserValidator } from '~/middlewares/users.middlewares'

const searchRouter = Router()

searchRouter.get('/', searchValidator, accessTokenValidator, verifyUserValidator, searchController)

export default searchRouter
