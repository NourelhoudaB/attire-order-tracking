/** The same environment values must already be configured for the target deployment. */
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_INITIAL_PASSWORD;
const base = process.env.APP_URL ?? process.env.URL;
if (!username || !password || !base)
  throw new Error(
    "ADMIN_USERNAME, ADMIN_INITIAL_PASSWORD et APP_URL sont requis.",
  );
const origin = new URL(base).origin;
if (!origin.startsWith("https://") && !origin.startsWith("http://localhost"))
  throw new Error("Une URL HTTPS est requise.");
const response = await fetch(`${origin}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Tenue-Pro": "1",
    Origin: origin,
  },
  body: JSON.stringify({ username, password }),
});
if (!response.ok)
  throw new Error(
    "Initialisation impossible. Vérifiez la configuration et la disponibilité du service.",
  );
console.log(
  "Compte administrateur initialisé. Changement du mot de passe obligatoire à la première connexion.",
);
export {};
