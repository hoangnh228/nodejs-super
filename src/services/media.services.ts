import { Request } from 'express'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
import { getFiles, getNameFromFileName, handleUploadImage, handleUploadVideo } from '~/utils/file'
import dotenv from 'dotenv'
import { isProduction } from '~/constants/config'
import { EncodingStatus, MediaType } from '~/constants/enum'
import { Media } from '~/models/Other'
import { encodeHLSWithMultipleVideoStreams } from '~/utils/video'
import databaseService from './database.services'
import VideoStatus from '~/models/schemas/VideoStatus.schema'
import { uploadFileToS3 } from '~/utils/s3'
import mime from 'mime'
import fsPromise from 'fs/promises'
import { rimrafSync } from 'rimraf'
dotenv.config()

class Queue {
  items: string[]
  encoding: boolean

  constructor() {
    this.items = []
    this.encoding = false
  }

  async enqueue(item: string) {
    this.items.push(item)
    const idName = getNameFromFileName(item.split('/').pop() || '')
    await databaseService.videoStatuses.insertOne(
      new VideoStatus({
        name: idName,
        status: EncodingStatus.Pending
      })
    )
    this.processEncode()
  }

  async processEncode() {
    if (this.encoding) return
    if (this.items.length > 0) {
      this.encoding = true
      const videoPath = this.items[0]
      const idName = getNameFromFileName(videoPath.split('/').pop() || '')
      await databaseService.videoStatuses.updateOne(
        { name: idName },
        { $set: { status: EncodingStatus.Processing }, $currentDate: { updated_at: true } }
      )

      try {
        await encodeHLSWithMultipleVideoStreams(videoPath)
        this.items.shift()
        const files = getFiles(path.resolve(UPLOAD_VIDEO_DIR, idName))
        await Promise.all(
          files.map((filePath) => {
            const fileName = 'videos-hls' + filePath.replace(path.resolve(UPLOAD_VIDEO_DIR), '')
            return uploadFileToS3({
              fileName: fileName,
              filePath: filePath,
              contentType: mime.getType(filePath) as string
            })
          })
        )

        rimrafSync(path.resolve(UPLOAD_VIDEO_DIR, idName))

        await databaseService.videoStatuses.updateOne(
          { name: idName },
          { $set: { status: EncodingStatus.Completed }, $currentDate: { updated_at: true } }
        )
      } catch (error) {
        console.log(error)
        await databaseService.videoStatuses
          .updateOne({ name: idName }, { $set: { status: EncodingStatus.Failed }, $currentDate: { updated_at: true } })
          .catch((error) => {
            console.log(error)
          })
      } finally {
        this.encoding = false
      }
      this.processEncode()
    }
  }
}

const queue = new Queue()

class MediaServices {
  async handleUploadImage(req: Request): Promise<Media[]> {
    const files = await handleUploadImage(req)
    return Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFileName(file.newFilename)
        const newFileName = `${newName}.jpg`
        const newPath = path.resolve(UPLOAD_IMAGE_DIR, newFileName)
        await sharp(file.filepath).jpeg({ quality: 80 }).toFile(newPath)
        fs.unlinkSync(file.filepath)

        return {
          url: isProduction
            ? `${process.env.HOST}/static/image/${newFileName}`
            : `http://localhost:${process.env.PORT}/static/image/${newFileName}`,
          type: MediaType.Image
        }

        // const s3Url = await uploadFileToS3({
        //   fileName: 'images/' + newFileName,
        //   filePath: newPath,
        //   contentType: mime.getType(newPath) as string
        // })

        // await Promise.all([fsPromise.unlink(newPath), fsPromise.unlink(file.filepath)])

        // return {
        //   url: s3Url.Location as string,
        //   type: MediaType.Image
        // }
      })
    )
  }

  async handleUploadVideo(req: Request) {
    const files = await handleUploadVideo(req)
    // const result: Media[] = files.map((file) => {
    //   return {
    //     url: isProduction
    //       ? `${process.env.HOST}/static/video/${file.newFilename}`
    //       : `http://localhost:${process.env.PORT}/static/video/${file.newFilename}`,
    //     type: MediaType.Video
    //   }
    // })

    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const s3Url = await uploadFileToS3({
          fileName: 'videos/' + file.newFilename,
          filePath: file.filepath,
          contentType: mime.getType(file.filepath) as string
        })

        fsPromise.unlink(file.filepath)

        return {
          url: s3Url.Location as string,
          type: MediaType.Video
        }
      })
    )

    return result
  }

  async handleUploadVideoHLS(req: Request) {
    const files = await handleUploadVideo(req)
    const result: Media[] = await Promise.all(
      files.map(async (file) => {
        const newName = getNameFromFileName(file.newFilename)
        queue.enqueue(file.filepath)
        return {
          url: isProduction
            ? `${process.env.HOST}/static/video-hls/${newName}/master .m3u8`
            : `http://localhost:${process.env.PORT}/static/video-hls/${newName}/master.m3u8`,
          type: MediaType.HLS
        }
      })
    )
    return result
  }

  async getVideoStatus(name: string) {
    return await databaseService.videoStatuses.findOne({ name })
  }
}

export default new MediaServices()
