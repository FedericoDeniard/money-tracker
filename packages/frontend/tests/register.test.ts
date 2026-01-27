import { test, expect } from "bun:test";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

test("registro completo con confirmación de email", async () => {
    // Verificar que la API key esté configurada
    if (!process.env.XAI_API_KEY) {
        throw new Error("❌ XAI_API_KEY no está configurada.");
    }

    // Generar datos únicos para el usuario
    const timestamp = Date.now();
    const newUser = {
        email: `test${timestamp}@test.com`,
        password: "TestPassword123!",
    };

    const stagehand = new Stagehand({
        env: "LOCAL",
        verbose: 1,
        model: "xai/grok-4-1-fast-non-reasoning",
    });

    try {
        await stagehand.init();
        let page = stagehand.context.pages()[0];
        if (!page) {
            throw new Error("No se pudo obtener la página");
        }

        // 1. Ir a la página de registro
        await page.goto("http://localhost:3000/register");

        // 2. Registrarse con las credenciales
        await stagehand.act(`type '${newUser.email}' into the email input field`);
        await stagehand.act(`type '${newUser.password}' into the password input field`);
        await stagehand.act(`type '${newUser.password}' into the confirm password input field`);
        await stagehand.act("click the register or sign up button");

        // Esperar un momento para que se envíe el email
        await page.waitForTimeout(2000);

        // 3. Navegar al servidor de email (Inbucket)
        await page.goto("http://127.0.0.1:54324");

        // 4. Buscar el email del usuario registrado
        await stagehand.act(`click on the email sent to ${newUser.email}`);

        // 5. Extraer el código de confirmación del email
        const emailData = await stagehand.extract(
            "extract the confirmation code or verification link from the email",
            z.object({
                code: z.string().optional().describe("The confirmation code if present"),
                link: z.string().optional().describe("The confirmation link URL if present"),
            })
        );

        // Verificar que obtuvimos un código o link
        expect(emailData.code || emailData.link).toBeDefined();

        // 6. Hacer clic en el link de confirmación
        if (emailData.link) {
            // Obtener el número de páginas antes del clic
            const pagesBefore = stagehand.context.pages().length;

            await stagehand.act("click the confirmation link or verify button");

            // Esperar a que se abra la nueva pestaña
            await page.waitForTimeout(3000);

            // Obtener todas las páginas después del clic
            const pagesAfter = stagehand.context.pages();

            // Si se abrió una nueva pestaña, cambiar a ella
            if (pagesAfter.length > pagesBefore) {
                const newPage = pagesAfter[pagesAfter.length - 1];
                if (newPage) {
                    // Esperar a que la nueva página termine de cargar
                    await newPage.waitForLoadState('domcontentloaded');
                    // Usar la nueva página para las verificaciones posteriores
                    page = newPage;
                }
            } else {
                // Si no se abrió nueva pestaña, navegar al home después de confirmar
                await page.goto("http://localhost:3000");
            }
        } else if (emailData.code) {
            // Si hay un código en lugar de link, ir al login y usarlo
            await page.goto("http://localhost:3000/login");
            await stagehand.act(`type '${newUser.email}' into the email input field`);
            await stagehand.act(`type '${newUser.password}' into the password input field`);
            await stagehand.act("click the login button");
        }

        // Esperar a que se complete el proceso de autenticación
        if (page) {
            await page.waitForTimeout(3000);
        }

        // 7. Verificar que el usuario está logueado (debe estar en dashboard o home)
        const currentUrl = page?.url() || "";
        expect(currentUrl).not.toContain("/login");
        expect(currentUrl).not.toContain("/register");

        // Verificar que hay elementos de usuario logueado
        const loggedInData = await stagehand.extract(
            "check if user is logged in by looking for user menu, logout button, or dashboard elements",
            z.object({
                isLoggedIn: z.boolean().describe("Whether the user appears to be logged in"),
            })
        );

        expect(loggedInData.isLoggedIn).toBe(true);

    } finally {
        await stagehand.close();
    }
}, { timeout: 60000 }); // 60 segundos - flujo completo
