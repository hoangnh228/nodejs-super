import { Request, Response } from 'express'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR, UPLOAD_VIDEO_TEMP_DIR } from '~/constants/dir'

export const initFolder = () => {
  ;[UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })
}

export const handleUploadImage = (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_IMAGE_TEMP_DIR,
    maxFiles: 5,
    keepExtensions: true,
    maxFileSize: 3000 * 1024, // 3MB
    maxTotalFileSize: 3000 * 1024 * 5, // 15MB
    filter: ({ name, originalFilename, mimetype }) => {
      const isValid = name === 'image' && (mimetype?.startsWith('image/') ?? false)
      if (!isValid) {
        form.emit('error' as any, new Error('File type is not supported') as any)
        return false
      }
      return isValid
    }
  })

  return new Promise<formidable.File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!Boolean(files.image)) {
        return reject(new Error('File is required'))
      }

      resolve(files.image as formidable.File[])
    })
  })
}

export const getNameFromFileName = (fileName: string) => {
  const nameArr = fileName.split('.')
  nameArr.pop()
  return nameArr.join('.')
}

export const handleUploadVideo = (req: Request) => {
  const form = formidable({
    uploadDir: UPLOAD_VIDEO_DIR,
    maxFiles: 1,
    keepExtensions: true,
    maxFileSize: 50000 * 1024, // 50MB
    filter: ({ name, originalFilename, mimetype }) => {
      const isValid = name === 'video' && (mimetype?.includes('mp4') || mimetype?.includes('quicktime'))
      if (!isValid) {
        form.emit('error' as any, new Error('File type is not supported') as any)
        return false
      }
      return isValid
    }
  })

  return new Promise<formidable.File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        return reject(err)
      }

      if (!Boolean(files.video)) {
        return reject(new Error('File is required'))
      }
      const videos = files.video as formidable.File[]
      videos.forEach((video) => {
        const extension = getExtensionFromFileName(video.originalFilename ?? '')
        fs.renameSync(video.filepath, video.filepath + '.' + extension)
        video.newFilename = video.newFilename + '.' + extension
      })

      resolve(files.video as formidable.File[])
    })
  })
}

export const getExtensionFromFileName = (fileName: string) => {
  const nameArr = fileName.split('.')
  return nameArr[nameArr.length - 1]
}
