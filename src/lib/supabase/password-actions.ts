"use server";

import { resetPasswordAction } from "@/lib/auth/supabase/basic-auth/actions";
import type { AuthResult } from "@/lib/auth/supabase/basic-auth/types";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Sets a new password for the signed-in user (first-login change AND
 * forgot-password flow) and then flags the profile as password_changed.
 * This is the ONLY place that calls mark_password_changed().
 */
export async function changePasswordAction(input: {
  newPassword: string;
}): Promise<AuthResult<null>> {
  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      data: null,
      error: { code: "weak_password", message: "Password is too short." },
    };
  }

  const result = await resetPasswordAction({ newPassword: input.newPassword });
  if (result.error) return result;

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_password_changed");
  if (error) {
    return {
      data: null,
      error: { code: "unknown", message: "Could not finish the update." },
    };
  }

  return result;
}
