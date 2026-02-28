/**
 * Seed script: register the E2E test user via Better Auth's REST API.
 *
 * Run AFTER the dev server is started:
 *   node scripts/seed-test-user.mjs
 *
 * If the user already exists, the script handles the "User already exists" error gracefully.
 */

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
const EMAIL = process.env.E2E_TEST_EMAIL ?? 'test@moneymap.dev'
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestPass123!'

async function seedTestUser() {
  console.log(`Seeding test user: ${EMAIL} at ${BASE_URL}`)

  const response = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      name: 'Test User',
    }),
  })

  const data = await response.json()

  if (response.ok) {
    console.log('Test user created successfully.')
  } else if (data?.message?.toLowerCase().includes('already exists') || response.status === 422) {
    console.log('Test user already exists — skipping creation.')
  } else {
    console.error('Failed to create test user:', data)
    process.exit(1)
  }
}

seedTestUser()
