/**
 * CLI: npx tsx scripts/reset-password.ts --username <name> --password <pw>
 * Updates the password hash for an existing user. Password is never logged.
 */
import { config } from "dotenv";
import { findUserByUsername, updatePasswordByUsername } from "@/lib/models/users";

config({ path: ".env.local" });

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        out[key] = value;
        i++;
      } else {
        out[key] = "true";
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const username = args.username;
  const password = args.password;
  if (!username || !password) {
    console.error("Usage: tsx scripts/reset-password.ts --username <name> --password <pw>");
    process.exit(1);
  }
  const user = await findUserByUsername(username);
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exit(1);
  }
  const ok = await updatePasswordByUsername(username, password);
  if (!ok) {
    console.error("Password update failed.");
    process.exit(1);
  }
  console.log(`Password updated for user ${username}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
