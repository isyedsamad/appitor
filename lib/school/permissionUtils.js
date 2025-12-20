export function hasPermission(user, required, isForAll) {
  if(isForAll) return true;
  if (!required) return true;
  if (user.permissions?.includes("*")) return true;
  if (Array.isArray(required)) {
    return required.some((p) => user.permissions?.includes(p));
  }
  return user.permissions?.includes(required);
}
