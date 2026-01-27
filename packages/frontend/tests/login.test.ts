import { test, expect } from "bun:test";
import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

test("login con credenciales inválidas debe mostrar error", async () => {
    // Verificar que la API key esté configurada (Bun carga automáticamente desde .env)
    if (!process.env.XAI_API_KEY) {
        throw new Error(
            "❌ XAI_API_KEY no está configurada."
        );
    }

    // Configurar Stagehand para usar Grok (xAI)
    const stagehand = new Stagehand({
        env: "LOCAL",
        verbose: 1,
        model: "xai/grok-4-1-fast-non-reasoning",
    });

    try {
        // Inicializar Stagehand
        await stagehand.init();

        // Obtener la página
        const page = stagehand.context.pages()[0];
        if (!page) {
            throw new Error("No se pudo obtener la página");
        }

        const fakeUser = {
            email: "test@test.com",
            password: "password1234"
        }

        // Navegar a la página de login
        await page.goto("http://localhost:3000/login");

        // Act - Ingresar credenciales falsas y hacer login
        await stagehand.act(`type '${fakeUser.email}' into the email input field`);
        await stagehand.act(`type '${fakeUser.password}' into the password input field`);
        await stagehand.act("click the login button");

        // Extract - Extraer el mensaje de error
        const errorData = await stagehand.extract(
            "extract any error message displayed on the page",
            z.object({
                hasError: z.boolean().describe("Whether there is an error message visible"),
                errorMessage: z.string().optional().describe("The error message text if visible"),
            })
        );

        // Assertions - Verificar que hay un error
        expect(errorData.hasError).toBe(true);
        expect(errorData.errorMessage).toBeDefined();
        expect(errorData.errorMessage).not.toBe("");

    } finally {
        // Cerrar Stagehand
        await stagehand.close();
    }
}, { timeout: 30000 }); // 30 segundos de timeout
