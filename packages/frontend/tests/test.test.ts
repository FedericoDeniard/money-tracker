import { test, expect } from '@playwright/test'
import { ai } from '@zerostep/playwright'

test('Test login error', async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    const user = {
        email: 'test@test.com',
        password: 'test1234'
    }

    // An object with page and test must be passed into every call
    const aiArgs = { page, test }
    await ai(`Type the email ${user.email}`, aiArgs)
    await ai(`Type the password ${user.password}`, aiArgs)
    await ai('Click the sign in button', aiArgs)

    // Verificaciones explícitas: debe permanecer en login y mostrar error
    await expect(page).toHaveURL(/\/(login)/, { timeout: 10000 })
    await expect(page.locator('body')).toContainText(/error/i, { timeout: 5000 })
})