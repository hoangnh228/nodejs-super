import { Router } from 'express'
import {
  uploadImageController,
  uploadVideoController,
  uploadVideoHLSController,
  getVideoStatusController
} from '~/controllers/media.controllers'
import { accessTokenValidator, verifyUserValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const mediaRouter = Router()

mediaRouter.post('/upload-image', accessTokenValidator, verifyUserValidator, wrapRequestHandler(uploadImageController))
mediaRouter.post('/upload-video', accessTokenValidator, verifyUserValidator, wrapRequestHandler(uploadVideoController))
mediaRouter.post(
  '/upload-video-hls',
  accessTokenValidator,
  verifyUserValidator,
  wrapRequestHandler(uploadVideoHLSController)
)

mediaRouter.get(
  '/video-status/:name',
  accessTokenValidator,
  verifyUserValidator,
  wrapRequestHandler(getVideoStatusController)
)

export default mediaRouter
