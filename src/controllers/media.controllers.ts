import { Request, Response } from 'express'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { USER_MESSAGES } from '~/constants/messages'
import mediaServices from '~/services/media.services'
import path from 'path'
import HTTP_STATUS from '~/constants/httpStatus'
import fs from 'fs'
import mime from 'mime'
import { sendFileFromS3 } from '~/utils/s3'

export const uploadImageController = async (req: Request, res: Response) => {
  const url = await mediaServices.handleUploadImage(req)
  return res.json({
    message: USER_MESSAGES.UPLOAD_IMAGE_SUCCESS,
    data: url
  })
}

export const serveImageController = (req: Request, res: Response) => {
  const { name } = req.params
  return res.sendFile(path.resolve(UPLOAD_IMAGE_DIR, name + '.jpg'), (error) => {
    if (error) {
      return res.status((error as any).status).json({
        message: (error as any).message
      })
    }
  })
}

export const uploadVideoController = async (req: Request, res: Response) => {
  const url = await mediaServices.handleUploadVideo(req)
  return res.json({
    message: USER_MESSAGES.UPLOAD_VIDEO_SUCCESS,
    data: url
  })
}

export const uploadVideoHLSController = async (req: Request, res: Response) => {
  const url = await mediaServices.handleUploadVideoHLS(req)
  return res.json({
    message: USER_MESSAGES.UPLOAD_VIDEO_SUCCESS,
    data: url
  })
}

export const serveVideoStreamController = (req: Request, res: Response) => {
  const range = req.headers.range
  if (!range) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: 'Range is required' })
  }

  const { name } = req.params
  const videoPath = path.resolve(UPLOAD_VIDEO_DIR, name)
  const videoSize = fs.statSync(videoPath).size
  const chunkSize = 10 ** 6 // 1MB
  const start = Number(range.replace(/\D/g, ''))
  const end = Math.min(start + chunkSize, videoSize - 1)
  const contentLength = end - start + 1
  const contentType = mime.getType(videoPath)
  const headers = {
    'Content-Range': `bytes ${start}-${end}/${videoSize}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': contentLength,
    'Content-Type': contentType ?? 'video/*'
  }
  res.writeHead(HTTP_STATUS.PARTIAL_CONTENT, headers)
  const videoStream = fs.createReadStream(videoPath, { start, end })
  videoStream.pipe(res)
}

export const serveM3u8Controller = (req: Request, res: Response) => {
  const { id } = req.params
  sendFileFromS3(res, `videos-hls/${id}/master.m3u8`)
  // res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, 'master.m3u8'), (error) => {
  //   if (error) {
  //     return res.status((error as any).status).json({
  //       message: (error as any).message
  //     })
  //   }
  // })
}

export const serveSegmentController = (req: Request, res: Response) => {
  const { id, video, segment } = req.params
  sendFileFromS3(res, `videos-hls/${id}/${video}/${segment}`)
  // res.sendFile(path.resolve(UPLOAD_VIDEO_DIR, id, video, segment), (error) => {
  //   if (error) {
  //     return res.status((error as any).status).json({
  //       message: (error as any).message
  //     })
  //   }
  // })
}

export const getVideoStatusController = async (req: Request, res: Response) => {
  const { name } = req.params
  const videoStatus = await mediaServices.getVideoStatus(name)
  return res.json({
    message: USER_MESSAGES.GET_VIDEO_STATUS_SUCCESS,
    data: videoStatus
  })
}
