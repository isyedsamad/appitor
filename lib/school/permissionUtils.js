import { hasPlanAccess } from "./planPermissions";

export function hasPermission(user, required, isForAll = false, currentPlan) {
  if (!required) return true;

  const planToCheck = currentPlan || user?.plan;
  if (planToCheck && !hasPlanAccess(planToCheck, required)) {
    return false;
  }

  if (isForAll) return true;
  if (user?.permissions?.includes("*")) return true;

  const userPerms = user?.permissions || [];

  const check = (p) => {
    if (userPerms.includes(p)) return true;

    // Handle implicit manage -> view grant
    if (p.endsWith(".view")) {
      const manageVariant = p.replace(".view", ".manage");
      if (userPerms.includes(manageVariant)) return true;
    }

    // Check for wildcards at any level (e.g. student.*, communication.*)
    let parts = p.split(".");
    while (parts.length > 0) {
      const prefix = parts.join(".");
      if (userPerms.includes(`${prefix}.*`)) return true;
      parts.pop();
    }

    return false;
  };

  if (Array.isArray(required)) {
    return required.some(check);
  }
  return check(required);
}

export function canManage(user, featurePermission, currentPlan) {
  if (!featurePermission) return true;
  const managePermission = featurePermission.endsWith(".manage")
    ? featurePermission
    : featurePermission.endsWith(".view")
      ? featurePermission.replace(".view", ".manage")
      : `${featurePermission}.manage`;

  return hasPermission(user, managePermission, false, currentPlan);
}
