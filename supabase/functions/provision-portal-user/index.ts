import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProvisionRole = "teacher" | "accountant" | "parent";

type ProvisionRequest = {
  role: ProvisionRole;
  full_name: string;
  email: string;
  password: string;
  phone_number?: string | null;

  // Teacher/Accountant fields
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
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(
      { success: false, error: "server_configuration_error" },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ success: false, error: "unauthenticated" }, 401);
  }

  // Caller-scoped client: used ONLY to verify the requesting Admin.
  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Privileged server-only client: never expose this key to the browser.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json({ success: false, error: "unauthenticated" }, 401);
    }

    const { data: isAdmin, error: adminCheckError } =
      await callerClient.rpc("is_admin");

    if (adminCheckError || isAdmin !== true) {
      return json({ success: false, error: "admin_required" }, 403);
    }

    let payload: ProvisionRequest;

    try {
      payload = await req.json();
    } catch {
      return json({ success: false, error: "invalid_json" }, 400);
    }

    const role = payload.role;
    const fullName =
      typeof payload.full_name === "string" ? payload.full_name.trim() : "";
    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password =
      typeof payload.password === "string" ? payload.password : "";

    if (!["teacher", "accountant", "parent"].includes(role)) {
      return json({ success: false, error: "invalid_role" }, 400);
    }

    if (!fullName) {
      return json({ success: false, error: "full_name_required" }, 400);
    }

    if (!email || !email.includes("@")) {
      return json({ success: false, error: "valid_email_required" }, 400);
    }

    if (password.length < 8) {
      return json(
        { success: false, error: "password_must_be_at_least_8_characters" },
        400,
      );
    }

    if (
      (role === "teacher" || role === "accountant") &&
      payload.gender &&
      !["Male", "Female"].includes(payload.gender)
    ) {
      return json({ success: false, error: "invalid_gender" }, 400);
    }

    if (
      (role === "teacher" || role === "accountant") &&
      payload.status &&
      !["Active", "Inactive"].includes(payload.status)
    ) {
      return json({ success: false, error: "invalid_status" }, 400);
    }

    // Prevent cross-profile duplicate email before creating auth.users.
    const profileTable = role === "parent" ? "parents" : "teachers";
    const otherProfileTable = role === "parent" ? "teachers" : "parents";

    const [
      { data: sameProfile, error: sameProfileError },
      { data: otherProfile, error: otherProfileError },
    ] = await Promise.all([
      adminClient
        .from(profileTable)
        .select("id, auth_user_id")
        .eq("email", email)
        .maybeSingle(),
      adminClient
        .from(otherProfileTable)
        .select("id, auth_user_id")
        .eq("email", email)
        .maybeSingle(),
    ]);

    if (sameProfileError || otherProfileError) {
      console.error("Profile duplicate check failed", {
        sameProfileError,
        otherProfileError,
      });
      return json({ success: false, error: "profile_lookup_failed" }, 500);
    }

    if (sameProfile || otherProfile) {
      return json(
        { success: false, error: "email_already_used_by_portal_profile" },
        409,
      );
    }

    // Create the Supabase Auth account first.
    // email_confirm=true is intentional because Admin is provisioning the account.
    const { data: authData, error: createAuthError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createAuthError || !authData.user) {
      console.error("Auth creation failed", createAuthError);

      const message = createAuthError?.message?.toLowerCase() ?? "";
      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        return json(
          { success: false, error: "email_already_exists_in_auth" },
          409,
        );
      }

      return json(
        {
          success: false,
          error: "auth_user_creation_failed",
          detail: createAuthError?.message ?? null,
        },
        500,
      );
    }

    const authUserId = authData.user.id;

    // teachers/parents.password_hash is still NOT NULL during Stage 1.
    // Store a non-login placeholder instead of duplicating the real Auth password.
    // This intentionally prevents the newly provisioned account from authenticating
    // through the legacy custom password RPC.
    const legacyPasswordPlaceholder = `SUPABASE_AUTH_ONLY:${crypto.randomUUID()}`;

    let profileInsert:
      | Record<string, unknown>
      | null = null;

    if (role === "parent") {
      profileInsert = {
        full_name: fullName,
        email,
        phone_number: cleanOptional(payload.phone_number),
        address: cleanOptional(payload.address),
        password_hash: legacyPasswordPlaceholder,
        is_active: payload.is_active ?? true,
        must_change_password: false,
        auth_user_id: authUserId,
      };
    } else {
      profileInsert = {
        full_name: fullName,
        email,
        phone_number: cleanOptional(payload.phone_number),
        gender: payload.gender ?? null,
        date_of_birth: cleanOptional(payload.date_of_birth),
        status: payload.status ?? "Active",
        is_active: payload.is_active ?? true,
        role,
        password_hash: legacyPasswordPlaceholder,
        must_change_password: false,
        auth_user_id: authUserId,
      };
    }

    const { data: profile, error: profileError } = await adminClient
      .from(profileTable)
      .insert(profileInsert)
      .select("*")
      .single();

    if (profileError || !profile) {
      console.error("Profile creation failed; rolling back Auth user", profileError);

      const { error: rollbackError } =
        await adminClient.auth.admin.deleteUser(authUserId);

      if (rollbackError) {
        console.error(
          "CRITICAL: failed to rollback Auth user after profile insert failure",
          rollbackError,
        );
      }

      return json(
        {
          success: false,
          error: "profile_creation_failed",
          detail: profileError?.message ?? null,
          auth_rollback_succeeded: !rollbackError,
        },
        500,
      );
    }

    return json(
      {
        success: true,
        role,
        auth_user_id: authUserId,
        profile_id: profile.id,
        profile,
      },
      201,
    );
  } catch (error) {
    console.error("Unexpected provisioning error", error);

    return json(
      {
        success: false,
        error: "unexpected_server_error",
      },
      500,
    );
  }
});
