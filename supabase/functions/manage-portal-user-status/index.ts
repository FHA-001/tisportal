import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PortalRole = "teacher" | "accountant" | "parent";
type AccountAction = "deactivate" | "reactivate" | "delete";

type ManagePortalUserStatusRequest = {
  action: AccountAction;
  role: PortalRole;
  profile_id: string;
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

async function countRows(
  adminClient: any,
  table: string,
  column: string,
  value: string,
) {
  const { count, error } = await adminClient
    .from(table)
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(column, value);

  if (error) {
    throw new Error(
      `dependency_check_failed:${table}:${error.message}`,
    );
  }

  return count ?? 0;
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

    let payload: ManagePortalUserStatusRequest;

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

    const action = payload.action;
    const role = payload.role;

    const profileId =
      typeof payload.profile_id === "string"
        ? payload.profile_id.trim()
        : "";

    if (
      !["deactivate", "reactivate", "delete"].includes(action)
    ) {
      return json(
        {
          success: false,
          error: "invalid_action",
        },
        400,
      );
    }

    if (
      !["teacher", "accountant", "parent"].includes(role)
    ) {
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

    const profileTable =
      role === "parent"
        ? "parents"
        : "teachers";

    const {
      data: existingProfile,
      error: profileLookupError,
    } = await adminClient
      .from(profileTable)
      .select("*")
      .eq("id", profileId)
      .maybeSingle();

    if (profileLookupError) {
      console.error(
        "Profile lookup failed",
        profileLookupError,
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
      (role === "teacher" ||
        role === "accountant") &&
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

    const {
      data: authUserData,
      error: authLookupError,
    } =
      await adminClient.auth.admin.getUserById(
        authUserId,
      );

    if (
      authLookupError ||
      !authUserData.user
    ) {
      console.error(
        "Linked Auth user lookup failed",
        authLookupError,
      );

      return json(
        {
          success: false,
          error: "auth_user_lookup_failed",
        },
        500,
      );
    }

    /*
     * A7.3 — Protected permanent deletion
     */
    if (action === "delete") {
      if (existingProfile.is_active !== false) {
        return json({
          success: false,
          error: "deactivate_before_delete",
        });
      }

      const dependencies: Record<string, number> = {};

      try {
        if (
          role === "teacher" ||
          role === "accountant"
        ) {
          dependencies.class_subjects =
            await countRows(
              adminClient,
              "class_subjects",
              "teacher_id",
              profileId,
            );


          dependencies.homework =
            await countRows(
              adminClient,
              "homework",
              "teacher_id",
              profileId,
            );

          dependencies.payment_reviews =
            await countRows(
              adminClient,
              "payment_submissions",
              "reviewed_by",
              profileId,
            );
        } else {
          dependencies.student_links =
            await countRows(
              adminClient,
              "parent_students",
              "parent_id",
              profileId,
            );

          dependencies.payment_submissions =
            await countRows(
              adminClient,
              "payment_submissions",
              "parent_id",
              profileId,
            );
        }
      } catch (dependencyError) {
        console.error(
          "Permanent-delete dependency check failed",
          dependencyError,
        );

        return json(
          {
            success: false,
            error: "dependency_check_failed",
            detail:
              dependencyError instanceof Error
                ? dependencyError.message
                : null,
          },
          500,
        );
      }

      const blockingDependencies =
        Object.fromEntries(
          Object.entries(dependencies).filter(
            ([, count]) => count > 0,
          ),
        );

      if (
        Object.keys(blockingDependencies).length > 0
      ) {
        return json({
          success: false,
          error: "account_has_dependencies",
          dependencies: blockingDependencies,
        });
      }

      /*
       * Revoke any remaining compatibility sessions.
       */
      const {
        error: sessionRevokeError,
      } = await adminClient
        .from("custom_sessions")
        .update({
          revoked_at: new Date().toISOString(),
        })
        .eq("user_id", profileId)
        .eq("role", role)
        .is("revoked_at", null);

      if (sessionRevokeError) {
        console.error(
          "Session revocation before permanent delete failed",
          sessionRevokeError,
        );

        return json(
          {
            success: false,
            error: "session_revocation_failed",
            detail:
              sessionRevokeError.message ?? null,
          },
          500,
        );
      }

      /*
       * Delete the portal profile first.
       *
       * This is safe because the account must already be
       * deactivated, meaning the linked Auth user is banned.
       */
      const {
        error: profileDeleteError,
      } = await adminClient
        .from(profileTable)
        .delete()
        .eq("id", profileId);

      if (profileDeleteError) {
        console.error(
          "Permanent profile deletion failed",
          profileDeleteError,
        );

        return json(
          {
            success: false,
            error: "profile_delete_failed",
            detail:
              profileDeleteError.message ?? null,
          },
          500,
        );
      }

      /*
       * Now remove the linked Supabase Auth user.
       */
      const {
        error: authDeleteError,
      } =
        await adminClient.auth.admin.deleteUser(
          authUserId,
        );

      if (authDeleteError) {
        console.error(
          "CRITICAL: portal profile deleted but Auth cleanup failed",
          authDeleteError,
        );

        return json(
          {
            success: false,
            error: "auth_cleanup_required",
            detail:
              authDeleteError.message ?? null,
            profile_deleted: true,
            auth_user_deleted: false,
          },
          500,
        );
      }

      return json({
        success: true,
        action,
        role,
        profile_id: profileId,
        auth_user_id: authUserId,
        profile_deleted: true,
        auth_user_deleted: true,
      });
    }

    const previousIsActive =
      existingProfile.is_active === true;

    const previousStatus =
      role === "parent"
        ? null
        : String(
            existingProfile.status ||
              "Active",
          );

    /*
     * DEACTIVATE
     */
    if (action === "deactivate") {
      const {
        error: banError,
      } =
        await adminClient.auth.admin.updateUserById(
          authUserId,
          {
            ban_duration: "876000h",
          },
        );

      if (banError) {
        console.error(
          "Failed to ban Auth user",
          banError,
        );

        return json(
          {
            success: false,
            error: "auth_deactivation_failed",
            detail:
              banError.message ?? null,
          },
          500,
        );
      }

      const profileUpdate =
        role === "parent"
          ? {
              is_active: false,
              updated_at:
                new Date().toISOString(),
            }
          : {
              is_active: false,
              status: "Inactive",
              updated_at:
                new Date().toISOString(),
            };

      const {
        error: profileUpdateError,
      } = await adminClient
        .from(profileTable)
        .update(profileUpdate)
        .eq("id", profileId);

      if (profileUpdateError) {
        console.error(
          "Profile deactivation failed; rolling back Auth ban",
          profileUpdateError,
        );

        const {
          error: authRollbackError,
        } =
          await adminClient.auth.admin.updateUserById(
            authUserId,
            {
              ban_duration: "none",
            },
          );

        if (authRollbackError) {
          console.error(
            "CRITICAL: failed to unban Auth user after profile rollback",
            authRollbackError,
          );
        }

        return json(
          {
            success: false,
            error: "profile_deactivation_failed",
            detail:
              profileUpdateError.message ?? null,
            auth_rollback_succeeded:
              !authRollbackError,
          },
          500,
        );
      }

      /*
       * Revoke compatibility sessions immediately.
       */
      const {
        error: sessionRevokeError,
      } = await adminClient
        .from("custom_sessions")
        .update({
          revoked_at:
            new Date().toISOString(),
        })
        .eq("user_id", profileId)
        .eq("role", role)
        .is("revoked_at", null);

      if (sessionRevokeError) {
        console.error(
          "Compatibility session revocation failed; rolling back deactivation",
          sessionRevokeError,
        );

        const rollbackProfile =
          role === "parent"
            ? {
                is_active:
                  previousIsActive,
                updated_at:
                  new Date().toISOString(),
              }
            : {
                is_active:
                  previousIsActive,
                status:
                  previousStatus,
                updated_at:
                  new Date().toISOString(),
              };

        const [
          { error: profileRollbackError },
          { error: authRollbackError },
        ] = await Promise.all([
          adminClient
            .from(profileTable)
            .update(rollbackProfile)
            .eq("id", profileId),

          adminClient.auth.admin.updateUserById(
            authUserId,
            {
              ban_duration: "none",
            },
          ),
        ]);

        if (
          profileRollbackError ||
          authRollbackError
        ) {
          console.error(
            "CRITICAL: deactivation rollback was incomplete",
            {
              profileRollbackError,
              authRollbackError,
            },
          );
        }

        return json(
          {
            success: false,
            error: "session_revocation_failed",
            detail:
              sessionRevokeError.message ?? null,
            profile_rollback_succeeded:
              !profileRollbackError,
            auth_rollback_succeeded:
              !authRollbackError,
          },
          500,
        );
      }

      return json({
        success: true,
        action,
        role,
        profile_id: profileId,
        auth_user_id: authUserId,
        is_active: false,
      });
    }

    /*
     * REACTIVATE
     */
    const profileUpdate =
      role === "parent"
        ? {
            is_active: true,
            updated_at:
              new Date().toISOString(),
          }
        : {
            is_active: true,
            status: "Active",
            updated_at:
              new Date().toISOString(),
          };

    const {
      error: profileReactivateError,
    } = await adminClient
      .from(profileTable)
      .update(profileUpdate)
      .eq("id", profileId);

    if (profileReactivateError) {
      console.error(
        "Profile reactivation failed",
        profileReactivateError,
      );

      return json(
        {
          success: false,
          error: "profile_reactivation_failed",
          detail:
            profileReactivateError.message ?? null,
        },
        500,
      );
    }

    const {
      error: unbanError,
    } =
      await adminClient.auth.admin.updateUserById(
        authUserId,
        {
          ban_duration: "none",
        },
      );

    if (unbanError) {
      console.error(
        "Auth reactivation failed; rolling back profile",
        unbanError,
      );

      const rollbackProfile =
        role === "parent"
          ? {
              is_active:
                previousIsActive,
              updated_at:
                new Date().toISOString(),
            }
          : {
              is_active:
                previousIsActive,
              status:
                previousStatus,
              updated_at:
                new Date().toISOString(),
            };

      const {
        error: profileRollbackError,
      } = await adminClient
        .from(profileTable)
        .update(rollbackProfile)
        .eq("id", profileId);

      if (profileRollbackError) {
        console.error(
          "CRITICAL: failed to rollback profile after Auth reactivation failure",
          profileRollbackError,
        );
      }

      return json(
        {
          success: false,
          error: "auth_reactivation_failed",
          detail:
            unbanError.message ?? null,
          profile_rollback_succeeded:
            !profileRollbackError,
        },
        500,
      );
    }

    return json({
      success: true,
      action,
      role,
      profile_id: profileId,
      auth_user_id: authUserId,
      is_active: true,
    });
  } catch (error) {
    console.error(
      "Unexpected portal account status error",
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