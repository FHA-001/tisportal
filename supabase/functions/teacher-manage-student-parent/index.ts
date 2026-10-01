import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SALT = "TIS_SALT_2024";
const ALLOWED_RELATIONSHIPS = new Set(["Parent", "Father", "Mother", "Guardian"]);

type Action = "link_existing" | "create_or_reuse";

type RequestBody = {
  action: Action;
  student_id: string;
  email: string;
  full_name?: string;
  password?: string;
  phone_number?: string;
  relationship?: string;
  is_primary?: boolean;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function hashLegacyPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password + SALT);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function findParentByEmail(adminClient: any, email: string) {
  const { data, error } = await adminClient
    .from("parents")
    .select("id, full_name, email, phone_number, is_active, auth_user_id")
    .ilike("email", email)
    .limit(2);

  if (error) throw new Error(`parent_lookup_failed:${error.message}`);
  if ((data?.length ?? 0) > 1) throw new Error("duplicate_parent_profiles_for_email");
  return data?.[0] ?? null;
}

async function authEmailExists(adminClient: any, email: string) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth_email_check_failed:${error.message}`);

    const users = data?.users ?? [];
    if (users.some((user: any) => (user.email || "").trim().toLowerCase() === email)) {
      return true;
    }

    if (users.length < perPage) return false;
    page += 1;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json({ success: false, error: "server_configuration_error" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ success: false, error: "unauthenticated" }, 401);

  const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) return json({ success: false, error: "unauthenticated" }, 401);

    const { data: teacher, error: teacherError } = await adminClient
      .from("teachers")
      .select("id, role, is_active, status")
      .eq("auth_user_id", caller.id)
      .eq("role", "teacher")
      .maybeSingle();

    if (teacherError) return json({ success: false, error: "teacher_lookup_failed" }, 500);
    if (!teacher || teacher.is_active === false || teacher.status === "Inactive") {
      return json({ success: false, error: "teacher_not_authorized" }, 403);
    }

    let payload: RequestBody;
    try {
      payload = await req.json();
    } catch {
      return json({ success: false, error: "invalid_json" }, 400);
    }

    const action = payload.action;
    const studentId = clean(payload.student_id);
    const email = clean(payload.email).toLowerCase();
    const fullName = clean(payload.full_name);
    const password = clean(payload.password);
    const phoneNumber = clean(payload.phone_number);
    const relationship = clean(payload.relationship) || "Parent";
    const isPrimary = payload.is_primary !== false;

    if (!["link_existing", "create_or_reuse"].includes(action)) {
      return json({ success: false, error: "invalid_action" }, 400);
    }
    if (!studentId) return json({ success: false, error: "student_id_required" }, 400);
    if (!email) return json({ success: false, error: "parent_email_required" }, 400);
    if (!ALLOWED_RELATIONSHIPS.has(relationship)) {
      return json({ success: false, error: "invalid_relationship" }, 400);
    }

    const { data: student, error: studentError } = await adminClient
      .from("students")
      .select("id, class_id")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) return json({ success: false, error: "student_lookup_failed" }, 500);
    if (!student?.class_id) return json({ success: false, error: "student_not_found_or_unassigned" }, 404);

    const { data: assignment, error: assignmentError } = await adminClient
      .from("class_subjects")
      .select("id")
      .eq("teacher_id", teacher.id)
      .eq("class_id", student.class_id)
      .limit(1)
      .maybeSingle();

    if (assignmentError) return json({ success: false, error: "assignment_lookup_failed" }, 500);
    if (!assignment) return json({ success: false, error: "student_not_in_teacher_class" }, 403);

    let parent = await findParentByEmail(adminClient, email);
    let newlyCreatedParent = false;
    let newlyCreatedAuthUserId: string | null = null;

    if (action === "link_existing" && !parent) {
      return json({ success: false, error: "parent_not_found" });
    }

    if (action === "create_or_reuse" && !parent) {
      if (!fullName) return json({ success: false, error: "parent_name_required" }, 400);
      if (password.length < 8) return json({ success: false, error: "parent_password_too_short" }, 400);

      const { data: staffMatches, error: staffError } = await adminClient
        .from("teachers")
        .select("id")
        .ilike("email", email)
        .limit(1);

      if (staffError) return json({ success: false, error: "staff_email_lookup_failed" }, 500);
      if ((staffMatches?.length ?? 0) > 0) {
        return json({ success: false, error: "email_used_by_staff_account" });
      }

      if (await authEmailExists(adminClient, email)) {
        return json({ success: false, error: "email_exists_in_auth_without_parent_profile" });
      }

      const passwordHash = await hashLegacyPassword(password);

      const { data: createdAuth, error: authCreateError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: "parent" },
      });

      if (authCreateError || !createdAuth.user) {
        return json({
          success: false,
          error: "parent_auth_creation_failed",
          detail: authCreateError?.message ?? null,
        }, 500);
      }

      newlyCreatedAuthUserId = createdAuth.user.id;

      const { data: createdParent, error: parentCreateError } = await adminClient
        .from("parents")
        .insert({
          full_name: fullName,
          email,
          password_hash: passwordHash,
          phone_number: phoneNumber || null,
          address: null,
          must_change_password: true,
          is_active: true,
          auth_user_id: createdAuth.user.id,
        })
        .select("id, full_name, email, phone_number, is_active, auth_user_id")
        .single();

      if (parentCreateError || !createdParent) {
        await adminClient.auth.admin.deleteUser(createdAuth.user.id);
        return json({
          success: false,
          error: "parent_profile_creation_failed",
          detail: parentCreateError?.message ?? null,
        }, 500);
      }

      parent = createdParent;
      newlyCreatedParent = true;
    }

    if (!parent) return json({ success: false, error: "parent_resolution_failed" }, 500);

    const { error: linkError } = await adminClient
      .from("parent_students")
      .upsert({
        parent_id: parent.id,
        student_id: studentId,
        relationship,
        is_primary: isPrimary,
      }, {
        onConflict: "parent_id,student_id",
      });

    if (linkError) {
      if (newlyCreatedParent) {
        await adminClient.from("parents").delete().eq("id", parent.id);
        if (newlyCreatedAuthUserId) {
          await adminClient.auth.admin.deleteUser(newlyCreatedAuthUserId);
        }
      }

      return json({
        success: false,
        error: "parent_link_failed",
        detail: linkError.message ?? null,
      }, 500);
    }

    const { error: studentParentFieldsError } = await adminClient
      .from("students")
      .update({
        parent_name: parent.full_name || null,
        parent_phone: parent.phone_number || null,
        parent_email: parent.email || null,
      })
      .eq("id", studentId);

    if (studentParentFieldsError) {
      return json({
        success: false,
        error: "student_parent_fields_update_failed",
        detail: studentParentFieldsError.message ?? null,
        relationship_created: true,
      }, 500);
    }

    return json({
      success: true,
      action,
      reused_existing_parent: !newlyCreatedParent,
      parent: {
        id: parent.id,
        full_name: parent.full_name,
        email: parent.email,
        phone_number: parent.phone_number,
        is_active: parent.is_active,
      },
      relationship: {
        student_id: studentId,
        relationship,
        is_primary: isPrimary,
      },
    });
  } catch (error) {
    return json({
      success: false,
      error: "unexpected_server_error",
      detail: error instanceof Error ? error.message : null,
    }, 500);
  }
});
