import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PortalRole = "teacher" | "accountant" | "parent";

type UpdatePortalUserRequest = {
  role: PortalRole;
  profile_id: string;
  full_name: string;
  email: string;
  phone_number?: string | null;

  // Teacher / Accountant fields
  gender?: "Male" | "Female" | null;
  date_of_birth?: string | null;
  status?: "Active" | "Inactive";
  is_active?: boolean;

  // Parent field
  address?: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function cleanOptional(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json(
      {
        success: false,
        error: "method_not_allowed",
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(
      {
        success: false,
        error: "server_configuration_error",
      },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return json(
      {
        success: false,
        error: "unauthenticated",
      },
      401,
    );
  }

  // Caller-scoped client: only used to authenticate and authorize the Admin.
  const callerClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  // Privileged server-only client. Never expose the service-role key to the browser.
  const adminClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  try {
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json(
        {
          success: false,
          error: "unauthenticated",
        },
        401,
      );
    }

    const {
      data: isAdmin,
      error: adminCheckError,
    } = await callerClient.rpc("is_admin");

    if (adminCheckError || isAdmin !== true) {
      return json(
        {
          success: false,
          error: "admin_required",
        },
        403,
      );
    }

    let payload: UpdatePortalUserRequest;

    try {
      payload = await req.json();
    } catch {
      return json(
        {
          success: false,
          error: "invalid_json",
        },
        400,
      );
    }

    const role = payload.role;

    const profileId =
      typeof payload.profile_id === "string"
        ? payload.profile_id.trim()
        : "";

    const fullName =
      typeof payload.full_name === "string"
        ? payload.full_name.trim()
        : "";

    const email =
      typeof payload.email === "string"
        ? payload.email.trim().toLowerCase()
        : "";

    if (!["teacher", "accountant", "parent"].includes(role)) {
      return json(
        {
          success: false,
          error: "invalid_role",
        },
        400,
      );
    }

    if (!profileId) {
      return json(
        {
          success: false,
          error: "profile_id_required",
        },
        400,
      );
    }

    if (!fullName) {
      return json(
        {
          success: false,
          error: "full_name_required",
        },
        400,
      );
    }

    if (!email || !email.includes("@")) {
      return json(
        {
          success: false,
          error: "valid_email_required",
        },
        400,
      );
    }

    if (
      (role === "teacher" || role === "accountant") &&
      payload.gender &&
      !["Male", "Female"].includes(payload.gender)
    ) {
      return json(
        {
          success: false,
          error: "invalid_gender",
        },
        400,
      );
    }

    if (
      (role === "teacher" || role === "accountant") &&
      payload.status &&
      !["Active", "Inactive"].includes(payload.status)
    ) {
      return json(
        {
          success: false,
          error: "invalid_status",
        },
        400,
      );
    }

    const profileTable =
      role === "parent"
        ? "parents"
        : "teachers";

    const otherProfileTable =
      role === "parent"
        ? "teachers"
        : "parents";

    // Load the current portal profile before any email logic.
    const {
      data: existingProfile,
      error: existingProfileError,
    } = await adminClient
      .from(profileTable)
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (existingProfileError) {
      console.error(
        "Profile lookup failed",
        existingProfileError,
      );

      return json(
        {
          success: false,
          error: "profile_lookup_failed",
        },
        500,
      );
    }

    if (!existingProfile) {
      return json(
        {
          success: false,
          error: "profile_not_found",
        },
        404,
      );
    }

    if (
      (role === "teacher" || role === "accountant") &&
      existingProfile.role !== role
    ) {
      return json(
        {
          success: false,
          error: "role_mismatch",
        },
        409,
      );
    }

    const authUserId =
      existingProfile.auth_user_id as string | null;

    if (!authUserId) {
      return json(
        {
          success: false,
          error: "profile_not_linked_to_auth",
        },
        409,
      );
    }

    // Must be defined before any email-change logic.
    const oldEmail =
      String(existingProfile.email || "")
        .trim()
        .toLowerCase();

    // Prevent duplicate email across portal profile tables.
    const [
      {
        data: sameTableMatch,
        error: sameTableError,
      },
      {
        data: otherTableMatch,
        error: otherTableError,
      },
    ] = await Promise.all([
      adminClient
        .from(profileTable)
        .select("id")
        .eq("email", email)
        .neq("id", profileId)
        .maybeSingle(),

      adminClient
        .from(otherProfileTable)
        .select("id")
        .eq("email", email)
        .maybeSingle(),
    ]);

    if (sameTableError || otherTableError) {
      console.error(
        "Portal duplicate email check failed",
        {
          sameTableError,
          otherTableError,
        },
      );

      return json(
        {
          success: false,
          error: "profile_duplicate_check_failed",
        },
        500,
      );
    }

    // Expected validation result: return 200 so the frontend receives the JSON body.
    if (sameTableMatch || otherTableMatch) {
      return json({
        success: false,
        error: "email_already_used_by_portal_profile",
      });
    }

    /*
     * If the email is changing:
     * 1. Verify the linked Auth user.
     * 2. Verify Auth/profile are currently synchronized.
     * 3. Check whether another Auth user already owns the requested email.
     * 4. Update Auth first.
     */
    if (email !== oldEmail) {
      const {
        data: authUserBefore,
        error: authUserLookupError,
      } = await adminClient.auth.admin.getUserById(
        authUserId,
      );

      if (
        authUserLookupError ||
        !authUserBefore.user
      ) {
        console.error(
          "Auth user lookup failed",
          authUserLookupError,
        );

        return json(
          {
            success: false,
            error: "auth_user_lookup_failed",
          },
          500,
        );
      }

      const currentAuthEmail =
        authUserBefore.user.email
          ?.trim()
          .toLowerCase() || "";

      if (
        currentAuthEmail &&
        currentAuthEmail !== oldEmail
      ) {
        return json({
          success: false,
          error: "auth_profile_email_mismatch",
          auth_email: currentAuthEmail,
          profile_email: oldEmail,
        });
      }

      /*
       * Supabase Auth currently surfaces a duplicate email update as a generic
       * 500 in this project. Pre-check Auth users so we can show a clean message.
       */
      let page = 1;
      const perPage = 1000;
      let duplicateAuthEmail = false;

      while (true) {
        const {
          data: usersPage,
          error: usersPageError,
        } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });

        if (usersPageError) {
          console.error(
            "Auth duplicate email check failed",
            usersPageError,
          );

          return json(
            {
              success: false,
              error: "auth_email_duplicate_check_failed",
            },
            500,
          );
        }

        const users = usersPage?.users ?? [];

        duplicateAuthEmail = users.some(
          (user) =>
            user.id !== authUserId &&
            user.email
              ?.trim()
              .toLowerCase() === email,
        );

        if (duplicateAuthEmail) {
          break;
        }

        if (users.length < perPage) {
          break;
        }

        page += 1;
      }

      // Expected validation result: return 200 so the frontend receives the JSON body.
      if (duplicateAuthEmail) {
        return json({
          success: false,
          error: "email_already_exists_in_auth",
        });
      }

      const {
        error: authEmailUpdateError,
      } = await adminClient.auth.admin.updateUserById(
        authUserId,
        {
          email,
          email_confirm: true,
        },
      );

      if (authEmailUpdateError) {
        console.error(
          "Auth email update failed",
          authEmailUpdateError,
        );

        return json(
          {
            success: false,
            error: "auth_email_update_failed",
            detail:
              authEmailUpdateError.message ?? null,
          },
          500,
        );
      }
    }

    let profileUpdate: Record<string, unknown>;

    if (role === "parent") {
      profileUpdate = {
        full_name: fullName,
        email,
        phone_number:
          cleanOptional(payload.phone_number),
        address:
          cleanOptional(payload.address),
        is_active:
          payload.is_active ??
          existingProfile.is_active ??
          true,
        updated_at:
          new Date().toISOString(),
      };
    } else {
      profileUpdate = {
        full_name: fullName,
        email,
        phone_number:
          cleanOptional(payload.phone_number),
        gender:
          payload.gender ??
          existingProfile.gender ??
          null,
        date_of_birth:
          cleanOptional(payload.date_of_birth),
        status:
          payload.status ??
          existingProfile.status ??
          "Active",
        is_active:
          payload.is_active ??
          existingProfile.is_active ??
          true,
        updated_at:
          new Date().toISOString(),
      };
    }

    const {
      data: updatedProfile,
      error: profileUpdateError,
    } = await adminClient
      .from(profileTable)
      .update(profileUpdate)
      .eq("id", profileId)
      .select("*")
      .single();

    /*
     * If the profile update fails after Auth email changed,
     * try to restore the original Auth email.
     */
    if (
      profileUpdateError ||
      !updatedProfile
    ) {
      console.error(
        "Profile update failed",
        profileUpdateError,
      );

      let authRollbackSucceeded:
        boolean | null = null;

      if (email !== oldEmail) {
        const {
          error: rollbackError,
        } = await adminClient.auth.admin.updateUserById(
          authUserId,
          {
            email: oldEmail,
            email_confirm: true,
          },
        );

        authRollbackSucceeded =
          !rollbackError;

        if (rollbackError) {
          console.error(
            "CRITICAL: failed to rollback Auth email after profile update failure",
            rollbackError,
          );
        }
      }

      return json(
        {
          success: false,
          error: "profile_update_failed",
          detail:
            profileUpdateError?.message ??
            null,
          auth_rollback_succeeded:
            authRollbackSucceeded,
        },
        500,
      );
    }

    return json({
      success: true,
      role,
      profile_id: profileId,
      auth_user_id: authUserId,
      email_changed:
        email !== oldEmail,
      profile: updatedProfile,
    });
  } catch (error) {
    console.error(
      "Unexpected portal user update error",
      error,
    );

    return json(
      {
        success: false,
        error: "unexpected_server_error",
      },
      500,
    );
  }
});
