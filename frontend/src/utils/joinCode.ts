// Spec.md "Campaign Rail — Card Variants and Role Logic": the "Join a table" input
// MUST uppercase all typed characters and insert a hyphen immediately after the
// 4th character while typing (placeholder format A3F9-B72C).
export function formatJoinCodeInput(raw: string): string {
  const alphanumeric = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)

  if (alphanumeric.length <= 4) {
    return alphanumeric
  }

  return `${alphanumeric.slice(0, 4)}-${alphanumeric.slice(4)}`
}
