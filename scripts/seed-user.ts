/**
 * CLI: npx tsx scripts/seed-user.ts --username admin --password yourpassword
 */
import { config } from "dotenv";
import { createUser } from "@/lib/models/users";

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
    console.error("Usage: tsx scripts/seed-user.ts --username <name> --password <pw>");
    process.exit(1);
  }
  const user = await createUser(username, password);
  console.log(`Created user ${user.username} (${user._id.toString()})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
