import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  rules: {
    // TypeScript rules
    // no-explicit-any: left off — there are 337 `any` types across the
    // project. Re-enabling would require a large migration; track it
    // as a separate cleanup task. The financial files (lib/sale/*,
    // lib/journal.ts) have already been cleaned in PHASE2.
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off", // TODO: re-enable with _ prefix convention
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",

    // React rules
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/purity": "off",
    // TEMPORARY: disabled because the project uses useEffect for modal/form
    // initialization patterns that trigger this rule. Will be refactored
    // to use useSyncExternalStore or derived state in a future pass.
    "react-hooks/set-state-in-effect": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General JavaScript rules — RE-ENABLED in PHASE4 (safe rules):
    "prefer-const": "warn",           // re-enabled: catches accidental let that's never reassigned
    "no-unused-vars": "off",          // covered by @typescript-eslint/no-unused-vars
    "no-console": "warn",             // re-enabled as warn: console.log left in prod is noise; warn/error ok
    "no-debugger": "error",           // re-enabled: debugger statements should never ship
    "no-empty": "warn",               // re-enabled as warn: empty catch blocks should be commented
    "no-irregular-whitespace": "error", // re-enabled: catches invisible unicode whitespace bugs
    "no-case-declarations": "error",  // re-enabled: lexical declarations in switch without braces is a real bug
    "no-fallthrough": "error",        // re-enabled: unintended switch fallthrough is a real bug
    "no-mixed-spaces-and-tabs": "error", // re-enabled: mixing is always wrong
    "no-redeclare": "error",          // re-enabled: redeclaring a var in the same scope is a bug
    "no-undef": "off",                // left off — TS already catches undefined vars
    "no-unreachable": "error",       // re-enabled: code after return/throw is dead
    "no-useless-escape": "warn",      // re-enabled as warn: \: in regexes etc. is unnecessary
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills", "tests/**", "vitest.config.ts", "tests/globalSetup.ts", "check-users.ts", "reset-admin.ts", "reset-all.ts", "verify-prod.ts", "test-auth-prod.ts", "scripts/**"]
}];

export default eslintConfig;
