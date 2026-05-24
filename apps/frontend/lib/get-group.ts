export function getGroupId(): string {
  const id = process.env.NEXT_PUBLIC_GROUP_ID;
  if (!id) throw new Error("NEXT_PUBLIC_GROUP_ID env var not set");
  return id;
}
