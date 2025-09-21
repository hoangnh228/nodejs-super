import { faker } from '@faker-js/faker'
import { ObjectId } from 'mongodb'
import { TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enum'
import { CreateTweetRequestBody } from '~/models/requests/Tweet.requests'
import { RegisterRequestBody } from '~/models/requests/User.requests'
import Follower from '~/models/schemas/Follower.schema'
import User from '~/models/schemas/User.schema'
import databaseServices from '~/services/database.services'
import tweetServices from '~/services/tweet.services'
import { hashPassword } from '~/utils/crypto'

const PASSWORD = 'Demo123!'
const MY_ID = new ObjectId('68cb64002c2045650ab54191')
const USER_COUNT = 100

const createUser = () => {
  const user: RegisterRequestBody = {
    name: faker.person.fullName(),
    email: faker.internet.email(),
    password: PASSWORD,
    confirm_password: PASSWORD,
    date_of_birth: faker.date.birthdate().toISOString()
  }
  return user
}

const createTweet = () => {
  const tweet: CreateTweetRequestBody = {
    content: faker.lorem.paragraph({ min: 10, max: 150 }),
    audience: TweetAudience.Everyone,
    type: TweetType.Tweet,
    parent_id: null,
    hashtags: faker.lorem.words(3).split(' '),
    mentions: [],
    medias: []
  }
  return tweet
}

const users: RegisterRequestBody[] = faker.helpers.multiple(createUser, { count: USER_COUNT })

const insertMultipleUsers = async (users: RegisterRequestBody[]) => {
  console.log('Inserting users...')
  const result = await Promise.all(
    users.map(async (user) => {
      const user_id = new ObjectId()
      await databaseServices.users.insertOne(
        new User({
          ...user,
          username: `user_${user_id.toString()}`,
          password: hashPassword(user.password),
          date_of_birth: new Date(user.date_of_birth),
          verify: UserVerifyStatus.Verified
        })
      )
      return user_id
    })
  )
  console.log('Users inserted successfully', result.length)
  return result
}

const followMultipleUsers = async (user_id: ObjectId, followed_user_ids: ObjectId[]) => {
  console.log('Following users...')
  const result = await Promise.all(
    followed_user_ids.map(async (followed_user_id) => {
      await databaseServices.followers.insertOne(
        new Follower({ user_id, followed_user_id: new ObjectId(followed_user_id) })
      )
    })
  )
  console.log('Users followed successfully', result.length)
  return result
}

const insertMultipleTweets = async (ids: ObjectId[]) => {
  console.log('Inserting tweets...')
  console.log('Counting...')
  let count = 0
  const result = await Promise.all(
    ids.map(async (id, index) => {
      await Promise.all([
        tweetServices.createTweet(createTweet(), id.toString()),
        tweetServices.createTweet(createTweet(), id.toString())
      ])
      count += 2
      console.log(`Inserted ${count} tweets`)
    })
  )
  console.log('Tweets inserted successfully', count)
  return result
}

insertMultipleUsers(users).then((ids) => {
  followMultipleUsers(new ObjectId(MY_ID), ids)
  insertMultipleTweets(ids)
})
