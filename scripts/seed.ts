import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import bcrypt from 'bcryptjs'
import * as schema from '../lib/schema'

const sqlite = new Database('data/clothpur.db')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

const SEED_USERS = [
  {
    email: 'admin@test.com',
    password: 'password1234',
    name: '관리자',
    role: 'admin',
    rank: null,
    unit: '군수사령부',
  },
  {
    email: 'store@test.com',
    password: 'password1234',
    name: '판매소담당자',
    role: 'store',
    rank: null,
    unit: null,
  },
  {
    email: 'tailor@test.com',
    password: 'password1234',
    name: '체척업체담당자',
    role: 'tailor',
    rank: null,
    unit: null,
  },
  {
    email: 'user@test.com',
    password: 'password1234',
    name: '홍길동',
    role: 'user',
    rank: '상병',
    unit: '제1보병사단',
  },
] as const

async function seed() {
  console.log('시드 데이터 삽입 시작...')

  for (const user of SEED_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 10)

    db.insert(schema.users)
      .values({
        email: user.email,
        passwordHash,
        name: user.name,
        role: user.role,
        rank: user.rank,
        unit: user.unit,
      })
      .onConflictDoNothing()
      .run()

    console.log(`  [OK] ${user.email} (${user.role})`)
  }

  console.log('시드 데이터 삽입 완료!')
  sqlite.close()
}

seed().catch((err) => {
  console.error('시드 실패:', err)
  process.exit(1)
})
