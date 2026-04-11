import { checkSubscriptionByScope } from "@factory/database";

export interface AuthContext {
  userId: string;
}

export function useAuth(context: AuthContext) {
  async function checkAccess(appId: string, categoryId?: string) {
    const hasGlobal = await checkSubscriptionByScope({
      userId: context.userId,
      scopeType: "global"
    });

    if (hasGlobal) {
      return true;
    }

    if (categoryId) {
      const hasCategory = await checkSubscriptionByScope({
        userId: context.userId,
        scopeType: "category",
        scopeId: categoryId
      });

      if (hasCategory) {
        return true;
      }
    }

    const hasApp = await checkSubscriptionByScope({
      userId: context.userId,
      scopeType: "app",
      scopeId: appId
    });

    return hasApp;
  }

  return {
    user: { id: context.userId },
    checkAccess
  };
}
