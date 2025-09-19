import argv from 'minimist'

const options = argv(process.argv.slice(2))

export const isProduction = options.mode === 'production'
export const isDevelop = options.mode === 'develop'
