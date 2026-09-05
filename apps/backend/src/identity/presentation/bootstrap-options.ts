import { IdentityBootstrapError } from "../domain/identity.errors.js";

export function parseBootstrapOptions(arguments_: string[]): {
  mobile: string;
  keyId: string;
} {
  const options = arguments_.filter((argument) => argument !== "--");
  const allowed = ["--mobile=", "--key-id=", "--secret-stdin"];
  if (
    options.length !== 3 ||
    options.some(
      (option) => !allowed.some((prefix) => option.startsWith(prefix)),
    ) ||
    !options.includes("--secret-stdin")
  ) {
    throw invalidOptions();
  }
  return {
    mobile: requiredOption(options, "--mobile="),
    keyId: requiredOption(options, "--key-id="),
  };
}

function requiredOption(options: string[], prefix: string): string {
  const matches = options.filter((option) => option.startsWith(prefix));
  if (matches.length !== 1) throw invalidOptions();
  const value = matches[0]!.slice(prefix.length).trim();
  if (!value) throw invalidOptions();
  return value;
}

function invalidOptions(): IdentityBootstrapError {
  return new IdentityBootstrapError(
    "BOOTSTRAP_OPTIONS_INVALID",
    "Bootstrap options are invalid",
  );
}
