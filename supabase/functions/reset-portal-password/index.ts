import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ResetRole = "teacher" | "accountant" | "parent";

type ResetRequest = {
  role: ResetRole;
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

function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) =>
    chars[crypto.getRandomValues(new Uint32Array(1))[0] % chars.length];

  const chars = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(symbols),
  ];

  for (let i = 0; i < 8; i += 1) {
    chars.push(pick(all));
  }

  // Fisher-Yates shuffle using crypto-backed randomness.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const random = crypto.getRandomValues(new Uint32Array(1))[0];
    const j = random % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
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
    return json({ success: false, error: "server_configuration_error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ success: false, error: "unauthenticated" }, 401);
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

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

    let payload: ResetRequest;

    try {
      payload = await req.json();
    } catch {
      return json({ success: false, error: "invalid_json" }, 400);
    }

    const role = payload.role;
    const profileId =
      typeof payload.profile_id === "string" ? payload.profile_id.trim() : "";

    if (!["teacher", "accountant", "parent"].includes(role)) {
      return json({ success: false, error: "invalid_role" }, 400);
    }

    if (!profileId) {
      return json({ success: false, error: "profile_id_required" }, 400);
    }

    const profileTable = role === "parent" ? "parents" : "teachers";

    let profileQuery = adminClient
      .from(profileTable)
      .select("id, full_name, email, auth_user_id, must_change_password")
      .eq("id", profileId);

    if (profileTable === "teachers") {
      profileQuery = profileQuery.eq("role", role);
    }

    const { data: profile, error: profileError } =
      await profileQuery.maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed", profileError);
      return json({ success: false, error: "profile_lookup_failed" }, 500);
    }

    if (!profile) {
      return json({ success: false, error: "profile_not_found" }, 404);
    }

    if (!profile.auth_user_id) {
      return json({ success: false, error: "profile_not_linked_to_auth" }, 409);
    }

    const temporaryPassword = generateTemporaryPassword();

    const { error: authUpdateError } =
      await adminClient.auth.admin.updateUserById(profile.auth_user_id, {
        password: temporaryPassword,
      });

    if (authUpdateError) {
      console.error("Auth password reset failed", authUpdateError);
      return json(
        {
          success: false,
          error: "auth_password_reset_failed",
          detail: authUpdateError.message,
        },
        500,
      );
    }

    const { error: profileUpdateError } = await adminClient
      .from(profileTable)
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (profileUpdateError) {
      console.error(
        "CRITICAL: Auth password changed but profile flag update failed",
        profileUpdateError,
      );

      return json(
        {
          success: false,
          error: "password_changed_but_force_change_flag_failed",
          detail: profileUpdateError.message,
        },
        500,
      );
    }

    return json({
      success: true,
      role,
      profile_id: profile.id,
      temporary_password: temporaryPassword,
      must_change_password: true,
    });
  } catch (error) {
    console.error("Unexpected reset error", error);

    return json(
      {
        success: false,
        error: "unexpected_server_error",
      },
      500,
    );
  }
});
